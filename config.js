require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  apiMerchantId: process.env.API_MERCHANT_ID,
  apiAccount: process.env.API_ACCOUNT,
  apiSharedSecret: process.env.API_SHARED_SECRET,
  apiUrl: process.env.API_URL,
  hppMerchantId: process.env.HPP_MERCHANT_ID,
  hppAccount: process.env.HPP_ACCOUNT,
  hppSharedSecret: process.env.HPP_SHARED_SECRET,
  hppSandboxUrl: process.env.HPP_SANDBOX_URL,
  hppResponseUrl: process.env.HPP_RESPONSE_URL,
  realvaultEnabled: process.env.REALVAULT_ENABLED === 'true',
  realvaultAccount: process.env.REALVAULT_ACCOUNT || process.env.API_ACCOUNT
};
