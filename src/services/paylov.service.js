const axios = require('axios');
const axiosRetry = require('axios-retry');
const config = require('../config');
const { getAccessToken, clearToken } = require('../utils/tokenManager');
const logger = require('../utils/logger');

const client = axios.create({
  baseURL: config.paylov.baseUrl,
  timeout: 15000,
});

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    const status = error.response?.status;
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || status >= 500;
  },
  onRetry: (retryCount, error) => {
    logger.warn('Retrying Paylov request', { retryCount, url: error.config?.url, status: error.response?.status });
  },
});

async function authorizedRequest(method, path, data = null, params = null) {
  const token = await getAccessToken();

  const makeRequest = async (accessToken) => {
    return client.request({
      method,
      url: path,
      data,
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  };

  try {
    const response = await makeRequest(token);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      logger.warn('Token expired, refreshing and retrying');
      clearToken();
      const freshToken = await getAccessToken();
      const response = await makeRequest(freshToken);
      return response.data;
    }
    throw normalizeError(error);
  }
}

function normalizeError(error) {
  const status   = error.response?.status;
  const data     = error.response?.data;
  // Paylov wraps errors as: { result: null, error: { message: "...", code: "..." } }
  const detail   = data?.error?.message || data?.detail || data?.message || error.message;

  // Log the full Paylov response so we can debug field-name / format issues
  logger.error('Paylov API error', { status, paylovResponse: data, url: error.config?.url });

  const err = new Error(detail || 'Paylov API error');
  err.statusCode  = status || 500;
  err.paylovData  = data;
  return err;
}

// ─── Card Management ───────────────────────────────────────────────────────────

async function createCard({ userId, cardNumber, expireDate, phoneNumber }) {
  if (!userId) throw Object.assign(new Error('userId is required'), { statusCode: 400 });

  // Log full request (mask middle digits of card number)
  const maskedCard = cardNumber.slice(0, 4) + '********' + cardNumber.slice(-4);
  logger.info('Creating card', { userId, phoneNumber, cardNumber: maskedCard, expireDate });

  const requestBody = { userId, cardNumber, expireDate, phoneNumber };
  logger.info('Paylov createUserCard request', { body: { ...requestBody, cardNumber: maskedCard } });

  const raw    = await authorizedRequest('POST', '/merchant/userCard/createUserCard/', requestBody);
  const result = raw.result || raw;

  // result.cid is used in confirmUserCardCreate step
  logger.info('Card creation initiated — OTP sent by Paylov', { userId, cid: result.cid, otpSentPhone: result.otpSentPhone });
  return result;
}

// cid is returned from createCard (createUserCard step)
// After confirm, Paylov returns cardId — used for payments
async function confirmCard({ cid, otp, cardName }) {
  if (!cid) throw Object.assign(new Error('cid is required'), { statusCode: 400 });

  logger.info('Confirming card OTP', { cid });

  const raw    = await authorizedRequest('POST', '/merchant/userCard/confirmUserCardCreate/', {
    cid,
    otp,
    cardName,
  });
  const result = raw.result || raw;

  logger.info('Card confirmed', { cid, cardId: result.cardId });
  return result;
}

async function getCard(cardId) {
  if (!cardId) throw Object.assign(new Error('cardId is required'), { statusCode: 400 });
  logger.info('Fetching card', { cardId });
  const raw = await authorizedRequest('GET', `/merchant/userCard/getCard/${cardId}/`);
  return raw.result || raw;
}

// ─── Payment Flow ──────────────────────────────────────────────────────────────

async function createTransaction({ userId, amount, account }) {
  if (!userId) throw Object.assign(new Error('userId is required'), { statusCode: 400 });

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw Object.assign(new Error('amount must be a positive number'), { statusCode: 400 });
  }

  logger.info('Creating transaction', { userId, amount: numAmount });

  const raw    = await authorizedRequest('POST', '/merchant/receipts/create/', {
    userId,
    amount: numAmount,
    account,
  });
  const result = raw.result || raw;

  logger.info('Transaction created', { transactionId: result.transactionId || result.id });
  return result;
}

async function payTransaction({ transactionId, cardId, userId }) {
  if (!userId) throw Object.assign(new Error('userId is required'), { statusCode: 400 });
  if (!transactionId) throw Object.assign(new Error('transactionId is required'), { statusCode: 400 });
  if (!cardId) throw Object.assign(new Error('cardId is required'), { statusCode: 400 });

  logger.info('Executing payment', { transactionId, cardId, userId });

  const raw    = await authorizedRequest('POST', '/merchant/receipts/pay/', {
    transactionId,
    cardId,
    userId,
  });
  const result = raw.result || raw;

  logger.info('Payment executed', { transactionId, status: result.status });
  return result;
}

async function getTransaction(transactionId) {
  if (!transactionId) throw Object.assign(new Error('transactionId is required'), { statusCode: 400 });
  logger.info('Fetching transaction status', { transactionId });
  const raw = await authorizedRequest('GET', '/merchant/getTransactions/', null, { transactionId });
  return raw.result || raw;
}

// ─── Payment Link ──────────────────────────────────────────────────────────────

function generatePaymentLink({ amount, returnUrl, orderId }) {
  if (!config.paylov.merchantId) {
    throw Object.assign(
      new Error('PAYLOV_MERCHANT_ID is not configured in environment variables'),
      { statusCode: 500 }
    );
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw Object.assign(new Error('amount must be a positive number'), { statusCode: 400 });
  }

  if (!returnUrl) throw Object.assign(new Error('returnUrl is required'), { statusCode: 400 });
  if (!orderId)   throw Object.assign(new Error('orderId is required'),   { statusCode: 400 });

  // Paylov checkout expects base64-encoded JSON (not URLSearchParams)
  const payload = {
    merchant_id: config.paylov.merchantId,
    amount:      numAmount,
    return_url:  returnUrl,
    account:     { order_id: orderId },
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const link    = `${config.paylov.checkoutUrl}/checkout/create/${encoded}`;

  logger.info('Checkout link generated', { orderId, amount: numAmount, payload, encoded, link });
  return { link, encoded, payload };
}

module.exports = {
  createCard,
  confirmCard,
  getCard,
  createTransaction,
  payTransaction,
  getTransaction,
  generatePaymentLink,
};
