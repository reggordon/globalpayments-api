const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

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
    apiUrl: configData.apiUrl.trim()
  };
} catch (error) {
  console.error('Error: config.json not found. Please copy config.json.example to config.json and add your credentials.');
  process.exit(1);
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
    
    res.status(500).json({
      success: false,
      message: 'Payment processing failed: ' + error.message
    });
  }
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
