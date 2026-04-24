const paylov = require('../services/paylov.service');
const logger = require('../utils/logger');

// In a real app, cards marked inactive would live in a real DB.
// This in-memory store is intentionally minimal — swap for your ORM/DB layer.
const deletedCards = new Set();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Cards ────────────────────────────────────────────────────────────────────

exports.createCard = asyncHandler(async (req, res) => {
  const result = await paylov.createCard(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.confirmCard = asyncHandler(async (req, res) => {
  const result = await paylov.confirmCard(req.body);
  // Persist result.cardId in your DB here
  res.json({ success: true, data: result });
});

exports.getCard = asyncHandler(async (req, res) => {
  const { cardId } = req.params;

  if (deletedCards.has(cardId)) {
    return res.status(404).json({ success: false, error: 'Card not found or has been removed' });
  }

  const result = await paylov.getCard(cardId);
  res.json({ success: true, data: result });
});

exports.deleteCard = asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  deletedCards.add(cardId);
  logger.info('Card marked as deleted', { cardId });
  res.json({ success: true, message: 'Card removed' });
});

// ─── Payments ─────────────────────────────────────────────────────────────────

exports.createTransaction = asyncHandler(async (req, res) => {
  const result = await paylov.createTransaction(req.body);
  res.status(201).json({ success: true, data: result });
});

exports.payTransaction = asyncHandler(async (req, res) => {
  const result = await paylov.payTransaction(req.body);
  res.json({ success: true, data: result });
});

exports.getTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.query;
  if (!transactionId) {
    return res.status(400).json({ success: false, error: 'transactionId query param is required' });
  }
  const result = await paylov.getTransaction(transactionId);
  res.json({ success: true, data: result });
});

// ─── Payment Link ─────────────────────────────────────────────────────────────

exports.generatePaymentLink = asyncHandler(async (req, res) => {
  const result = paylov.generatePaymentLink(req.body);
  res.json({ success: true, data: result });
});
