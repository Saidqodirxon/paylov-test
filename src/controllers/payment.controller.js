const paylov = require('../services/paylov.service');
const logger = require('../utils/logger');

const deletedCards = new Set();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Cards ────────────────────────────────────────────────────────────────────

exports.createCard = asyncHandler(async (req, res) => {
  const { userId, cardNumber, expireDate, phoneNumber } = req.body;

  logger.info('POST /cards', { userId, phoneNumber });

  const result = await paylov.createCard({ userId, cardNumber, expireDate, phoneNumber });

  // result.cid is returned — frontend must pass it to POST /cards/confirm
  res.status(201).json({ success: true, data: result });
});

exports.confirmCard = asyncHandler(async (req, res) => {
  const { cid, otp, cardName } = req.body;

  logger.info('POST /cards/confirm', { cid });

  const result = await paylov.confirmCard({ cid, otp, cardName });

  // result.cardId is returned — use this for payments
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
  const { userId, amount, account } = req.body;

  logger.info('POST /transactions', { userId, amount });

  const result = await paylov.createTransaction({ userId, amount, account });
  res.status(201).json({ success: true, data: result });
});

exports.payTransaction = asyncHandler(async (req, res) => {
  const { transactionId, cardId, userId } = req.body;

  logger.info('POST /transactions/pay', { transactionId, cardId, userId });

  const result = await paylov.payTransaction({ transactionId, cardId, userId });
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
  const { amount, returnUrl, orderId } = req.body;

  logger.info('POST /payment-link', { amount, orderId, returnUrl });

  const result = paylov.generatePaymentLink({ amount, returnUrl, orderId });
  res.json({ success: true, data: result });
});
