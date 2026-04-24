const Joi = require('joi');

const userId = Joi.string().min(1).required().messages({
  'string.empty': 'userId cannot be empty',
  'any.required': 'userId is required',
});

const cardNumber = Joi.string()
  .pattern(/^\d{16}$/)
  .required()
  .messages({ 'string.pattern.base': 'cardNumber must be exactly 16 digits' });

const expireDate = Joi.string()
  .pattern(/^\d{4}$/)
  .required()
  .messages({ 'string.pattern.base': 'expireDate must be 4 digits (MMYY)' });

const phoneNumber = Joi.string()
  .pattern(/^\+?[0-9]{10,15}$/)
  .required()
  .messages({ 'string.pattern.base': 'phoneNumber must be 10-15 digits, optionally starting with +' });

exports.createCard = Joi.object({
  userId,
  cardNumber,
  expireDate,
  phoneNumber,
});

// Step 1 returns `cid` — that cid is passed here to confirm OTP
exports.confirmCard = Joi.object({
  cid: Joi.string().min(1).required().messages({
    'string.empty': 'cid cannot be empty',
    'any.required': 'cid is required (returned from createCard as data.cid)',
  }),
  otp: Joi.string().min(4).max(8).required().messages({
    'string.min': 'otp must be at least 4 characters',
    'any.required': 'otp is required',
  }),
  cardName: Joi.string().max(50).default('My Card'),
});

exports.createTransaction = Joi.object({
  userId,
  amount: Joi.number().positive().required().messages({
    'number.positive': 'amount must be greater than 0',
    'any.required': 'amount is required',
  }),
  account: Joi.object().required().messages({
    'any.required': 'account object is required',
  }),
});

exports.payTransaction = Joi.object({
  transactionId: Joi.string().min(1).required(),
  cardId: Joi.string().min(1).required(),
  userId,
});

exports.generatePaymentLink = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.base': 'amount must be a number',
    'number.positive': 'amount must be greater than 0',
    'any.required': 'amount is required',
  }),
  returnUrl: Joi.string().uri().required().messages({
    'string.uri': 'returnUrl must be a valid URL',
    'any.required': 'returnUrl is required',
  }),
  orderId: Joi.string().min(1).required().messages({
    'any.required': 'orderId is required',
  }),
});
