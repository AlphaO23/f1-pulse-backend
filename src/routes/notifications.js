const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// GET /api/users/:userId/notifications — user notification history
router.get('/users/:userId/notifications', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await db('notifications')
      .join('events', 'notifications.event_id', 'events.id')
      .where({ 'notifications.user_id': req.params.userId })
      .select(
        'notifications.id',
        'notifications.sent_at',
        'notifications.opened_at',
        'events.id as event_id',
        'events.title',
        'events.category',
        'events.timestamp as event_timestamp'
      )
      .orderBy('notifications.sent_at', 'desc')
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/:id/opened — mark notification as opened
router.post('/:id/opened', async (req, res, next) => {
  try {
    const [notification] = await db('notifications')
      .where({ id: req.params.id })
      .update({ opened_at: new Date() })
      .returning('*');

    if (!notification) {
      return res.status(404).json({ error: { message: 'Notification not found' } });
    }

    res.json(notification);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
