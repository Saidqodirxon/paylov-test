const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});

const cardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Card operation limit reached, try again in 1 hour.' },
  handler: (req, res, next, options) => {
    logger.warn('Card rate limit exceeded', { ip: req.ip });
    res.status(429).json(options.message);
  },
});

module.exports = { paymentLimiter, cardLimiter };
