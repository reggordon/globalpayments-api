const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const TRANSACTIONS_FILE = path.join(__dirname, 'data', 'transactions.json');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Load configuration
let config;
try {
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  config = {
    merchantId: configData.merchantId.trim(),
    account: configData.account.trim(),
    sharedSecret: configData.sharedSecret.trim(),
    apiUrl: configData.apiUrl.trim(),
    // HPP configuration (optional - may be same as API credentials)
    hppMerchantId: (configData.hppMerchantId || configData.merchantId).trim(),
    hppAccount: (configData.hppAccount || configData.account).trim(),
    hppSharedSecret: (configData.hppSharedSecret || configData.sharedSecret).trim(),
    hppSandboxUrl: (configData.hppSandboxUrl || 'https://hpp.sandbox.realexpayments.com/pay').trim(),
    hppResponseUrl: (configData.hppResponseUrl || 'http://localhost:3001/hpp-response').trim()
  };
} catch (error) {
  console.error('Error: config.json not found. Please copy config.json.example to config.json and add your credentials.');
  process.exit(1);
}

// Initialize transactions file if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(TRANSACTIONS_FILE)) {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2));
}

// Transaction logging functions
function loadTransactions() {
  try {
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
}

function saveTransaction(transaction) {
  try {
    const transactions = loadTransactions();
    transactions.unshift(transaction); // Add to beginning
    
    // Keep only last 1000 transactions
    if (transactions.length > 1000) {
      transactions.splice(1000);
    }
    
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    console.log('Transaction saved:', transaction.orderId);
  } catch (error) {
    console.error('Error saving transaction:', error);
  }
}

// Helper function to generate timestamp
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Helper function to generate SHA1 hash
function generateSha1Hash(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

// Helper function to generate request signature
function generateSignature(timestamp, merchantId, orderId, amount, currency, cardNumber) {
  // Step 1: timestamp.merchantid.orderid.amount.currency.cardnumber
  const step1 = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}.${cardNumber}`;
  console.log('Signature Step 1:', step1);
  const hash1 = generateSha1Hash(step1);
  console.log('Hash 1:', hash1);
  
  // Step 2: hash1.secret
  const step2 = `${hash1}.${config.sharedSecret}`;
  const hash2 = generateSha1Hash(step2);
  console.log('Final Hash:', hash2);
  
  return hash2;
}

// Helper function to build XML request
function buildAuthRequest(orderData) {
  const { orderId, amount, currency, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, timestamp } = orderData;
  
  const signature = generateSignature(
    timestamp,
    config.merchantId,
    orderId,
    amount,
    currency,
    cardNumber
  );
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<request type="auth" timestamp="${timestamp}">
  <merchantid>${config.merchantId}</merchantid>
  <account>${config.account}</account>
  <orderid>${orderId}</orderid>
  <amount currency="${currency}">${amount}</amount>
  <card>
    <number>${cardNumber}</number>
    <expdate>${expiryMonth}${expiryYear}</expdate>
    <chname>${cardHolderName}</chname>
    <type>VISA</type>
    <cvn>
      <number>${cvv}</number>
      <presind>1</presind>
    </cvn>
  </card>
  <autosettle flag="1"/>
  <sha1hash>${signature}</sha1hash>
</request>`;
}

// Helper function to generate refund signature
function generateRefundSignature(timestamp, merchantId, orderId) {
  // For rebate/refund: timestamp.merchantid.orderid.. (empty amount and currency)
  const step1 = `${timestamp}.${merchantId}.${orderId}..`;
  console.log('Refund Signature Step 1:', step1);
  const hash1 = generateSha1Hash(step1);
  console.log('Refund Hash 1:', hash1);
  
  // Step 2: hash1.secret
  const step2 = `${hash1}.${config.sharedSecret}`;
  const hash2 = generateSha1Hash(step2);
  console.log('Refund Final Hash:', hash2);
  
  return hash2;
}

// Helper function to build refund XML request
function buildRefundRequest(refundData) {
  const { orderId, amount, currency, pasref, authcode, timestamp } = refundData;
  
  const signature = generateRefundSignature(
    timestamp,
    config.merchantId,
    orderId
  );
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<request type="rebate" timestamp="${timestamp}">
  <merchantid>${config.merchantId}</merchantid>
  <account>${config.account}</account>
  <orderid>${orderId}</orderid>
  <pasref>${pasref}</pasref>
  <authcode>${authcode}</authcode>
  <amount currency="${currency}">${amount}</amount>
  <refundhash>${signature}</refundhash>
  <sha1hash>${signature}</sha1hash>
</request>`;
}

// Helper function to parse XML response
function parseXmlResponse(xmlString) {
  const result = {};
  
  // Extract result code
  const resultMatch = xmlString.match(/<result>(\d+)<\/result>/);
  result.resultCode = resultMatch ? resultMatch[1] : null;
  
  // Extract message
  const messageMatch = xmlString.match(/<message>(.*?)<\/message>/);
  result.message = messageMatch ? messageMatch[1] : null;
  
  // Extract order ID
  const orderIdMatch = xmlString.match(/<orderid>(.*?)<\/orderid>/);
  result.orderId = orderIdMatch ? orderIdMatch[1] : null;
  
  // Extract auth code
  const authCodeMatch = xmlString.match(/<authcode>(.*?)<\/authcode>/);
  result.authCode = authCodeMatch ? authCodeMatch[1] : null;
  
  // Extract pasref
  const pasrefMatch = xmlString.match(/<pasref>(.*?)<\/pasref>/);
  result.pasRef = pasrefMatch ? pasrefMatch[1] : null;
  
  // Extract timestamp
  const timestampMatch = xmlString.match(/timestamp="(\d+)"/);
  result.timestamp = timestampMatch ? timestampMatch[1] : null;
  
  return result;
}

// Route: Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route: Process payment via API
app.post('/process-payment', async (req, res) => {
  const { amount, currency, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv } = req.body;
  
  console.log('\n=== Processing API Payment ===');
  console.log('Amount:', amount);
  console.log('Currency:', currency);
  console.log('Card Holder:', cardHolderName);
  
  try {
    // Generate order data
    const orderId = `API-${Date.now()}`;
    const timestamp = getTimestamp();
    const amountInCents = Math.round(parseFloat(amount) * 100).toString();
    
    // Build XML request
    const xmlRequest = buildAuthRequest({
      orderId,
      amount: amountInCents,
      currency,
      cardNumber,
      cardHolderName,
      expiryMonth,
      expiryYear,
      cvv,
      timestamp
    });
    
    console.log('\n=== XML Request ===');
    console.log(xmlRequest);
    
    // Send request to Global Payments API
    const response = await axios.post(config.apiUrl, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    
    console.log('\n=== XML Response ===');
    console.log(response.data);
    
    // Parse response
    const parsedResponse = parseXmlResponse(response.data);
    
    console.log('\n=== Parsed Response ===');
    console.log(parsedResponse);
    
    // Determine success
    const isSuccess = parsedResponse.resultCode === '00';
    
    // Mask card number for logging
    const maskedCardNumber = cardNumber.slice(0, 6) + '****' + cardNumber.slice(-4);
    
    // Log transaction
    const transaction = {
      orderId: parsedResponse.orderId || orderId,
      timestamp: new Date().toISOString(),
      amount: parseFloat(amount),
      currency: currency,
      cardHolderName: cardHolderName,
      maskedCardNumber: maskedCardNumber,
      resultCode: parsedResponse.resultCode,
      message: parsedResponse.message,
      success: isSuccess,
      authCode: parsedResponse.authCode,
      pasRef: parsedResponse.pasRef,
      account: config.account
    };
    
    saveTransaction(transaction);
    
    res.json({
      success: isSuccess,
      resultCode: parsedResponse.resultCode,
      message: parsedResponse.message,
      orderId: parsedResponse.orderId,
      authCode: parsedResponse.authCode,
      pasRef: parsedResponse.pasRef,
      timestamp: parsedResponse.timestamp
    });
    
  } catch (error) {
    console.error('Payment Error:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
    
    // Log failed transaction
    const maskedCardNumber = cardNumber ? cardNumber.slice(0, 6) + '****' + cardNumber.slice(-4) : 'N/A';
    const failedTransaction = {
      orderId: orderId || 'ERROR',
      timestamp: new Date().toISOString(),
      amount: parseFloat(amount) || 0,
      currency: currency || 'N/A',
      cardHolderName: cardHolderName || 'N/A',
      maskedCardNumber: maskedCardNumber,
      resultCode: '999',
      message: 'System error: ' + error.message,
      success: false,
      authCode: null,
      pasRef: null,
      account: config.account
    };
    
    saveTransaction(failedTransaction);
    
    res.status(500).json({
      success: false,
      message: 'Payment processing failed: ' + error.message
    });
  }
});

// Route: Process refund
app.post('/refund', async (req, res) => {
  const { orderId, amount } = req.body;
  
  console.log('\n=== Processing Refund ===');
  console.log('Order ID:', orderId);
  console.log('Requested Amount:', amount);
  
  try {
    // Find original transaction
    const transactions = loadTransactions();
    const originalTransaction = transactions.find(t => t.orderId === orderId);
    
    if (!originalTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    console.log('Original Transaction Found:', {
      pasRef: originalTransaction.pasRef,
      authCode: originalTransaction.authCode,
      amount: originalTransaction.amount,
      currency: originalTransaction.currency
    });
    
    if (!originalTransaction.success) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund a failed transaction'
      });
    }
    
    // Check if already successfully refunded
    const alreadyRefunded = transactions.some(t => 
      t.type === 'refund' && t.originalOrderId === orderId && t.success === true
    );
    
    if (alreadyRefunded) {
      return res.status(400).json({
        success: false,
        message: 'Transaction has already been refunded'
      });
    }
    
    const timestamp = getTimestamp();
    const refundAmount = amount ? Math.round(parseFloat(amount) * 100).toString() : 
                         Math.round(originalTransaction.amount * 100).toString();
    
    // Build refund XML request
    const xmlRequest = buildRefundRequest({
      orderId: orderId,
      amount: refundAmount,
      currency: originalTransaction.currency,
      pasref: originalTransaction.pasRef,
      authcode: originalTransaction.authCode,
      timestamp: timestamp
    });
    
    console.log('\n=== Refund XML Request ===');
    console.log(xmlRequest);
    
    // Send refund request to Global Payments API
    const response = await axios.post(config.apiUrl, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    
    console.log('\n=== Refund XML Response ===');
    console.log(response.data);
    
    // Parse response
    const parsedResponse = parseXmlResponse(response.data);
    
    console.log('\n=== Parsed Refund Response ===');
    console.log(parsedResponse);
    
    // Determine success
    const isSuccess = parsedResponse.resultCode === '00';
    
    // Log refund transaction
    const refundTransaction = {
      orderId: parsedResponse.orderId || `REFUND-${Date.now()}`,
      originalOrderId: orderId,
      timestamp: new Date().toISOString(),
      amount: parseFloat(refundAmount) / 100,
      currency: originalTransaction.currency,
      cardHolderName: originalTransaction.cardHolderName,
      maskedCardNumber: originalTransaction.maskedCardNumber,
      resultCode: parsedResponse.resultCode,
      message: parsedResponse.message,
      success: isSuccess,
      authCode: parsedResponse.authCode,
      pasRef: parsedResponse.pasRef,
      account: config.account,
      type: 'refund'
    };
    
    saveTransaction(refundTransaction);
    
    res.json({
      success: isSuccess,
      resultCode: parsedResponse.resultCode,
      message: parsedResponse.message,
      orderId: parsedResponse.orderId,
      authCode: parsedResponse.authCode,
      pasRef: parsedResponse.pasRef,
      refundAmount: parseFloat(refundAmount) / 100
    });
    
  } catch (error) {
    console.error('Refund Error:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
    
    res.status(500).json({
      success: false,
      message: 'Refund processing failed: ' + error.message
    });
  }
});

// Route: Get transaction history
app.get('/transactions', (req, res) => {
  try {
    const transactions = loadTransactions();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const paginatedTransactions = transactions.slice(offset, offset + limit);
    
    res.json({
      success: true,
      total: transactions.length,
      limit: limit,
      offset: offset,
      transactions: paginatedTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load transactions: ' + error.message
    });
  }
});

// Route: Get transaction stats
app.get('/transactions/stats', (req, res) => {
  try {
    const transactions = loadTransactions();
    
    const stats = {
      total: transactions.length,
      successful: transactions.filter(t => t.success).length,
      failed: transactions.filter(t => !t.success).length,
      totalAmount: transactions.filter(t => t.success).reduce((sum, t) => sum + t.amount, 0),
      currencies: [...new Set(transactions.map(t => t.currency))],
      lastTransaction: transactions[0] || null
    };
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load stats: ' + error.message
    });
  }
});

// ========================================
// HPP (Hosted Payment Page) Integration
// ========================================

// Helper function to generate HPP signature
function generateHppSignature(timestamp, merchantId, orderId, amount, currency) {
  // Step 1: timestamp.merchantid.orderid.amount.currency
  const step1 = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}`;
  console.log('HPP Signature Step 1:', step1);
  const hash1 = generateSha1Hash(step1);
  console.log('HPP Hash 1:', hash1);
  
  // Step 2: hash1.secret
  const step2 = `${hash1}.${config.hppSharedSecret}`;
  const hash2 = generateSha1Hash(step2);
  console.log('HPP Final Hash:', hash2);
  
  return hash2;
}

// Helper function to verify HPP response signature
function verifyHppResponseSignature(timestamp, merchantId, orderId, result, message, pasref, authcode) {
  const step1 = `${timestamp}.${merchantId}.${orderId}.${result}.${message}.${pasref}.${authcode}`;
  const hash1 = generateSha1Hash(step1);
  
  const step2 = `${hash1}.${config.hppSharedSecret}`;
  const hash2 = generateSha1Hash(step2);
  
  return hash2;
}

// Route: Generate HPP token/parameters
app.post('/generate-hpp-token', (req, res) => {
  const { amount, currency, cardHolderName, customerEmail } = req.body;
  
  // Validate input
  if (!amount || !currency) {
    return res.status(400).json({
      success: false,
      message: 'Amount and currency are required'
    });
  }
  
  // Generate unique order ID
  const orderId = `HPP-${Date.now()}`;
  const timestamp = getTimestamp();
  
  // Convert amount to cents
  const amountInCents = Math.round(parseFloat(amount) * 100).toString();
  
  // Generate signature
  const signature = generateHppSignature(
    timestamp,
    config.hppMerchantId,
    orderId,
    amountInCents,
    currency
  );
  
  console.log('\n=== HPP Token Generation ===');
  console.log('Timestamp:', timestamp);
  console.log('Merchant ID:', config.hppMerchantId);
  console.log('Order ID:', orderId);
  console.log('Amount:', amountInCents);
  console.log('Currency:', currency);
  console.log('Generated Hash:', signature);
  
  // Prepare HPP parameters - match exact structure of working HPP app
  const hppData = {
    TIMESTAMP: timestamp,
    MERCHANT_ID: config.hppMerchantId,
    ACCOUNT: config.hppAccount,
    ORDER_ID: orderId,
    AMOUNT: amountInCents,
    CURRENCY: currency,
    AUTO_SETTLE_FLAG: '1',
    MERCHANT_RESPONSE_URL: config.hppResponseUrl,
    HPP_VERSION: '2',
    SHA1HASH: signature,
    COMMENT1: 'Drop-In UI Payment',
    COMMENT2: ''
  };
  
  // Optional fields - only CUST_NUM if provided (not HPP_CUSTOMER_EMAIL for now)
  if (cardHolderName) {
    hppData.CUST_NUM = cardHolderName;
  }
  
  res.json({
    success: true,
    hppUrl: config.hppSandboxUrl,
    hppData: hppData
  });
});

// Route: Handle HPP response (POST)
app.post('/hpp-response', (req, res) => {
  console.log('\n=== HPP Response Received ===');
  console.log('Response Data:', req.body);
  
  const {
    TIMESTAMP,
    MERCHANT_ID,
    ORDER_ID,
    RESULT,
    MESSAGE,
    PASREF,
    AUTHCODE,
    SHA1HASH,
    AMOUNT,
    CURRENCY
  } = req.body;
  
  // Verify signature
  const expectedSignature = verifyHppResponseSignature(
    TIMESTAMP,
    MERCHANT_ID,
    ORDER_ID,
    RESULT,
    MESSAGE,
    PASREF || '',
    AUTHCODE || ''
  );
  
  const isValid = expectedSignature === SHA1HASH;
  console.log('Signature Valid:', isValid);
  
  // Log transaction
  if (isValid && RESULT === '00') {
    const transaction = {
      orderId: ORDER_ID,
      timestamp: new Date().toISOString(),
      amount: parseFloat(AMOUNT) / 100,
      currency: CURRENCY,
      cardHolderName: 'HPP Payment',
      maskedCardNumber: 'N/A',
      resultCode: RESULT,
      message: MESSAGE,
      success: true,
      authCode: AUTHCODE,
      pasRef: PASREF,
      account: config.hppAccount,
      type: 'hpp'
    };
    saveTransaction(transaction);
  }
  
  // Redirect to result page with parameters
  const params = new URLSearchParams({
    result: RESULT,
    message: MESSAGE,
    orderId: ORDER_ID,
    authCode: AUTHCODE || '',
    pasRef: PASREF || '',
    valid: isValid.toString(),
    amount: AMOUNT ? (parseFloat(AMOUNT) / 100).toFixed(2) : '0',
    currency: CURRENCY || ''
  });
  
  res.redirect(`/hpp-result.html?${params.toString()}`);
});

// Route: Handle HPP response (GET for testing)
app.get('/hpp-response', (req, res) => {
  console.log('\n=== HPP Response Received (GET) ===');
  console.log('Response Data:', req.query);
  
  const {
    TIMESTAMP,
    MERCHANT_ID,
    ORDER_ID,
    RESULT,
    MESSAGE,
    PASREF,
    AUTHCODE,
    SHA1HASH,
    AMOUNT,
    CURRENCY
  } = req.query;
  
  // Verify signature
  const expectedSignature = verifyHppResponseSignature(
    TIMESTAMP,
    MERCHANT_ID,
    ORDER_ID,
    RESULT,
    MESSAGE,
    PASREF || '',
    AUTHCODE || ''
  );
  
  const isValid = expectedSignature === SHA1HASH;
  console.log('Signature Valid:', isValid);
  
  // Log transaction
  if (isValid && RESULT === '00') {
    const transaction = {
      orderId: ORDER_ID,
      timestamp: new Date().toISOString(),
      amount: parseFloat(AMOUNT) / 100,
      currency: CURRENCY,
      cardHolderName: 'HPP Payment',
      maskedCardNumber: 'N/A',
      resultCode: RESULT,
      message: MESSAGE,
      success: true,
      authCode: AUTHCODE,
      pasRef: PASREF,
      account: config.hppAccount,
      type: 'hpp'
    };
    saveTransaction(transaction);
  }
  
  // Redirect to result page with parameters
  const params = new URLSearchParams({
    result: RESULT,
    message: MESSAGE,
    orderId: ORDER_ID,
    authCode: AUTHCODE || '',
    pasRef: PASREF || '',
    valid: isValid.toString(),
    amount: AMOUNT ? (parseFloat(AMOUNT) / 100).toFixed(2) : '0',
    currency: CURRENCY || ''
  });
  
  res.redirect(`/hpp-result.html?${params.toString()}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`Global Payments API Server running on http://localhost:${PORT}`);
  console.log(`Configuration loaded:`, {
    merchantId: config.merchantId,
    account: config.account,
    apiUrl: config.apiUrl
  });
  console.log('\n⚠️  IMPORTANT: API credentials are different from HPP credentials!');
  console.log('If you haven\'t registered for API access, contact Global Payments support.\n');
});
