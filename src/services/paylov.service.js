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
    // retry on network errors and 5xx, but NOT on 401/400 (those need fresh tokens or are user errors)
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
      // Token expired mid-flight — clear cache and retry once with fresh token
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
  const status = error.response?.status;
  const detail = error.response?.data?.detail || error.response?.data?.message || error.message;

  const err = new Error(detail || 'Paylov API error');
  err.statusCode = status || 500;
  err.paylovData = error.response?.data;
  return err;
}

// ─── Card Management ───────────────────────────────────────────────────────────

async function createCard({ userId, cardNumber, expireDate, phoneNumber }) {
  logger.info('Creating card', { userId, phoneNumber });
  // Paylov automatically sends an OTP SMS to phoneNumber — we do not send SMS
  const data = await authorizedRequest('POST', '/merchant/userCard/createUserCard/', {
    userId,
    cardNumber,
    expireDate,
    phoneNumber,
  });
  logger.info('Card creation initiated — OTP sent by Paylov', { userId, cid: data.cid || data.cardId });
  return data;
}

async function confirmCard({ cardId, otp, cardName }) {
  logger.info('Confirming card OTP', { cardId });
  const data = await authorizedRequest('POST', '/merchant/userCard/confirmUserCardCreate/', {
    cardId,
    otp,
    cardName,
  });
  logger.info('Card confirmed', { cardId });
  return data;
}

async function getCard(cardId) {
  logger.info('Fetching card', { cardId });
  return authorizedRequest('GET', `/merchant/userCard/getCard/${cardId}/`);
}

// ─── Payment Flow ──────────────────────────────────────────────────────────────

async function createTransaction({ userId, amount, account }) {
  logger.info('Creating transaction', { userId, amount });
  const data = await authorizedRequest('POST', '/merchant/receipts/create/', {
    userId,
    amount,
    account,
  });
  logger.info('Transaction created', { transactionId: data.transactionId });
  return data;
}

async function payTransaction({ transactionId, cardId, userId }) {
  logger.info('Executing payment', { transactionId, cardId, userId });
  const data = await authorizedRequest('POST', '/merchant/receipts/pay/', {
    transactionId,
    cardId,
    userId,
  });
  logger.info('Payment executed', { transactionId, status: data.status });
  return data;
}

async function getTransaction(transactionId) {
  logger.info('Fetching transaction status', { transactionId });
  return authorizedRequest('GET', '/merchant/getTransactions/', null, { transactionId });
}

// ─── Payment Link ──────────────────────────────────────────────────────────────

// Checkout link does not require card binding — user pays manually on Paylov's page.
// merchant_id MUST come from env (PAYLOV_MERCHANT_ID), not from the request.
function generatePaymentLink({ amount, returnUrl, orderId }) {
  if (!config.paylov.merchantId) {
    const err = new Error('PAYLOV_MERCHANT_ID is not configured');
    err.statusCode = 500;
    throw err;
  }

  const query = new URLSearchParams({
    merchant_id: config.paylov.merchantId,
    amount: String(amount),
    return_url: returnUrl,
    'account.order_id': orderId,
  }).toString();

  const encoded = Buffer.from(query).toString('base64');
  const link = `${config.paylov.baseUrl}/checkout/create/${encoded}`;

  logger.info('Checkout link generated', { orderId, amount });
  return { link, encoded };
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
