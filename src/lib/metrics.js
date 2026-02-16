const client = require('prom-client');

const register = new client.Registry();

// Collect default Node.js metrics (memory, CPU, event loop lag)
client.collectDefaultMetrics({ register });

// RSS fetch errors — labeled by feed name
const rssFetchErrors = new client.Counter({
  name: 'f1pulse_rss_fetch_errors_total',
  help: 'Total RSS feed fetch errors',
  labelNames: ['feed'],
  registers: [register],
});

// Notification delivery — labeled by status (sent/failed)
const notificationsTotal = new client.Counter({
  name: 'f1pulse_notifications_total',
  help: 'Total notifications sent',
  labelNames: ['status'],
  registers: [register],
});

// Last ingestion timestamp — set at end of each ingestFeeds() cycle
const lastIngestionTimestamp = new client.Gauge({
  name: 'f1pulse_last_ingestion_timestamp',
  help: 'Unix timestamp of last completed ingestion cycle',
  registers: [register],
});

// Database health — 1 = ok, 0 = down
const dbHealthy = new client.Gauge({
  name: 'f1pulse_db_healthy',
  help: 'Database health status (1=ok, 0=down)',
  registers: [register],
});

module.exports = {
  register,
  rssFetchErrors,
  notificationsTotal,
  lastIngestionTimestamp,
  dbHealthy,
};
