/**
 * Integration test: RSS ingest → categorize → match users → send notification
 *
 * Uses an in-memory store to simulate the database (PG migrations aren't
 * compatible with SQLite due to uuid_generate_v4, CREATE EXTENSION, etc.)
 */
const mockCredPath = require('path').resolve(__dirname, '../fixtures/fake-firebase-cred.json');

// ---------------------------------------------------------------------------
// In-memory database mock
// ---------------------------------------------------------------------------
const store = {
  events: [],
  users: [],
  notifications: [],
};

let eventIdCounter = 1;

function resetStore() {
  store.events = [];
  store.users = [];
  store.notifications = [];
  eventIdCounter = 1;
}

function createKnexChain(table) {
  let _wheres = [];
  let _whereNotNull = null;
  let _selects = null;

  const chain = {
    where(arg1, arg2, arg3) {
      if (typeof arg1 === 'function') {
        // Sub-query grouping — execute with `this` context
        arg1.call(chain);
      } else if (arg3 !== undefined) {
        _wheres.push({ field: arg1, op: arg2, value: arg3 });
      } else {
        // arg1 is either an object or a field name
        if (typeof arg1 === 'object') {
          for (const [k, v] of Object.entries(arg1)) {
            _wheres.push({ field: k, op: '=', value: v });
          }
        } else {
          _wheres.push({ field: arg1, op: '=', value: arg2 });
        }
      }
      return chain;
    },
    orWhere(field, value) {
      _wheres.push({ field, op: '=', value, or: true });
      return chain;
    },
    whereNotNull(field) {
      _whereNotNull = field;
      return chain;
    },
    select(...fields) {
      _selects = fields;
      return chain;
    },
    count(expr) {
      // Count matching rows
      const rows = filterRows(table);
      return Promise.resolve([{ count: String(rows.length) }]);
    },
    first() {
      const rows = filterRows(table);
      return Promise.resolve(rows[0] || null);
    },
    insert(data) {
      const row = { ...data };
      if (table === 'events') {
        row.id = String(eventIdCounter++);
        row.created_at = new Date();
        row.updated_at = new Date();
      } else if (table === 'notifications') {
        row.id = `notif-${store.notifications.length + 1}`;
        row.sent_at = new Date();
      }
      store[table].push(row);

      return {
        returning() {
          return Promise.resolve([row]);
        },
        then(resolve) {
          return resolve();
        },
      };
    },
    update(data) {
      const rows = filterRows(table);
      for (const row of rows) {
        Object.assign(row, data);
      }
      return Promise.resolve(rows.length);
    },
    then(resolve) {
      // Terminal — return filtered rows
      const rows = filterRows(table);
      return resolve(rows);
    },
  };

  function filterRows(tbl) {
    let rows = [...store[tbl]];

    if (_whereNotNull) {
      rows = rows.filter((r) => r[_whereNotNull] != null);
    }

    // Apply AND/OR where clauses
    const andClauses = _wheres.filter((w) => !w.or);
    const orClauses = _wheres.filter((w) => w.or);

    if (andClauses.length > 0 || orClauses.length > 0) {
      rows = rows.filter((row) => {
        const andMatch = andClauses.every((w) => {
          if (w.op === '=') return row[w.field] === w.value;
          if (w.op === '>=') return row[w.field] >= w.value;
          return true;
        });

        if (orClauses.length === 0) return andMatch;

        const orMatch = orClauses.some((w) => {
          if (w.op === '=') return row[w.field] === w.value;
          return true;
        });

        return andMatch || orMatch;
      });
    }

    return rows;
  }

  return chain;
}

const mockDb = jest.fn((table) => createKnexChain(table));

// ---------------------------------------------------------------------------
// Mock rss-parser
// ---------------------------------------------------------------------------
const mockParseURL = jest.fn();
jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: mockParseURL,
  }));
});

// ---------------------------------------------------------------------------
// Mock firebase-admin
// ---------------------------------------------------------------------------
const sentMessages = [];
jest.mock('firebase-admin', () => {
  const send = jest.fn().mockImplementation((msg) => {
    sentMessages.push(msg);
    return Promise.resolve('msg-id-' + sentMessages.length);
  });
  return {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn(() => 'cert') },
    messaging: () => ({ send }),
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

// ---------------------------------------------------------------------------
// Mock internal modules
// ---------------------------------------------------------------------------
jest.mock('../../src/db/connection', () => mockDb);

jest.mock('../../src/config', () => ({
  firebase: { credentialPath: mockCredPath },
  rss: { cronSchedule: '*/1 * * * *' },
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/lib/metrics', () => ({
  rssFetchErrors: { inc: jest.fn() },
  lastIngestionTimestamp: { set: jest.fn() },
  notificationsTotal: { inc: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Integration: RSS ingest → categorize → match → notify', () => {
  let rssModule;
  let pushModule;

  beforeEach(() => {
    resetStore();
    sentMessages.length = 0;
    mockParseURL.mockReset();
    jest.clearAllMocks();

    // Set to a weekday so rate limiting applies normally
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-08T12:00:00Z')); // Wednesday

    // Seed test users
    store.users.push(
      { id: 'user-all', email: 'all@test.com', alert_sensitivity: 'all', fcm_token: 'token-all' },
      { id: 'user-breaking', email: 'breaking@test.com', alert_sensitivity: 'breaking', fcm_token: 'token-breaking' },
      { id: 'user-no-token', email: 'notoken@test.com', alert_sensitivity: 'all', fcm_token: null }
    );

    // Load modules fresh
    jest.isolateModules(() => {
      pushModule = require('../../src/services/pushNotification');
      rssModule = require('../../src/services/rssIngestion');
    });

    // Initialize firebase (mock)
    pushModule.initFirebase();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('breaking event → notification sent to both "all" and "breaking" users', async () => {
    mockParseURL
      .mockResolvedValueOnce({
        items: [
          {
            title: 'Verstappen wins the Monaco Grand Prix results',
            link: 'https://example.com/race',
            pubDate: '2025-01-08T10:00:00Z',
            contentSnippet: 'Max Verstappen won the race with a dominant victory on the podium.',
          },
        ],
      })
      .mockResolvedValue({ items: [] });

    await rssModule.ingestFeeds();

    // Event should be inserted
    expect(store.events.length).toBe(1);
    expect(store.events[0].category).toBe('Race Result');

    // Notifications should be sent to user-all and user-breaking (both have tokens, both match)
    const notifiedUserIds = store.notifications
      .filter((n) => n.delivery_status === 'sent')
      .map((n) => n.user_id);

    expect(notifiedUserIds).toContain('user-all');
    expect(notifiedUserIds).toContain('user-breaking');
  });

  test('non-breaking event → notification sent only to "all" user', async () => {
    mockParseURL
      .mockResolvedValueOnce({
        items: [
          {
            title: 'McLaren reveals major aerodynamic upgrade for next race',
            link: 'https://example.com/tech',
            pubDate: '2025-01-08T10:00:00Z',
            contentSnippet: 'New sidepod development and wing design.',
          },
        ],
      })
      .mockResolvedValue({ items: [] });

    await rssModule.ingestFeeds();

    expect(store.events.length).toBe(1);
    expect(store.events[0].category).toBe('Technical Update');

    // Only "all" user should get notified
    const notifiedUserIds = store.notifications
      .filter((n) => n.delivery_status === 'sent')
      .map((n) => n.user_id);

    expect(notifiedUserIds).toContain('user-all');
    expect(notifiedUserIds).not.toContain('user-breaking');
  });

  test('user without FCM token → no notification attempt', async () => {
    mockParseURL
      .mockResolvedValueOnce({
        items: [
          {
            title: 'Verstappen wins the Grand Prix results podium',
            link: 'https://example.com/race2',
            pubDate: '2025-01-08T11:00:00Z',
            contentSnippet: 'Race result victory.',
          },
        ],
      })
      .mockResolvedValue({ items: [] });

    await rssModule.ingestFeeds();

    // user-no-token should NOT have any notification
    const notifForNoToken = store.notifications.filter((n) => n.user_id === 'user-no-token');
    expect(notifForNoToken.length).toBe(0);

    // Firebase send should NOT have been called with a null token
    const firebase = require('firebase-admin');
    const sendCalls = firebase.messaging().send.mock.calls;
    for (const call of sendCalls) {
      expect(call[0].token).not.toBeNull();
      expect(call[0].token).not.toBeUndefined();
    }
  });

  test('duplicate ingestion → no duplicate events', async () => {
    const feedData = {
      items: [
        {
          title: 'Hamilton given time penalty at Silverstone',
          link: 'https://example.com/penalty',
          pubDate: '2025-01-08T10:00:00Z',
          contentSnippet: 'Stewards decision on penalty.',
        },
      ],
    };

    mockParseURL.mockResolvedValueOnce(feedData).mockResolvedValue({ items: [] });
    await rssModule.ingestFeeds();

    const countAfterFirst = store.events.filter((e) => e.title === 'Hamilton given time penalty at Silverstone').length;
    expect(countAfterFirst).toBe(1);

    // Second ingestion with same data (same source + title → dedup)
    mockParseURL.mockResolvedValueOnce(feedData).mockResolvedValue({ items: [] });
    await rssModule.ingestFeeds();

    // Should not have added duplicate events (same source + title)
    const matchingEvents = store.events.filter((e) => e.title === 'Hamilton given time penalty at Silverstone');
    expect(matchingEvents.length).toBe(1);
  });

  test('mixed feed: breaking + non-breaking items processed correctly', async () => {
    mockParseURL
      .mockResolvedValueOnce({
        items: [
          {
            title: 'Verstappen wins the Monaco Grand Prix race result',
            link: 'https://example.com/race-mixed',
            pubDate: '2025-01-08T10:00:00Z',
            contentSnippet: 'Victory and podium celebration.',
          },
          {
            title: 'New technical directive on aerodynamic upgrade regulations',
            link: 'https://example.com/tech-mixed',
            pubDate: '2025-01-08T10:05:00Z',
            contentSnippet: 'FIA technical development update on wing and floor.',
          },
        ],
      })
      .mockResolvedValue({ items: [] });

    await rssModule.ingestFeeds();

    // Both events should be inserted
    expect(store.events.length).toBe(2);

    const categories = store.events.map((e) => e.category);
    expect(categories).toContain('Race Result');
    expect(categories).toContain('Technical Update');
  });
});
