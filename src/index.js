const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const requestLogger = require('./middleware/requestLogger');
const adminAuth = require('./middleware/adminAuth');
const authRouter = require('./routes/auth');
const eventsRouter = require('./routes/events');
const feedRouter = require('./routes/feed');
const categoriesRouter = require('./routes/categories');
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const { initFirebase } = require('./services/pushNotification');
const { startPolling } = require('./services/rssIngestion');
const db = require('./db/connection');
const logger = require('./lib/logger');
const { register, dbHealthy } = require('./lib/metrics');

const app = express();
const isProduction = config.nodeEnv === 'production';

// ---------------------------------------------------------------------------
// Trust proxy — required behind Railway / Render / DigitalOcean load balancers
// so that express-rate-limit and req.ip work correctly with X-Forwarded-For.
// ---------------------------------------------------------------------------
if (isProduction) {
  app.set('trust proxy', 1);
}

// View engine — EJS for admin dashboard
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------
app.use(
  helmet({
    // HSTS — tell browsers to always use HTTPS
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

// CORS — lock to explicit origins in production
if (isProduction && config.cors.allowedOrigins.length > 0) {
  app.use(
    cors({
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );
} else {
  app.use(cors());
}

app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Rate limiting — applied to all public endpoints
// ---------------------------------------------------------------------------
const publicLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.' } },
});

// Stricter limiter for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many authentication attempts, please try again later.' } },
});

// ---------------------------------------------------------------------------
// Public routes (no auth required)
// ---------------------------------------------------------------------------

// Simple liveness probe — registered BEFORE HTTPS redirect so Railway's
// internal healthcheck (plain HTTP) always gets a 200 response.
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// ---------------------------------------------------------------------------
// HTTPS redirect — in production, redirect plain HTTP to HTTPS.
// Must come AFTER /health so the healthcheck probe isn't redirected.
// ---------------------------------------------------------------------------
if (isProduction) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ---------------------------------------------------------------------------
// Admin dashboard (Basic auth, server-rendered EJS)
// ---------------------------------------------------------------------------
app.use('/admin', adminAuth, adminRouter);

// Detailed health check — reports service status (exempt from rate limiting)
app.get('/api/health', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({
      status: 'ok',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        rss: 'polling',
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        rss: 'polling',
      },
    });
  }
});

// Prometheus metrics endpoint (exempt from rate limiting for scrapers)
app.get('/api/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Auth: register, login, refresh-token — with stricter rate limit
app.use('/api/auth', authLimiter, authRouter);

// ---------------------------------------------------------------------------
// Public routes (no JWT required) — feed & categories readable by anyone
// ---------------------------------------------------------------------------
app.use('/api/feed', publicLimiter, feedRouter);
app.use('/api/categories', publicLimiter, categoriesRouter);
app.use('/api/events', publicLimiter, eventsRouter);

// ---------------------------------------------------------------------------
// Protected routes (JWT required) — general rate limit
// ---------------------------------------------------------------------------
app.use('/api/users', publicLimiter, authenticate, usersRouter);
app.use('/api', publicLimiter, authenticate, notificationsRouter);
app.use('/api/notifications', publicLimiter, authenticate, notificationsRouter);

// Error handler (must be last)
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Database health check — updates Prometheus gauge every 60 seconds
// ---------------------------------------------------------------------------
function startDbHealthCheck() {
  const check = async () => {
    try {
      await db.raw('SELECT 1');
      dbHealthy.set(1);
    } catch {
      dbHealthy.set(0);
    }
  };
  check();
  setInterval(check, 60000);
}

// Start server
app.listen(config.port, () => {
  logger.info(`Formula Pulse API running on port ${config.port}`, { environment: config.nodeEnv });

  if (isProduction) {
    logger.info('Production hardening active: HSTS, HTTPS redirect, rate limiting, CORS lock');
  }

  // Initialize Firebase (non-blocking — logs warning if credentials missing)
  initFirebase();

  // Start RSS feed polling
  startPolling();

  // Start periodic DB health check for Prometheus
  startDbHealthCheck();
});

module.exports = app;
