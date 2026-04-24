require('dotenv').config();
const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const paymentRoutes = require('./routes/payment.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// Security: prevent token/secret leakage in responses
app.disable('x-powered-by');

// Health check (no auth required)
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/v1/payment', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Paylov service started`, { port: config.port, env: config.nodeEnv });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

module.exports = app;
