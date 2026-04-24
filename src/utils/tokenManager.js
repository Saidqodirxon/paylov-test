const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

const EXPIRY_BUFFER_MS = 60 * 1000; // refresh 60s before actual expiry

let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

function buildBasicAuth() {
  const credentials = `${config.paylov.consumerKey}:${config.paylov.consumerSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

function isTokenValid() {
  return (
    tokenCache.accessToken !== null &&
    tokenCache.expiresAt !== null &&
    Date.now() < tokenCache.expiresAt - EXPIRY_BUFFER_MS
  );
}

async function fetchNewToken() {
  const params = new URLSearchParams({
    grant_type: 'password',
    username: config.paylov.username,
    password: config.paylov.password,
  });

  const response = await axios.post(
    `${config.paylov.baseUrl}/merchant/oauth2/token/`,
    params.toString(),
    {
      headers: {
        Authorization: buildBasicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in } = response.data;
  tokenCache = {
    accessToken: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  };

  logger.info('Paylov access token refreshed', { expiresIn: expires_in });
  return access_token;
}

async function getAccessToken() {
  if (isTokenValid()) {
    return tokenCache.accessToken;
  }
  return fetchNewToken();
}

function clearToken() {
  tokenCache = { accessToken: null, expiresAt: null };
}

module.exports = { getAccessToken, clearToken };
