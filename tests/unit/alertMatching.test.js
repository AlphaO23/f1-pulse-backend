const mockCredPath = require('path').resolve(__dirname, '../fixtures/fake-firebase-cred.json');

jest.mock('firebase-admin', () => {
  const mockSend = jest.fn();
  return {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn(() => 'cert') },
    messaging: () => ({ send: mockSend }),
    __mockSend: mockSend,
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock('../../src/config', () => ({
  firebase: { credentialPath: mockCredPath },
}));

// Thenable chain mock — supports `await chain`
// Prefix with "mock" so Jest allows it in mock factories
function mockMakeThenableChain(resolveValue) {
  const chain = {
    where: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    count: jest.fn(),
    first: jest.fn(),
    insert: jest.fn().mockResolvedValue(),
    update: jest.fn().mockResolvedValue(),
    orWhere: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve(resolveValue)),
  };

  chain.where.mockImplementation(function (argOrFn) {
    if (typeof argOrFn === 'function') {
      argOrFn.call(chain);
    }
    return chain;
  });

  return chain;
}

let mockChains = {};

jest.mock('../../src/db/connection', () => {
  return jest.fn((table) => {
    if (!mockChains[table]) {
      mockChains[table] = mockMakeThenableChain([]);
    }
    return mockChains[table];
  });
});

jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/lib/metrics', () => ({
  notificationsTotal: { inc: jest.fn() },
}));

describe('pushNotification', () => {
  let pushModule;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockChains = {};

    jest.mock('firebase-admin', () => {
      const mockSend = jest.fn();
      return {
        initializeApp: jest.fn(),
        credential: { cert: jest.fn(() => 'cert') },
        messaging: () => ({ send: mockSend }),
        __mockSend: mockSend,
      };
    });

    jest.mock('fs', () => ({
      existsSync: jest.fn(() => true),
    }));

    jest.mock('../../src/config', () => ({
      firebase: { credentialPath: mockCredPath },
    }));

    jest.mock('../../src/lib/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    jest.mock('../../src/lib/metrics', () => ({
      notificationsTotal: { inc: jest.fn() },
    }));

    pushModule = require('../../src/services/pushNotification');
  });

  // -------------------------------------------------------------------
  // isRaceWeekend
  // -------------------------------------------------------------------
  describe('isRaceWeekend', () => {
    test('returns true on Friday (day 5)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T12:00:00Z'));
      expect(pushModule.isRaceWeekend()).toBe(true);
      jest.useRealTimers();
    });

    test('returns true on Saturday (day 6)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-11T12:00:00Z'));
      expect(pushModule.isRaceWeekend()).toBe(true);
      jest.useRealTimers();
    });

    test('returns true on Sunday (day 0)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-12T12:00:00Z'));
      expect(pushModule.isRaceWeekend()).toBe(true);
      jest.useRealTimers();
    });

    test('returns false on Wednesday (day 3)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-08T12:00:00Z'));
      expect(pushModule.isRaceWeekend()).toBe(false);
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------
  // Exported constants
  // -------------------------------------------------------------------
  describe('exported constants', () => {
    test('BREAKING_CATEGORIES contains expected categories', () => {
      expect(pushModule.BREAKING_CATEGORIES).toEqual(['Race Result', 'Penalty', 'Contracts']);
    });

    test('RATE_LIMIT_PER_HOUR is 10', () => {
      expect(pushModule.RATE_LIMIT_PER_HOUR).toBe(10);
    });
  });

  // -------------------------------------------------------------------
  // broadcastEvent matching logic
  // -------------------------------------------------------------------
  describe('broadcastEvent', () => {
    test('breaking category queries both "all" and "breaking" users', async () => {
      pushModule.initFirebase();

      // Setup: broadcastEvent queries db('users') and awaits the chain
      const usersChain = mockMakeThenableChain([]); // resolves to empty array (no users)
      mockChains['users'] = usersChain;

      const event = { category: 'Race Result', title: 'Test', id: '1', source: 'Test' };
      await pushModule.broadcastEvent(event);

      expect(usersChain.whereNotNull).toHaveBeenCalledWith('fcm_token');
      expect(usersChain.where).toHaveBeenCalled();
      expect(usersChain.orWhere).toHaveBeenCalledWith('alert_sensitivity', 'breaking');
    });

    test('non-breaking category queries only "all" users', async () => {
      pushModule.initFirebase();

      const usersChain = mockMakeThenableChain([]);
      mockChains['users'] = usersChain;

      const event = { category: 'Technical Update', title: 'Test', id: '2', source: 'Test' };
      await pushModule.broadcastEvent(event);

      expect(usersChain.whereNotNull).toHaveBeenCalledWith('fcm_token');
      expect(usersChain.orWhere).not.toHaveBeenCalledWith('alert_sensitivity', 'breaking');
    });

    test('returns empty array when firebase not initialized', async () => {
      const result = await pushModule.broadcastEvent({ category: 'Race Result', title: 'Test' });
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------
  // sendToUser — invalid/expired FCM token handling
  // -------------------------------------------------------------------
  describe('sendToUser — token handling', () => {
    test('clears invalid FCM token from DB on messaging error', async () => {
      pushModule.initFirebase();

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-08T12:00:00Z')); // Wednesday

      const firebaseAdmin = require('firebase-admin');

      // Mock db('users') chain — returns user with token
      const usersChain = mockMakeThenableChain([]);
      usersChain.first.mockResolvedValue({ fcm_token: 'invalid-token' });
      mockChains['users'] = usersChain;

      // Mock db('notifications') chain — rate limit check returns 0
      const notifChain = mockMakeThenableChain([]);
      notifChain.count.mockReturnValue(Promise.resolve([{ count: '0' }]));
      mockChains['notifications'] = notifChain;

      // Firebase send throws invalid token error
      const err = new Error('Invalid token');
      err.code = 'messaging/invalid-registration-token';
      firebaseAdmin.__mockSend.mockRejectedValue(err);

      const event = { id: 'evt1', category: 'Race Result', title: 'Test', source: 'F1' };
      await pushModule.sendToUser('user1', event);

      expect(usersChain.update).toHaveBeenCalledWith({ fcm_token: null });

      expect(notifChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_status: 'failed',
          failure_reason: 'invalid_token',
        })
      );

      jest.useRealTimers();
    });

    test('returns null when firebase not initialized', async () => {
      const result = await pushModule.sendToUser('user1', { id: '1', category: 'Race Result', title: 'Test' });
      expect(result).toBeNull();
    });
  });
});
