const admin = require('firebase-admin');
const fs = require('fs');
const config = require('../config');
const db = require('../db/connection');
const logger = require('../lib/logger');
const { notificationsTotal } = require('../lib/metrics');

let firebaseInitialized = false;

// Categories that qualify for "breaking" sensitivity
const BREAKING_CATEGORIES = ['Race Result', 'Penalty', 'Driver Transfer'];

// Rate-limit: max notifications per user per hour (non-race times)
const RATE_LIMIT_PER_HOUR = 10;

// ---------------------------------------------------------------------------
// Firebase setup
// ---------------------------------------------------------------------------

function initFirebase() {
  if (firebaseInitialized) return;

  const credPath = config.firebase.credentialPath;
  if (!fs.existsSync(credPath)) {
    logger.warn('Firebase credential file not found — push notifications disabled', { path: credPath });
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(require('path').resolve(credPath))),
  });
  firebaseInitialized = true;
  logger.info('Firebase Admin SDK initialized');
}

// ---------------------------------------------------------------------------
// Race weekend check (Friday 00:00 UTC – Sunday 23:59 UTC)
// ---------------------------------------------------------------------------

function isRaceWeekend() {
  const day = new Date().getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 0 || day === 5 || day === 6;
}

// ---------------------------------------------------------------------------
// Rate limiting — count notifications sent to a user in the last hour
// Uses composite index (user_id, sent_at) from migration 003
// ---------------------------------------------------------------------------

async function getHourlyCount(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count }] = await db('notifications')
    .where('user_id', userId)
    .where('sent_at', '>=', oneHourAgo)
    .count('id as count');
  return parseInt(count, 10);
}

async function isRateLimited(userId) {
  if (isRaceWeekend()) return false;
  const count = await getHourlyCount(userId);
  return count >= RATE_LIMIT_PER_HOUR;
}

// ---------------------------------------------------------------------------
// Build notification payload
// ---------------------------------------------------------------------------

function buildPayload(token, event) {
  // Title: category + headline
  const title = `${event.category}: ${event.title}`;

  // Body: 2-line summary — first sentence + source attribution
  const summaryText = event.summary || event.title;
  const firstSentence = summaryText.split(/[.!?]\s/)[0];
  const body = `${firstSentence}.\nvia ${event.source}`;

  return {
    token,
    notification: { title, body },
    data: {
      eventId: String(event.id),
      category: event.category,
      timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
    },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  };
}

// ---------------------------------------------------------------------------
// Send to a single user — handles invalid tokens and delivery tracking
// ---------------------------------------------------------------------------

async function sendToUser(userId, event) {
  if (!firebaseInitialized) return null;

  const user = await db('users').where({ id: userId }).select('fcm_token').first();
  if (!user || !user.fcm_token) return null;

  // Rate-limit check
  if (await isRateLimited(userId)) {
    logger.info('Push notification rate limited', { userId, cap: RATE_LIMIT_PER_HOUR });
    return null;
  }

  const message = buildPayload(user.fcm_token, event);

  try {
    const response = await admin.messaging().send(message);

    // Track successful delivery
    await db('notifications').insert({
      user_id: userId,
      event_id: event.id,
      delivery_status: 'sent',
    });

    notificationsTotal.inc({ status: 'sent' });

    return response;
  } catch (err) {
    // Handle invalid/expired FCM tokens — clear them so we stop retrying
    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      logger.warn('Invalid FCM token — clearing', { userId, errorCode: err.code });
      await db('users').where({ id: userId }).update({ fcm_token: null });

      await db('notifications').insert({
        user_id: userId,
        event_id: event.id,
        delivery_status: 'failed',
        failure_reason: 'invalid_token',
      });

      notificationsTotal.inc({ status: 'failed' });

      return null;
    }

    // Network or transient error — log but don't retry immediately
    logger.error('Failed to send push notification', { userId, error: err.message });

    await db('notifications').insert({
      user_id: userId,
      event_id: event.id,
      delivery_status: 'failed',
      failure_reason: err.message.substring(0, 500),
    });

    notificationsTotal.inc({ status: 'failed' });

    return null;
  }
}

// ---------------------------------------------------------------------------
// Broadcast — find matching users and send notifications
// ---------------------------------------------------------------------------

/**
 * Find users who should be notified about an event and send push notifications.
 *
 * Matching logic (binary — no scoring):
 *   1. Sensitivity filter (DB-level):
 *      - "all"      → user receives every categorized event
 *      - "breaking"  → user only receives Race Result, Penalty, Driver Transfer
 *   2. All matched users get the notification
 *   3. Rate limited to 10/hr per user outside race weekends (Fri-Sun unlimited)
 */
async function broadcastEvent(event) {
  if (!firebaseInitialized) return [];

  const isBreaking = BREAKING_CATEGORIES.includes(event.category);

  // Build query — filter at DB level using indexed alert_sensitivity column
  const query = db('users')
    .whereNotNull('fcm_token')
    .where(function () {
      this.where('alert_sensitivity', 'all');
      if (isBreaking) {
        this.orWhere('alert_sensitivity', 'breaking');
      }
    })
    .select('id');

  const users = await query;

  const results = [];
  for (const user of users) {
    try {
      const result = await sendToUser(user.id, event);
      if (result) {
        results.push({ userId: user.id, success: true });
      }
    } catch (err) {
      results.push({ userId: user.id, success: false, error: err.message });
    }
  }

  if (results.length > 0) {
    const sent = results.filter((r) => r.success).length;
    logger.info('Broadcast complete', { title: event.title, sent, total: results.length });
  }

  return results;
}

module.exports = { initFirebase, sendToUser, broadcastEvent, isRaceWeekend, BREAKING_CATEGORIES, RATE_LIMIT_PER_HOUR };
