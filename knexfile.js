const config = require('./src/config');

const connection = config.db.connectionString
  ? { connectionString: config.db.connectionString, ssl: { rejectUnauthorized: false } }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    };

const baseConfig = {
  client: 'pg',
  connection,
  migrations: {
    directory: './src/db/migrations',
  },
  seeds: {
    directory: './src/db/seeds',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

module.exports = {
  development: {
    ...baseConfig,
  },

  staging: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 20,
    },
  },

  production: {
    ...baseConfig,
    pool: {
      min: 5,
      max: 30,
    },
  },
};
