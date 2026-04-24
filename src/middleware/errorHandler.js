const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled error', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    paylovData: err.paylovData,
    stack: statusCode === 500 ? err.stack : undefined,
  });

  const body = { success: false, error: message };

  // Include Paylov error details (helps with debugging field issues)
  if (err.paylovData) {
    body.paylovError = err.paylovData;
  }

  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    body.error = 'Internal server error';
    delete body.paylovError;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
