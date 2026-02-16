const express = require('express');
const db = require('../db/connection');

const router = express.Router();

const VALID_SENSITIVITIES = ['all', 'breaking'];

// GET /api/users — list users
router.get('/', async (req, res, next) => {
  try {
    const users = await db('users').select('id', 'email', 'favorite_team', 'favorite_driver', 'alert_sensitivity', 'onboarded', 'created_at');
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }
    const { password_hash, fcm_token, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id — update user fields
router.patch('/:id', async (req, res, next) => {
  try {
    const allowedFields = ['favorite_team', 'favorite_driver', 'alert_sensitivity', 'fcm_token', 'onboarded'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.alert_sensitivity && !VALID_SENSITIVITIES.includes(updates.alert_sensitivity)) {
      return res.status(400).json({ error: { message: `alert_sensitivity must be one of: ${VALID_SENSITIVITIES.join(', ')}` } });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { message: 'No valid fields to update' } });
    }

    const [user] = await db('users').where({ id: req.params.id }).update(updates).returning('*');

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const { password_hash, fcm_token, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// FCM token registration
// ---------------------------------------------------------------------------

// POST /api/users/:id/fcm-token — register device for push notifications
router.post('/:id/fcm-token', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: { message: 'token is required and must be a string' } });
    }

    const [user] = await db('users')
      .where({ id: req.params.id })
      .update({ fcm_token: token })
      .returning(['id', 'email']);

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json({ message: 'FCM token registered', userId: user.id });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Preferences endpoints
// ---------------------------------------------------------------------------

// GET /api/users/:id/preferences
router.get('/:id/preferences', async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.params.id })
      .select('favorite_team', 'favorite_driver', 'alert_sensitivity')
      .first();

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/preferences — set favorite team, driver, alert sensitivity
router.post('/:id/preferences', async (req, res, next) => {
  try {
    const { favorite_team, favorite_driver, alert_sensitivity } = req.body;

    if (alert_sensitivity && !VALID_SENSITIVITIES.includes(alert_sensitivity)) {
      return res.status(400).json({ error: { message: `alert_sensitivity must be one of: ${VALID_SENSITIVITIES.join(', ')}` } });
    }

    const updates = {};
    if (favorite_team !== undefined) updates.favorite_team = favorite_team;
    if (favorite_driver !== undefined) updates.favorite_driver = favorite_driver;
    if (alert_sensitivity !== undefined) updates.alert_sensitivity = alert_sensitivity;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { message: 'Provide at least one of: favorite_team, favorite_driver, alert_sensitivity' } });
    }

    const [user] = await db('users')
      .where({ id: req.params.id })
      .update(updates)
      .returning(['favorite_team', 'favorite_driver', 'alert_sensitivity']);

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
