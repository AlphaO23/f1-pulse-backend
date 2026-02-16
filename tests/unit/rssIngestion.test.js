// Mock all external dependencies
jest.mock('rss-parser', () => {
  const mockParseURL = jest.fn();
  return jest.fn().mockImplementation(() => ({
    parseURL: mockParseURL,
  }));
});

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

// Build a chainable mock db
const mockDbChain = {
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

jest.mock('../../src/db/connection', () => {
  return jest.fn(() => mockDbChain);
});

jest.mock('../../src/services/eventCategorizer', () => ({
  categorize: jest.fn(() => 'Uncategorized'),
}));

jest.mock('../../src/services/pushNotification', () => ({
  broadcastEvent: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/config', () => ({
  rss: { cronSchedule: '*/1 * * * *' },
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
}));

const Parser = require('rss-parser');
const logger = require('../../src/lib/logger');
const { rssFetchErrors } = require('../../src/lib/metrics');

describe('rssIngestion — fetchFeed edge cases', () => {
  let rssModule;
  let mockParseURL;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset chain mocks
    mockDbChain.where.mockReturnThis();
    mockDbChain.first.mockReset();
    mockDbChain.insert.mockReturnThis();
    mockDbChain.returning.mockReset();

    // Get the mock parseURL from the Parser instance
    const parserInstance = new Parser();
    mockParseURL = parserInstance.parseURL;

    rssModule = require('../../src/services/rssIngestion');
  });

  describe('RSS parsing edge cases', () => {
    test('missing title defaults to "Untitled"', async () => {
      mockParseURL.mockResolvedValue({
        items: [{ link: 'https://example.com/1', pubDate: '2025-01-01', contentSnippet: 'content' }],
      });

      mockDbChain.first.mockResolvedValue(null); // no existing event
      mockDbChain.returning.mockResolvedValue([{ id: '1', title: 'Untitled', category: 'Uncategorized', source: 'Formula 1' }]);

      await rssModule.ingestFeeds();

      expect(mockDbChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Untitled' })
      );
    });

    test('missing link falls back to guid', async () => {
      mockParseURL.mockResolvedValue({
        items: [{ title: 'Test', guid: 'guid-123', pubDate: '2025-01-01', contentSnippet: 'content' }],
      });

      mockDbChain.first.mockResolvedValue(null);
      mockDbChain.returning.mockResolvedValue([{ id: '1', title: 'Test', category: 'Uncategorized', source: 'Formula 1' }]);

      await rssModule.ingestFeeds();

      expect(mockDbChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ link: 'guid-123' })
      );
    });

    test('missing pubDate defaults to current Date', async () => {
      const now = new Date('2025-06-15T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      mockParseURL.mockResolvedValue({
        items: [{ title: 'Test', link: 'https://example.com/1' }],
      });

      mockDbChain.first.mockResolvedValue(null);
      mockDbChain.returning.mockResolvedValue([{ id: '1', title: 'Test', category: 'Uncategorized', source: 'Formula 1' }]);

      await rssModule.ingestFeeds();

      expect(mockDbChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: now })
      );

      jest.useRealTimers();
    });

    test('missing content defaults to empty string', async () => {
      mockParseURL.mockResolvedValue({
        items: [{ title: 'Test', link: 'https://example.com/1', pubDate: '2025-01-01' }],
      });

      mockDbChain.first.mockResolvedValue(null);
      mockDbChain.returning.mockResolvedValue([{ id: '1', title: 'Test', category: 'Uncategorized', source: 'Formula 1' }]);

      await rssModule.ingestFeeds();

      expect(mockDbChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ summary: '', raw_content: '' })
      );
    });
  });

  describe('error handling', () => {
    test('timeout error is logged and returns empty array', async () => {
      const err = new Error('timeout of 10000ms exceeded');
      err.code = 'ECONNABORTED';
      mockParseURL.mockRejectedValue(err);

      await rssModule.ingestFeeds();

      expect(logger.error).toHaveBeenCalledWith(
        'Timeout fetching RSS feed',
        expect.objectContaining({ errorType: 'timeout' })
      );
      expect(rssFetchErrors.inc).toHaveBeenCalled();
    });

    test('malformed XML error is logged', async () => {
      mockParseURL.mockRejectedValue(new Error('Non-whitespace before first tag'));

      await rssModule.ingestFeeds();

      expect(logger.error).toHaveBeenCalledWith(
        'Malformed XML from RSS feed',
        expect.objectContaining({ errorType: 'malformed_xml' })
      );
      expect(rssFetchErrors.inc).toHaveBeenCalled();
    });

    test('network error ENOTFOUND is logged', async () => {
      const err = new Error('getaddrinfo ENOTFOUND');
      err.code = 'ENOTFOUND';
      mockParseURL.mockRejectedValue(err);

      await rssModule.ingestFeeds();

      expect(logger.error).toHaveBeenCalledWith(
        'Network error fetching RSS feed',
        expect.objectContaining({ errorType: 'network', errorCode: 'ENOTFOUND' })
      );
    });

    test('network error ECONNREFUSED is logged', async () => {
      const err = new Error('connect ECONNREFUSED');
      err.code = 'ECONNREFUSED';
      mockParseURL.mockRejectedValue(err);

      await rssModule.ingestFeeds();

      expect(logger.error).toHaveBeenCalledWith(
        'Network error fetching RSS feed',
        expect.objectContaining({ errorType: 'network', errorCode: 'ECONNREFUSED' })
      );
    });

    test('feed stats updated correctly on error', async () => {
      const err = new Error('some error');
      err.code = 'ENOTFOUND';
      mockParseURL.mockRejectedValue(err);

      const statsBefore = rssModule.getFeedStats();
      const formula1Stats = statsBefore.find((f) => f.name === 'Formula 1');
      const initialErrorCount = formula1Stats.stats.errorCount;

      await rssModule.ingestFeeds();

      const statsAfter = rssModule.getFeedStats();
      const formula1StatsAfter = statsAfter.find((f) => f.name === 'Formula 1');
      expect(formula1StatsAfter.stats.errorCount).toBeGreaterThan(initialErrorCount);
    });
  });
});
