require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const bcrypt = require('bcrypt');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;
const TRANSACTIONS_FILE = path.join(__dirname, 'data', 'transactions.json');
const HPP_TRANSACTIONS_FILE = path.join(__dirname, 'data', 'hpp-transactions.json');
const STORED_CARDS_FILE = path.join(__dirname, 'data', 'stored-cards.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Allow cross-site cookies in production
  }
}));

// Load configuration from environment variables
const config = {
  merchantId: process.env.API_MERCHANT_ID,
  account: process.env.API_ACCOUNT,
  sharedSecret: process.env.API_SHARED_SECRET,
  apiUrl: process.env.API_URL,
  // HPP configuration
  hppMerchantId: process.env.HPP_MERCHANT_ID,
  hppAccount: process.env.HPP_ACCOUNT,
  hppSharedSecret: process.env.HPP_SHARED_SECRET,
  hppSandboxUrl: process.env.HPP_SANDBOX_URL,
  hppResponseUrl: process.env.HPP_RESPONSE_URL || 'http://localhost:3001/hpp-response',
  // Realvault configuration (optional - for card storage)
  realvaultEnabled: process.env.REALVAULT_ENABLED === 'true',
  realvaultAccount: process.env.REALVAULT_ACCOUNT || process.env.API_ACCOUNT
};

// Validate required environment variables
const requiredEnvVars = [
  'API_MERCHANT_ID', 'API_ACCOUNT', 'API_SHARED_SECRET', 'API_URL',
  'HPP_MERCHANT_ID', 'HPP_ACCOUNT', 'HPP_SHARED_SECRET', 'HPP_SANDBOX_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:', missingVars.join(', '));
  console.error('Please copy .env.example to .env and add your credentials.');
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

// HPP-specific transaction functions
function loadHppTransactions() {
  try {
    const data = fs.readFileSync(HPP_TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading HPP transactions:', error);
    return [];
  }
}

function saveHppTransaction(transaction) {
  try {
    const transactions = loadHppTransactions();
    transactions.unshift(transaction); // Add to beginning
    
    // Keep only last 1000 transactions
    if (transactions.length > 1000) {
      transactions.splice(1000);
    }
    
    fs.writeFileSync(HPP_TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    console.log('HPP Transaction saved:', transaction.orderId);
  } catch (error) {
    console.error('Error saving HPP transaction:', error);
  }
}

// Stored Cards helper functions
function loadStoredCards() {
  try {
    const data = fs.readFileSync(STORED_CARDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading stored cards:', error);
    return [];
  }
}

function saveStoredCard(cardData) {
  try {
    const cards = loadStoredCards();
    cards.unshift(cardData); // Add to beginning
    
    fs.writeFileSync(STORED_CARDS_FILE, JSON.stringify(cards, null, 2));
    console.log('Stored card saved:', cardData.token);
    return true;
  } catch (error) {
    console.error('Error saving stored card:', error);
    return false;
  }
}

function deleteStoredCard(token) {
  try {
    let cards = loadStoredCards();
    cards = cards.filter(card => card.token !== token);
    fs.writeFileSync(STORED_CARDS_FILE, JSON.stringify(cards, null, 2));
    console.log('Stored card deleted:', token);
    return true;
  } catch (error) {
    console.error('Error deleting stored card:', error);
    return false;
  }
}

// User management helper functions
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

function saveUser(user) {
  try {
    const users = loadUsers();
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('User saved:', user.email);
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

function updateUser(userId, updates) {
  try {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      console.log('User updated:', userId);
      return users[userIndex];
    }
    return null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

function findUserByEmail(email) {
  const users = loadUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

function findUserById(userId) {
  const users = loadUsers();
  return users.find(user => user.id === userId);
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Authentication required' });
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

// Helper function to build payer-new request (create GP customer)
function buildPayerNewRequest(payerData) {
  const { payerRef, firstName, lastName, email, timestamp } = payerData;
  
  // Signature for payer-new: timestamp.merchantid.orderid.amount.currency.payerref
  const orderId = `PAYER-${Date.now()}`;
  const signature = `${timestamp}.${config.merchantId}.${orderId}...${payerRef}`;
  const hash1 = generateSha1Hash(signature);
  const sha1hash = generateSha1Hash(`${hash1}.${config.sharedSecret}`);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<request timestamp="${timestamp}" type="payer-new">
  <merchantid>${config.merchantId}</merchantid>
  <orderid>${orderId}</orderid>
  <payer ref="${payerRef}" type="Retail">
    <firstname>${firstName}</firstname>
    <surname>${lastName}</surname>
    <email>${email}</email>
  </payer>
  <sha1hash>${sha1hash}</sha1hash>
</request>`;
}

// Helper function to create GP customer
async function createGPCustomer(user) {
  try {
    const payerRef = `PAYER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = getTimestamp();
    
    // Split name into first and last
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || user.name;
    const lastName = nameParts.slice(1).join(' ') || firstName;
    
    const xmlRequest = buildPayerNewRequest({
      payerRef,
      firstName,
      lastName,
      email: user.email,
      timestamp
    });
    
    console.log('\n=== Creating GP Customer ===');
    console.log('PayerRef:', payerRef);
    console.log('XML Request:', xmlRequest);
    
    const response = await axios.post(config.apiUrl, xmlRequest, {
      headers: { 'Content-Type': 'application/xml' }
    });
    
    console.log('GP Response:', response.data);
    
    // Parse response to check success
    const parsedResponse = parseXmlResponse(response.data);
    
    if (parsedResponse.resultCode === '00') {
      console.log('✓ GP Customer created successfully');
      return { success: true, payerRef };
    } else {
      console.error('✗ GP Customer creation failed:', parsedResponse.message);
      return { success: false, error: parsedResponse.message };
    }
  } catch (error) {
    console.error('Error creating GP customer:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to build card-new request (store card in GP RealVault)
function buildCardNewRequest(cardData) {
  const { payerRef, cardRef, cardNumber, cardHolderName, expiryMonth, expiryYear, timestamp } = cardData;
  
  const orderId = `CARD-${Date.now()}`;
  const expDate = `${expiryMonth}${expiryYear.slice(-2)}`;
  const cardBrand = getCardBrand(cardNumber);
  
  // Signature for card-new: timestamp.merchantid.orderid..payerref.chname.cardnumber
  const signature = `${timestamp}.${config.merchantId}.${orderId}..${payerRef}.${cardHolderName}.${cardNumber}`;
  const hash1 = generateSha1Hash(signature);
  const sha1hash = generateSha1Hash(`${hash1}.${config.sharedSecret}`);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<request timestamp="${timestamp}" type="card-new">
  <merchantid>${config.merchantId}</merchantid>
  <orderid>${orderId}</orderid>
  <card>
    <ref>${cardRef}</ref>
    <payerref>${payerRef}</payerref>
    <number>${cardNumber}</number>
    <expdate>${expDate}</expdate>
    <chname>${cardHolderName}</chname>
    <type>${cardBrand}</type>
  </card>
  <sha1hash>${sha1hash}</sha1hash>
</request>`;
}

// Helper function to store card in GP RealVault
async function storeCardInGP(user, cardDetails) {
  try {
    // Ensure user has GP customer reference
    if (!user.gpPayerRef) {
      console.log('User has no GP customer, creating one...');
      const gpResult = await createGPCustomer(user);
      if (!gpResult.success) {
        return { success: false, error: 'Failed to create GP customer' };
      }
      updateUser(user.id, { gpPayerRef: gpResult.payerRef });
      user.gpPayerRef = gpResult.payerRef;
    }
    
    const cardRef = `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = getTimestamp();
    
    const xmlRequest = buildCardNewRequest({
      payerRef: user.gpPayerRef,
      cardRef,
      cardNumber: cardDetails.cardNumber,
      cardHolderName: cardDetails.cardHolderName,
      expiryMonth: cardDetails.expiryMonth,
      expiryYear: cardDetails.expiryYear,
      timestamp
    });
    
    console.log('\n=== Storing Card in GP RealVault ===');
    console.log('PayerRef:', user.gpPayerRef);
    console.log('CardRef:', cardRef);
    console.log('XML Request:', xmlRequest);
    
    const response = await axios.post(config.apiUrl, xmlRequest, {
      headers: { 'Content-Type': 'application/xml' }
    });
    
    console.log('GP Response:', response.data);
    
    const parsedResponse = parseXmlResponse(response.data);
    
    if (parsedResponse.resultCode === '00') {
      console.log('✓ Card stored in GP RealVault successfully');
      return { 
        success: true, 
        cardRef,
        payerRef: user.gpPayerRef 
      };
    } else {
      console.error('✗ Card storage failed:', parsedResponse.message);
      return { success: false, error: parsedResponse.message };
    }
  } catch (error) {
    console.error('Error storing card in GP:', error.message);
    return { success: false, error: error.message };
  }
}

// Helper function to build XML request
function buildAuthRequest(orderData) {
  const { orderId, amount, currency, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, timestamp } = orderData;
  
  // Ensure expiryYear is only 2 digits (convert 2025 -> 25)
  const yearTwoDigits = expiryYear.length > 2 ? expiryYear.slice(-2) : expiryYear;
  
  // Ensure expiryMonth is 2 digits with leading zero
  const monthTwoDigits = expiryMonth.padStart(2, '0');
  
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
    <expdate>${monthTwoDigits}${yearTwoDigits}</expdate>
    <chname>${cardHolderName}</chname>
    <type>${getCardBrand(cardNumber)}</type>
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

// Helper function to build stored card auth request
function buildStoredCardAuthRequest(orderData) {
  const { orderId, amount, currency, cardHolderName, pasRef, timestamp } = orderData;
  
  // For stored card transactions, signature is simpler (no card number)
  const step1 = `${timestamp}.${config.merchantId}.${orderId}.${amount}.${currency}`;
  const hash1 = generateSha1Hash(step1);
  const signature = generateSha1Hash(`${hash1}.${config.sharedSecret}`);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<request type="receipt-in" timestamp="${timestamp}">
  <merchantid>${config.merchantId}</merchantid>
  <account>${config.account}</account>
  <orderid>${orderId}</orderid>
  <amount currency="${currency}">${amount}</amount>
  <payerref>${pasRef}</payerref>
  <paymentmethod>${pasRef}</paymentmethod>
  <autosettle flag="1"/>
  <sha1hash>${signature}</sha1hash>
</request>`;
}

// Helper function to detect card brand from card number
function getCardBrand(cardNumber) {
  const firstDigit = cardNumber.charAt(0);
  const firstTwoDigits = cardNumber.substring(0, 2);
  const firstFourDigits = cardNumber.substring(0, 4);
  
  if (firstDigit === '4') {
    return 'VISA';
  } else if (parseInt(firstTwoDigits) >= 51 && parseInt(firstTwoDigits) <= 55) {
    return 'MC';
  } else if (firstTwoDigits === '34' || firstTwoDigits === '37') {
    return 'AMEX';
  } else if (firstFourDigits === '6011' || firstTwoDigits === '65') {
    return 'DINERS';
  } else if (parseInt(firstFourDigits) >= 3528 && parseInt(firstFourDigits) <= 3589) {
    return 'JCB';
  } else if (firstFourDigits === '3000' || firstFourDigits === '3095' || 
             parseInt(firstTwoDigits) >= 36 && parseInt(firstTwoDigits) <= 39) {
    return 'DINERS';
  } else {
    return 'VISA';
  }
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

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, name } = req.body;

  // Check if user already exists
  if (findUserByEmail(email)) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: uuidv4(),
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
      gpPayerRef: null // Will be populated when GP customer is created
    };

    // Save user first
    if (!saveUser(user)) {
      return res.status(500).json({ success: false, message: 'Error creating user' });
    }

    // Create GP customer
    console.log('\n=== Creating GP Customer for new user ===');
    const gpResult = await createGPCustomer(user);
    
    if (gpResult.success) {
      // Update user with GP payerRef
      const updatedUser = updateUser(user.id, { gpPayerRef: gpResult.payerRef });
      console.log('✓ User linked to GP customer:', gpResult.payerRef);
    } else {
      console.warn('⚠ GP customer creation failed, user created without GP link:', gpResult.error);
      // Continue anyway - user can still use the system
    }

    // Create session
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    // Save session explicitly before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }

      res.json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login user
app.post('/api/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    // Save session explicitly before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout user
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Get current user
app.get('/api/user', requireAuth, (req, res) => {
  const user = findUserById(req.session.userId);
  if (user) {
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
});

// Get user's transactions
app.get('/api/user/transactions', requireAuth, (req, res) => {
  try {
    const allTransactions = loadTransactions();
    const userId = req.session.userId;
    
    // Filter transactions for this user
    const userTransactions = allTransactions.filter(t => t.userId === userId);
    
    // Sort by timestamp (newest first) and limit to recent 50
    const recentTransactions = userTransactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);
    
    res.json({
      success: true,
      transactions: recentTransactions
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

// Get user's saved cards
app.get('/api/user/cards', requireAuth, (req, res) => {
  try {
    const allCards = loadStoredCards();
    const userId = req.session.userId;
    
    // Filter cards for this user
    const userCards = allCards
      .filter(card => card.userId === userId)
      .map(card => ({
        token: card.token,
        maskedCardNumber: card.maskedCardNumber,
        cardBrand: card.cardBrand,
        cardHolderName: card.cardHolderName,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        createdAt: card.createdAt,
        lastUsed: card.lastUsed,
        storedInRealvault: card.storedInRealvault
      }));
    
    res.json({
      success: true,
      cards: userCards
    });
  } catch (error) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ success: false, message: 'Error fetching cards' });
  }
});

// ==================== PAYMENT ROUTES ====================

// Route: Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route: Process payment via API
app.post('/process-payment', async (req, res) => {
  const { amount, currency, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv } = req.body;
  
  logger.info('Payment request received', {
    amount,
    currency,
    cardLast4: cardNumber ? cardNumber.slice(-4) : 'N/A'
  });
  
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
    
    logger.debug('Sending payment request to Global Payments API', { orderId });
    
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
      account: config.account,
      userId: req.session && req.session.userId ? req.session.userId : null, // Link to logged-in user
      rawResponse: response.data  // Store raw XML response from gateway
    };
    
    saveTransaction(transaction);
    
    // Log payment result
    logger.logPayment({
      orderId: transaction.orderId,
      amount: transaction.amount,
      currency: transaction.currency,
      resultCode: transaction.resultCode,
      success: isSuccess,
      cardNumber: maskedCardNumber
    });
    
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
    logger.logError('process-payment', error);
    console.error('Payment Error:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
      logger.error('API Response Error', { data: error.response.data });
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
      userId: req.session && req.session.userId ? req.session.userId : null,
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
  
  logger.info('Refund request received', { orderId, amount });
  
  console.log('\n=== Processing Refund ===');
  console.log('Order ID:', orderId);
  console.log('Requested Amount:', amount);
  
  try {
    // Find original transaction
    const transactions = loadTransactions();
    const originalTransaction = transactions.find(t => t.orderId === orderId);
    
    if (!originalTransaction) {
      logger.warn('Refund failed: Transaction not found', { orderId });
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
      logger.warn('Refund failed: Cannot refund failed transaction', { orderId });
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
      logger.warn('Refund failed: Already refunded', { orderId });
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
    
    logger.debug('Sending refund request to Global Payments API', { orderId });
    
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
    
    // Log refund result
    logger.logRefund({
      orderId: refundTransaction.orderId,
      amount: refundTransaction.amount,
      currency: refundTransaction.currency,
      resultCode: refundTransaction.resultCode,
      success: isSuccess
    });
    
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
    logger.logError('refund', error);
    console.error('Refund Error:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
      logger.error('Refund API Response Error', { data: error.response.data });
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

// Route: Get HPP transactions
app.get('/hpp-transactions', (req, res) => {
  try {
    const transactions = loadHppTransactions();
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
      message: 'Failed to load HPP transactions: ' + error.message
    });
  }
});

// Route: Get HPP transaction stats
app.get('/hpp-transactions/stats', (req, res) => {
  try {
    const transactions = loadHppTransactions();
    
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
      message: 'Failed to load HPP stats: ' + error.message
    });
  }
});

// ========================================
// Stored Cards / Card Tokenization
// ========================================

// Route: Get all stored cards
app.get('/stored-cards', (req, res) => {
  try {
    const cards = loadStoredCards();
    res.json({
      success: true,
      cards: cards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load stored cards: ' + error.message
    });
  }
});

// Route: Store a new card (tokenization)
// This endpoint saves card details after successful payment or from the stored cards page
app.post('/store-card', async (req, res) => {
  const { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, customerEmail } = req.body;
  
  console.log('\n=== Storing Card ===');
  console.log('Card Holder:', cardHolderName);
  console.log('Logged in:', req.session && req.session.userId ? 'Yes' : 'No');
  
  try {
    let cardRef, payerRef, userId = null;
    const maskedCardNumber = cardNumber.slice(0, 6) + '****' + cardNumber.slice(-4);
    const cardBrand = getCardBrand(cardNumber);
    
    // Check if user is logged in
    if (req.session && req.session.userId) {
      userId = req.session.userId;
      const user = findUserById(userId);
      
      if (user) {
        console.log('✓ User authenticated:', user.email);
        
        // Store card in GP RealVault
        const gpResult = await storeCardInGP(user, {
          cardNumber,
          cardHolderName,
          expiryMonth,
          expiryYear
        });
        
        if (gpResult.success) {
          cardRef = gpResult.cardRef;
          payerRef = gpResult.payerRef;
          console.log('✓ Card stored in GP RealVault');
        } else {
          console.warn('⚠ GP storage failed, storing locally:', gpResult.error);
          // Fall back to local storage
          cardRef = `CARD-LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
      }
    } else {
      console.log('⚠ No user logged in, storing locally');
      cardRef = `CARD-LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Store card metadata locally
    const cardData = {
      token: cardRef,
      userId: userId, // Link to user
      gpPayerRef: payerRef || null, // GP customer reference
      gpCardRef: payerRef ? cardRef : null, // GP card reference (only if stored in GP)
      maskedCardNumber,
      cardBrand,
      cardHolderName,
      expiryMonth,
      expiryYear,
      customerEmail: customerEmail || 'N/A',
      createdAt: new Date().toISOString(),
      lastUsed: null,
      cardNumberLast4: cardNumber.slice(-4),
      cardNumberFirst6: cardNumber.slice(0, 6),
      storedInRealvault: !!payerRef // true if stored in GP
    };
    
    saveStoredCard(cardData);
    
    console.log('✅ Card metadata saved');
    
    res.json({
      success: true,
      message: payerRef 
        ? 'Card stored securely in Global Payments RealVault' 
        : 'Card stored locally',
      token: cardRef,
      maskedCardNumber,
      cardBrand,
      realvaultEnabled: !!payerRef
    });
    
  } catch (error) {
    console.error('Error storing card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store card: ' + error.message
    });
  }
});

// Route: Charge a stored card
app.post('/charge-stored-card', async (req, res) => {
  const { token, amount, currency } = req.body;
  
  console.log('\n=== Charging Stored Card ===');
  console.log('Token:', token);
  console.log('Amount:', amount);
  console.log('Currency:', currency);
  
  try {
    // Find the stored card
    const cards = loadStoredCards();
    const card = cards.find(c => c.token === token);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check if card is stored in GP RealVault
    if (!card.storedInRealvault || !card.gpPayerRef || !card.gpCardRef) {
      return res.status(400).json({
        success: false,
        message: 'This card is not stored in Global Payments RealVault. Please save the card again while logged in to enable stored card payments.'
      });
    }
    
    // Use GP RealVault receipt-in to charge the stored card
    console.log('Charging card via GP RealVault...');
    console.log('Payer Ref:', card.gpPayerRef);
    console.log('Card Ref:', card.gpCardRef);
    
    const timestamp = getTimestamp();
    const orderId = `CHARGE-${Date.now()}`;
    const amountInCents = Math.round(amount * 100).toString();
    
    // Build signature for receipt-in request: timestamp.merchantid.orderid.amount.currency.payerref
    const signature = `${timestamp}.${config.merchantId}.${orderId}.${amountInCents}.${currency}.${card.gpPayerRef}`;
    const hash1 = generateSha1Hash(signature);
    const sha1hash = generateSha1Hash(`${hash1}.${config.sharedSecret}`);
    
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<request type="receipt-in" timestamp="${timestamp}">
  <merchantid>${config.merchantId}</merchantid>
  <account>${config.account}</account>
  <orderid>${orderId}</orderid>
  <amount currency="${currency}">${amountInCents}</amount>
  <payerref>${card.gpPayerRef}</payerref>
  <paymentmethod>${card.gpCardRef}</paymentmethod>
  <autosettle flag="1"/>
  <sha1hash>${sha1hash}</sha1hash>
</request>`;

    console.log('=== GP RealVault Charge XML Request ===');
    console.log(xmlRequest);
    
    // Send request to Global Payments
    const response = await axios.post(config.apiUrl, xmlRequest, {
      headers: {
        'Content-Type': 'application/xml'
      }
    });
    
    console.log('=== GP Response ===');
    console.log(response.data);
    
    // Parse response
    const parsedResponse = parseXmlResponse(response.data);
    const isSuccess = parsedResponse.resultCode === '00';
    
    if (!isSuccess) {
      return res.status(400).json({
        success: false,
        resultCode: parsedResponse.resultCode,
        message: parsedResponse.message || 'Payment failed'
      });
    }
    
    // Update card last used timestamp
    const updatedCards = cards.map(c => 
      c.token === token 
        ? { ...c, lastUsed: new Date().toISOString() }
        : c
    );
    fs.writeFileSync(STORED_CARDS_FILE, JSON.stringify(updatedCards, null, 2));
    
    // Save transaction
    const transaction = {
      orderId: orderId,
      timestamp: new Date().toISOString(),
      amount: parseFloat(amount),
      currency: currency,
      cardHolderName: card.cardHolderName,
      maskedCardNumber: card.maskedCardNumber,
      resultCode: parsedResponse.resultCode,
      message: parsedResponse.message,
      success: isSuccess,
      authCode: parsedResponse.authCode,
      pasRef: parsedResponse.pasRef,
      account: config.account,
      userId: card.userId || null, // Link to user if available
      paymentMethod: 'stored-card',
      cardToken: token
    };
    
    saveTransaction(transaction);
    
    console.log('✅ Stored card charged successfully');
    
    res.json({
      success: true,
      orderId: orderId,
      amount: amount,
      currency: currency,
      authCode: parsedResponse.authCode,
      message: parsedResponse.message,
      maskedCardNumber: card.maskedCardNumber
    });
    
  } catch (error) {
    console.error('Error charging stored card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to charge stored card: ' + error.message
    });
  }
});

// Route: Delete a stored card
app.delete('/stored-cards/:token', (req, res) => {
  const { token } = req.params;
  
  try {
    const success = deleteStoredCard(token);
    
    if (success) {
      res.json({
        success: true,
        message: 'Card deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete card'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete card: ' + error.message
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
  const { amount, currency, cardHolderName, customerEmail, hppType } = req.body;
  
  logger.info('HPP token generation requested', { amount, currency, hppType });
  
  // Validate input
  if (!amount || !currency) {
    logger.warn('HPP token generation failed: Missing required fields');
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
  
  logger.logHppRequest({
    orderId,
    amount: parseFloat(amount),
    currency
  });
  
  console.log('\n=== HPP Token Generation ===');
  console.log('Timestamp:', timestamp);
  console.log('Merchant ID:', config.hppMerchantId);
  console.log('Order ID:', orderId);
  console.log('Amount:', amountInCents);
  console.log('Currency:', currency);
  console.log('HPP Type:', hppType || 'Not specified');
  console.log('Generated Hash:', signature);
  
  // Determine comment based on HPP type
  let comment1 = 'HPP Payment';
  switch(hppType) {
    case 'lightbox':
      comment1 = 'HPP Lightbox Payment';
      break;
    case 'redirect':
      comment1 = 'HPP Redirect Payment';
      break;
    case 'iframe':
      comment1 = 'HPP iFrame Payment';
      break;
    case 'dropin':
      comment1 = 'Drop-In UI Payment';
      break;
    default:
      comment1 = 'HPP Payment';
  }
  
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
    COMMENT1: comment1,
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
  console.log('\n\n========================================');
  console.log('🚨 HPP RESPONSE ENDPOINT HIT!');
  console.log('========================================');
  logger.info('HPP POST response received', { body: req.body });
  console.log('\n=== HPP Response Received ===');
  console.log('Response Data:', req.body);
  console.log('Request Headers:', req.headers);
  console.log('Request IP:', req.ip);
  console.log('========================================\n');
  
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
  
  // Verify signature (skip for client-side responses)
  let isValid = false;
  if (SHA1HASH === 'client-side') {
    // Client-side response (from lightbox/iframe), trust the result from Global Payments
    isValid = RESULT === '00';
    console.log('Client-side HPP response detected');
  } else {
    // Server-side callback from Global Payments
    const expectedSignature = verifyHppResponseSignature(
      TIMESTAMP,
      MERCHANT_ID,
      ORDER_ID,
      RESULT,
      MESSAGE,
      PASREF || '',
      AUTHCODE || ''
    );
    isValid = expectedSignature === SHA1HASH;
  }
  
  console.log('Signature Valid:', isValid);
  logger.info('HPP signature validation', { isValid, result: RESULT });
  
  // Create raw response string for debugging
  const rawResponse = JSON.stringify(req.body, null, 2);
  
  // Log transaction - save ALL HPP transactions, not just successful ones
  const transaction = {
    orderId: ORDER_ID,
    timestamp: new Date().toISOString(),
    amount: AMOUNT ? parseFloat(AMOUNT) / 100 : 0,
    currency: CURRENCY || 'EUR',
    cardHolderName: 'HPP Payment',
    maskedCardNumber: 'N/A',
    resultCode: RESULT,
    message: MESSAGE || 'No message',
    success: RESULT === '00' && isValid,
    authCode: AUTHCODE || '',
    pasRef: PASREF || '',
    account: config.hppAccount,
    type: 'hpp',
    signatureValid: isValid,
    rawResponse: rawResponse
  };
  
  console.log('Saving HPP transaction:', JSON.stringify(transaction, null, 2));
  saveHppTransaction(transaction); // Save to HPP-specific file
  console.log('HPP Transaction saved to hpp-transactions.json');
  logger.info('HPP transaction saved', { orderId: ORDER_ID, success: transaction.success });
  
  // Log HPP response
  logger.logHppResponse({
    orderId: ORDER_ID,
    result: RESULT,
    valid: isValid
  });
  
  // Build result URL with parameters - only include defined values
  const params = new URLSearchParams();
  if (RESULT !== undefined) params.append('result', RESULT);
  if (MESSAGE !== undefined) params.append('message', MESSAGE);
  if (ORDER_ID !== undefined) params.append('orderId', ORDER_ID);
  if (AUTHCODE) params.append('authCode', AUTHCODE);
  if (PASREF) params.append('pasRef', PASREF);
  params.append('valid', isValid.toString());
  if (AMOUNT !== undefined) {
    params.append('amount', (parseFloat(AMOUNT) / 100).toFixed(2));
  } else {
    params.append('amount', '0');
  }
  if (CURRENCY) params.append('currency', CURRENCY);
  
  const resultUrl = `/hpp-result.html?${params.toString()}`;
  
  // Return simple HTML with meta redirect (more compatible with HPP)
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="refresh" content="0;url=${resultUrl}">
      <title>Payment Complete</title>
    </head>
    <body>
      <p>Payment processed. Redirecting...</p>
      <script>window.location.href = '${resultUrl}';</script>
    </body>
    </html>
  `);
});

// Route: Handle HPP response (GET for testing)
app.get('/hpp-response', (req, res) => {
  logger.info('HPP GET response received', { query: req.query });
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
  logger.info('HPP signature validation (GET)', { isValid, result: RESULT });
  
  // Create raw response string for debugging
  const rawResponse = JSON.stringify(req.query, null, 2);
  
  // Log transaction - save ALL HPP transactions, not just successful ones
  const transaction = {
    orderId: ORDER_ID,
    timestamp: new Date().toISOString(),
    amount: AMOUNT ? parseFloat(AMOUNT) / 100 : 0,
    currency: CURRENCY || 'N/A',
    cardHolderName: 'HPP Payment',
    maskedCardNumber: 'N/A',
    resultCode: RESULT,
    message: MESSAGE || 'No message',
    success: RESULT === '00' && isValid,
    authCode: AUTHCODE || '',
    pasRef: PASREF || '',
    account: config.hppAccount,
    type: 'hpp',
    signatureValid: isValid,
    rawResponse: rawResponse
  };
  
  saveTransaction(transaction);
  logger.info('HPP transaction saved (GET)', { orderId: ORDER_ID, success: transaction.success });
  
  // Log HPP response
  logger.logHppResponse({
    orderId: ORDER_ID,
    result: RESULT,
    valid: isValid
  });
  
  // Return HTML that redirects properly (same as POST handler)
  const params = new URLSearchParams();
  if (RESULT !== undefined) params.append('result', RESULT);
  if (MESSAGE !== undefined) params.append('message', MESSAGE);
  if (ORDER_ID !== undefined) params.append('orderId', ORDER_ID);
  if (AUTHCODE) params.append('authCode', AUTHCODE);
  if (PASREF) params.append('pasRef', PASREF);
  params.append('valid', isValid.toString());
  if (AMOUNT !== undefined) {
    params.append('amount', (parseFloat(AMOUNT) / 100).toFixed(2));
  } else {
    params.append('amount', '0');
  }
  if (CURRENCY) params.append('currency', CURRENCY);
  
  const resultUrl = `/hpp-result.html?${params.toString()}`;
  
  // Return HTML that handles redirect in all contexts
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Processing Payment...</title>
    </head>
    <body>
      <script>
        // If in iframe, redirect parent window
        if (window.parent !== window) {
          window.parent.location.href = '${resultUrl}';
        } else {
          // If full page redirect
          window.location.href = '${resultUrl}';
        }
      </script>
      <p>Processing payment result...</p>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Global Payments API Server started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
  logger.info(`Configuration loaded from environment variables`);
  
  console.log(`Global Payments API Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Configuration loaded from environment variables`);
  console.log(`  API Merchant ID: ${config.merchantId}`);
  console.log(`  API Account: ${config.account}`);
  console.log(`  HPP Merchant ID: ${config.hppMerchantId}`);
  console.log(`  HPP Account: ${config.hppAccount}`);
  console.log('\n⚠️  IMPORTANT: API credentials are different from HPP credentials!');
  console.log('If you haven\'t registered for API access, contact Global Payments support.\n');
});
