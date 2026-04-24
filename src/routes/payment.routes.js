const { Router } = require('express');
const controller = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const { requireApiKey } = require('../middleware/auth');
const { paymentLimiter, cardLimiter } = require('../middleware/rateLimiter');
const v = require('../validators/payment.validators');

const router = Router();

router.use(requireApiKey);

// ─── Cards ────────────────────────────────────────────────────────────────────
router.post('/cards', cardLimiter, validate(v.createCard), controller.createCard);
router.post('/cards/confirm', cardLimiter, validate(v.confirmCard), controller.confirmCard);
router.get('/cards/:cardId', controller.getCard);
router.delete('/cards/:cardId', controller.deleteCard);

// ─── Payments ─────────────────────────────────────────────────────────────────
router.post('/transactions', paymentLimiter, validate(v.createTransaction), controller.createTransaction);
router.post('/transactions/pay', paymentLimiter, validate(v.payTransaction), controller.payTransaction);
router.get('/transactions', controller.getTransaction);

// ─── Payment Link ─────────────────────────────────────────────────────────────
router.post('/payment-link', validate(v.generatePaymentLink), controller.generatePaymentLink);

module.exports = router;
