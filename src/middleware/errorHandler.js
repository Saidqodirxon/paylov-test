const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled error', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: statusCode === 500 ? err.stack : undefined,
  });

  const body = { success: false, error: message };

  // In production, never expose internal details on 5xx
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    body.error = 'Internal server error';
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
