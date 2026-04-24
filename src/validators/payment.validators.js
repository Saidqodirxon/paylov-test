const Joi = require('joi');

const cardNumber = Joi.string()
  .pattern(/^\d{16}$/)
  .required()
  .messages({ 'string.pattern.base': 'cardNumber must be 16 digits' });

const expireDate = Joi.string()
  .pattern(/^\d{4}$/)
  .required()
  .messages({ 'string.pattern.base': 'expireDate must be MMYY format (4 digits)' });

const phoneNumber = Joi.string()
  .pattern(/^\+?[0-9]{10,15}$/)
  .required();

exports.createCard = Joi.object({
  userId: Joi.string().required(),
  cardNumber,
  expireDate,
  phoneNumber,
});

exports.confirmCard = Joi.object({
  cardId: Joi.string().required(),
  otp: Joi.string().min(4).max(8).required(),
  cardName: Joi.string().max(50).default('My Card'),
});

exports.createTransaction = Joi.object({
  userId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  account: Joi.object().required(),
});

exports.payTransaction = Joi.object({
  transactionId: Joi.string().required(),
  cardId: Joi.string().required(),
  userId: Joi.string().required(),
});

// merchant_id is always read from PAYLOV_MERCHANT_ID env — never accepted from callers
exports.generatePaymentLink = Joi.object({
  amount: Joi.number().positive().required(),
  returnUrl: Joi.string().uri().required(),
  orderId: Joi.string().required(),
});
