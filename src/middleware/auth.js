const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const db = require('../db/connection');

// ---------------------------------------------------------------------------
// Access token (short-lived, stateless)
// ---------------------------------------------------------------------------

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

// ---------------------------------------------------------------------------
// Refresh token (long-lived, stored in DB)
// ---------------------------------------------------------------------------

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresMs);

  await db('refresh_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  return { token, expiresAt };
}

async function verifyRefreshToken(token) {
  const row = await db('refresh_tokens')
    .where('token', token)
    .where('expires_at', '>', new Date())
    .first();

  return row || null;
}

async function revokeRefreshToken(token) {
  await db('refresh_tokens').where('token', token).del();
}

async function revokeAllUserTokens(userId) {
  await db('refresh_tokens').where('user_id', userId).del();
}

// ---------------------------------------------------------------------------
// Helper: generate both tokens at once
// ---------------------------------------------------------------------------

async function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, expiresAt } = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpiresIn,
    refreshExpiresAt: expiresAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Middleware: verify access token on protected routes
// ---------------------------------------------------------------------------

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or malformed Authorization header' } });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { message: 'Access token expired', code: 'TOKEN_EXPIRED' } });
    }
    return res.status(401).json({ error: { message: 'Invalid token' } });
  }
}

module.exports = {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  generateTokenPair,
};
