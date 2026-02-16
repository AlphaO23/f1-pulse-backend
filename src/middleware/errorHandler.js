const logger = require('../lib/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
