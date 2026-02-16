const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { getFeedStats } = require('../services/rssIngestion');

// ---------------------------------------------------------------------------
// Dashboard — /admin (redirects to metrics)
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => res.redirect('/admin/metrics'));

// ---------------------------------------------------------------------------
// Events — /admin/events
// ---------------------------------------------------------------------------
router.get('/events', async (_req, res) => {
  const events = await db('events')
    .orderBy('timestamp', 'desc')
    .limit(100);

  const categoryCounts = await db('events')
    .select('category')
    .count('* as count')
    .groupBy('category')
    .orderBy('count', 'desc');

  res.render('events', { events, categoryCounts });
});

// ---------------------------------------------------------------------------
// Sources — /admin/sources
// ---------------------------------------------------------------------------
router.get('/sources', async (_req, res) => {
  const feeds = getFeedStats();

  const sourceCounts = await db('events')
    .select('source')
    .count('* as count')
    .groupBy('source')
    .orderBy('count', 'desc');

  const sourceMap = {};
  for (const row of sourceCounts) {
    sourceMap[row.source] = parseInt(row.count, 10);
  }

  res.render('sources', { feeds, sourceMap });
});

// ---------------------------------------------------------------------------
// Users — /admin/users
// ---------------------------------------------------------------------------
router.get('/users', async (_req, res) => {
  const [{ count: totalUsers }] = await db('users').count('* as count');
  const [{ count: withFcm }] = await db('users').whereNotNull('fcm_token').where('fcm_token', '!=', '').count('* as count');
  const [{ count: onboarded }] = await db('users').where('onboarded', true).count('* as count');

  const sensitivityCounts = await db('users')
    .select('alert_sensitivity')
    .count('* as count')
    .groupBy('alert_sensitivity');

  const recentUsers = await db('users')
    .select('id', 'email', 'favorite_team', 'favorite_driver', 'alert_sensitivity', 'onboarded', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(50);

  res.render('users', {
    totalUsers: parseInt(totalUsers, 10),
    withFcm: parseInt(withFcm, 10),
    onboarded: parseInt(onboarded, 10),
    sensitivityCounts,
    recentUsers,
  });
});

// ---------------------------------------------------------------------------
// Metrics — /admin/metrics
// ---------------------------------------------------------------------------
router.get('/metrics', async (_req, res) => {
  const now = new Date();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);

  const [{ count: events24h }] = await db('events')
    .where('timestamp', '>=', yesterday)
    .count('* as count');

  const [{ count: notifications24h }] = await db('notifications')
    .where('sent_at', '>=', yesterday)
    .count('* as count');

  const [{ count: totalNotifications }] = await db('notifications').count('* as count');
  const [{ count: openedNotifications }] = await db('notifications').whereNotNull('opened_at').count('* as count');

  const openRate = totalNotifications > 0
    ? ((openedNotifications / totalNotifications) * 100).toFixed(1)
    : '0.0';

  const [{ count: totalUsers }] = await db('users').count('* as count');
  const [{ count: activeUsers }] = await db('users').where('onboarded', true).count('* as count');

  const [{ count: totalEvents }] = await db('events').count('* as count');

  const feeds = getFeedStats();
  const healthyFeeds = feeds.filter((f) => f.enabled && f.stats.lastSuccess).length;
  const totalFeeds = feeds.filter((f) => f.enabled).length;

  // Events per hour (last 24h)
  const eventsPerHour = await db('events')
    .select(db.raw("date_trunc('hour', timestamp) as hour"))
    .count('* as count')
    .where('timestamp', '>=', yesterday)
    .groupByRaw("date_trunc('hour', timestamp)")
    .orderBy('hour', 'asc');

  // Top categories last 24h
  const topCategories = await db('events')
    .select('category')
    .count('* as count')
    .where('timestamp', '>=', yesterday)
    .groupBy('category')
    .orderBy('count', 'desc')
    .limit(10);

  res.render('metrics', {
    events24h: parseInt(events24h, 10),
    notifications24h: parseInt(notifications24h, 10),
    openRate,
    totalUsers: parseInt(totalUsers, 10),
    activeUsers: parseInt(activeUsers, 10),
    totalEvents: parseInt(totalEvents, 10),
    healthyFeeds,
    totalFeeds,
    eventsPerHour,
    topCategories,
  });
});

module.exports = router;
