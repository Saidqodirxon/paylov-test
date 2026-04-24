require('dotenv').config();

const required = (name) => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
};

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  paylov: {
    baseUrl: required('PAYLOV_BASE_URL'),
    username: required('PAYLOV_USERNAME'),
    password: required('PAYLOV_PASSWORD'),
    consumerKey: required('PAYLOV_CONSUMER_KEY'),
    consumerSecret: required('PAYLOV_CONSUMER_SECRET'),
    merchantId: process.env.PAYLOV_MERCHANT_ID || null,
    // Checkout frontend URL — separate from the API base URL
    checkoutUrl: process.env.PAYLOV_CHECKOUT_URL || 'https://my.paylov.uz',
  },
};
