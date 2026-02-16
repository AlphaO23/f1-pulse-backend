const express = require('express');
const db = require('../db/connection');
const { categorize } = require('../services/eventCategorizer');

const router = express.Router();

// GET /api/events — list events with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const { category, source, limit = 50, offset = 0 } = req.query;

    let query = db('events').orderBy('timestamp', 'desc');

    if (category) query = query.where({ category });
    if (source) query = query.where({ source });

    const events = await query.limit(parseInt(limit, 10)).offset(parseInt(offset, 10));
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id — full event details including article link
router.get('/:id', async (req, res, next) => {
  try {
    const event = await db('events').where({ id: req.params.id }).first();
    if (!event) {
      return res.status(404).json({ error: { message: 'Event not found' } });
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:id/track-open — track when a user opens an alert
router.post('/:id/track-open', async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Find the most recent unread notification for this user + event
    const notification = await db('notifications')
      .where({ user_id: userId, event_id: eventId })
      .whereNull('opened_at')
      .orderBy('sent_at', 'desc')
      .first();

    if (notification) {
      await db('notifications')
        .where({ id: notification.id })
        .update({ opened_at: new Date() });
    }

    res.json({ tracked: true, eventId });
  } catch (err) {
    next(err);
  }
});

// POST /api/events — manually create an event
router.post('/', async (req, res, next) => {
  try {
    const { title, source, summary, raw_content, timestamp, link } = req.body;

    if (!title || !source) {
      return res.status(400).json({ error: { message: 'title and source are required' } });
    }

    const category = categorize(title, raw_content || summary || '');

    const [event] = await db('events')
      .insert({
        title,
        category,
        timestamp: timestamp || new Date(),
        source,
        link: link || null,
        summary: summary || null,
        raw_content: raw_content || null,
      })
      .returning('*');

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
