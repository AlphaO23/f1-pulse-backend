const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/connection');
const {
  generateTokenPair,
  verifyRefreshToken,
  revokeRefreshToken,
} = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

function sanitizeUser(user) {
  const { password_hash, fcm_token, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'email and password are required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes('@')) {
      return res.status(400).json({ error: { message: 'Invalid email format' } });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db('users')
      .insert({
        email: trimmedEmail,
        password_hash: passwordHash,
        alert_sensitivity: 'all',
        onboarded: false,
      })
      .returning('*');

    const tokens = await generateTokenPair(user);

    res.status(201).json({
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { message: 'A user with this email already exists' } });
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { message: 'email and password are required' } });
    }

    const user = await db('users')
      .where({ email: email.trim().toLowerCase() })
      .first();

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    const tokens = await generateTokenPair(user);

    res.json({
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh-token
// ---------------------------------------------------------------------------

router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: { message: 'refreshToken is required' } });
    }

    const existing = await verifyRefreshToken(refreshToken);
    if (!existing) {
      return res.status(401).json({ error: { message: 'Invalid or expired refresh token' } });
    }

    // Rotate: revoke old token, issue new pair
    await revokeRefreshToken(refreshToken);

    const user = await db('users').where({ id: existing.user_id }).first();
    if (!user) {
      return res.status(401).json({ error: { message: 'User not found' } });
    }

    const tokens = await generateTokenPair(user);

    res.json({
      user: sanitizeUser(user),
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
