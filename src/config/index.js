require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'f1pulse',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  firebase: {
    credentialPath: process.env.FIREBASE_CREDENTIAL_PATH || './firebase-service-account.json',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'f1pulse-access-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresMs: parseInt(process.env.JWT_REFRESH_EXPIRES_MS, 10) || 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  rss: {
    cronSchedule: process.env.RSS_CRON_SCHEDULE || '*/1 * * * *',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  cors: {
    // Comma-separated origins, or empty for wildcard in dev
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
      : [],
  },

  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || 'changeme',
  },
};

module.exports = config;
