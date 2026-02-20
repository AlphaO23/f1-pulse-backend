const Parser = require('rss-parser');
const cron = require('node-cron');
const db = require('../db/connection');
const { categorize } = require('./eventCategorizer');
const { broadcastEvent } = require('./pushNotification');
const config = require('../config');
const logger = require('../lib/logger');
const { rssFetchErrors, lastIngestionTimestamp } = require('../lib/metrics');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'F1Pulse/1.0',
  },
});

// ---------------------------------------------------------------------------
// Configurable feed list — add, remove, or disable feeds here
// ---------------------------------------------------------------------------
const RSS_FEEDS = [
  // Official sources
  { name: 'Formula 1', url: 'https://www.formula1.com/content/fom-website/en/latest/all.xml', enabled: true },
  { name: 'FIA', url: 'https://www.fia.com/rss/news', enabled: true },

  // Major motorsport outlets
  { name: 'Autosport', url: 'https://www.autosport.com/rss/feed/f1', enabled: true },
  { name: 'Motorsport.com', url: 'https://www.motorsport.com/rss/f1/news/', enabled: true },
  { name: 'RaceFans', url: 'https://www.racefans.net/feed/', enabled: true },
  { name: 'PlanetF1', url: 'https://www.planetf1.com/feed/', enabled: true },
  { name: 'The Race', url: 'https://the-race.com/feed/', enabled: true },
  { name: 'GPFans', url: 'https://www.gpfans.com/en/rss.xml', enabled: true },
];

let cronJob = null;

// ---------------------------------------------------------------------------
// Per-feed stats — tracked in memory for admin dashboard
// ---------------------------------------------------------------------------
const feedStats = {};

function initFeedStats() {
  for (const feed of RSS_FEEDS) {
    feedStats[feed.name] = {
      lastFetchTime: null,
      lastSuccess: null,
      lastError: null,
      errorCount: 0,
      itemsTotal: 0,
      itemsNew: 0,
    };
  }
}

initFeedStats();

function getFeedStats() {
  return RSS_FEEDS.map((feed) => ({
    ...feed,
    stats: feedStats[feed.name] || {},
  }));
}

// ---------------------------------------------------------------------------
// Fetch a single feed with typed error handling
// ---------------------------------------------------------------------------
async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return result.items.map((item) => ({
      title: item.title || 'Untitled',
      link: item.link || item.guid,
      guid: item.guid || item.link,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      content: item.contentSnippet || item.content || '',
      source: feed.name,
    }));
  } catch (err) {
    const stats = feedStats[feed.name];
    if (stats) {
      stats.errorCount++;
      stats.lastError = err.message;
      stats.lastFetchTime = new Date().toISOString();
    }

    rssFetchErrors.inc({ feed: feed.name });

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      logger.error('Timeout fetching RSS feed', { feed: feed.name, url: feed.url, errorType: 'timeout' });
    } else if (err.message.includes('Non-whitespace before first tag') || err.message.includes('Invalid XML')) {
      logger.error('Malformed XML from RSS feed', { feed: feed.name, url: feed.url, errorType: 'malformed_xml' });
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      logger.error('Network error fetching RSS feed', { feed: feed.name, url: feed.url, errorType: 'network', errorCode: err.code });
    } else {
      logger.error('Failed to fetch RSS feed', { feed: feed.name, url: feed.url, errorType: 'unknown', error: err.message });
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main ingestion cycle — processes all enabled feeds
// ---------------------------------------------------------------------------
async function ingestFeeds() {
  const activeFeeds = RSS_FEEDS.filter((f) => f.enabled);
  logger.info(`Ingestion cycle started — ${activeFeeds.length} feeds to process`);

  let totalNew = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const feed of activeFeeds) {
    const items = await fetchFeed(feed);

    if (items.length === 0) {
      totalFailed++;
      continue;
    }

    let feedNew = 0;
    let feedSkipped = 0;

    for (const item of items) {
      try {
        // Deduplicate by checking if an event with the same source + title already exists
        const existing = await db('events')
          .where({ source: item.source, title: item.title })
          .first();

        if (existing) {
          feedSkipped++;
          continue;
        }

        const category = categorize(item.title, item.content);

        const [event] = await db('events')
          .insert({
            title: item.title,
            category,
            timestamp: item.pubDate,
            source: item.source,
            link: item.link || null,
            summary: item.content.substring(0, 500),
            raw_content: item.content,
          })
          .returning('*');

        feedNew++;
        logger.info('New event ingested', { category, title: item.title, source: item.source });

        // Broadcast push notification for this new event
        try {
          await broadcastEvent(event);
        } catch (err) {
          logger.error('Failed to broadcast event', { title: item.title, error: err.message });
        }
      } catch (err) {
        logger.warn('Failed to process RSS item — skipping', { title: item.title, source: item.source, error: err.message });
      }
    }

    totalNew += feedNew;
    totalSkipped += feedSkipped;

    // Update per-feed stats
    const stats = feedStats[feed.name];
    if (stats) {
      stats.lastFetchTime = new Date().toISOString();
      stats.lastSuccess = new Date().toISOString();
      stats.itemsTotal += items.length;
      stats.itemsNew += feedNew;
    }

    if (feedNew > 0) {
      logger.info('Feed processed', { feed: feed.name, new: feedNew, skipped: feedSkipped });
    }
  }

  lastIngestionTimestamp.set(Date.now());
  logger.info('Ingestion cycle complete', { new: totalNew, skipped: totalSkipped, failedFeeds: totalFailed });
}

// ---------------------------------------------------------------------------
// Scheduling — uses node-cron instead of setInterval
// ---------------------------------------------------------------------------
function startPolling() {
  const activeFeeds = RSS_FEEDS.filter((f) => f.enabled);
  if (activeFeeds.length === 0) {
    logger.warn('No RSS feeds configured — polling disabled');
    return;
  }

  const schedule = config.rss.cronSchedule;

  // Run immediately on start
  ingestFeeds().catch((err) => logger.warn('Initial ingestion failed — will retry on next cycle', { error: err.message }));

  cronJob = cron.schedule(schedule, () => {
    ingestFeeds().catch((err) => logger.warn('Ingestion cycle failed — will retry on next cycle', { error: err.message }));
  });

  logger.info('RSS polling started', { cron: schedule, feeds: activeFeeds.length });
}

function stopPolling() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('RSS polling stopped');
  }
}

module.exports = { startPolling, stopPolling, ingestFeeds, RSS_FEEDS, getFeedStats };
