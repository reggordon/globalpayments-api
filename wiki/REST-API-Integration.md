# REST API Integration Guide

## Overview

This guide shows how to integrate Global Payments into your own REST API application or how to consume this server's REST endpoints from another application.

## Option 1: Use This Server as Payment Microservice

The simplest approach is to run this server alongside your application and make HTTP requests to its endpoints.

### Architecture

```
Your REST API → This Payment Server → Global Payments
```

### Example: Node.js/Express App

```javascript
const axios = require('axios');

// Payment microservice URL
const PAYMENT_API = 'http://localhost:3001';

// Process payment from your API
app.post('/your-api/checkout', async (req, res) => {
  try {
    const response = await axios.post(`${PAYMENT_API}/process-payment`, {
      amount: req.body.amount,
      currency: 'EUR',
      cardNumber: req.body.cardNumber,
      cardHolderName: req.body.cardHolderName,
      expiryMonth: req.body.expiryMonth,
      expiryYear: req.body.expiryYear,
      cvv: req.body.cvv
    });
    
    res.json({
      success: response.data.success,
      orderId: response.data.orderId,
      authCode: response.data.authCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Example: Python/Flask App

```python
import requests

PAYMENT_API = 'http://localhost:3001'

@app.route('/checkout', methods=['POST'])
def checkout():
    data = request.get_json()
    
    response = requests.post(f'{PAYMENT_API}/process-payment', json={
        'amount': data['amount'],
        'currency': 'EUR',
        'cardNumber': data['cardNumber'],
        'cardHolderName': data['cardHolderName'],
        'expiryMonth': data['expiryMonth'],
        'expiryYear': data['expiryYear'],
        'cvv': data['cvv']
    })
    
    return response.json()
```

### Example: Java/Spring Boot App

```java
@RestController
public class PaymentController {
    
    private static final String PAYMENT_API = "http://localhost:3001";
    
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestBody PaymentRequest request) {
        RestTemplate restTemplate = new RestTemplate();
        
        Map<String, String> paymentData = new HashMap<>();
        paymentData.put("amount", request.getAmount());
        paymentData.put("currency", "EUR");
        paymentData.put("cardNumber", request.getCardNumber());
        paymentData.put("cardHolderName", request.getCardHolderName());
        paymentData.put("expiryMonth", request.getExpiryMonth());
        paymentData.put("expiryYear", request.getExpiryYear());
        paymentData.put("cvv", request.getCvv());
        
        ResponseEntity<Map> response = restTemplate.postForEntity(
            PAYMENT_API + "/process-payment",
            paymentData,
            Map.class
        );
        
        return ResponseEntity.ok(response.getBody());
    }
}
```

### Example: PHP App

```php
<?php
$paymentApi = 'http://localhost:3001';

function processPayment($paymentData) {
    global $paymentApi;
    
    $data = json_encode([
        'amount' => $paymentData['amount'],
        'currency' => 'EUR',
        'cardNumber' => $paymentData['cardNumber'],
        'cardHolderName' => $paymentData['cardHolderName'],
        'expiryMonth' => $paymentData['expiryMonth'],
        'expiryYear' => $paymentData['expiryYear'],
        'cvv' => $paymentData['cvv']
    ]);
    
    $options = [
        'http' => [
            'header'  => "Content-Type: application/json\r\n",
            'method'  => 'POST',
            'content' => $data
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($paymentApi . '/process-payment', false, $context);
    
    return json_decode($result, true);
}
?>
```

## Option 2: Copy Payment Logic to Your API

If you want to integrate the payment processing directly into your application, copy these core functions from `server.js`:

### Core Functions to Extract

1. **Signature Generation**
```javascript
function generateSha1Hash(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function generateSignature(timestamp, merchantId, orderId, amount, currency, cardNumber, sharedSecret) {
  const step1 = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}.${cardNumber}`;
  const hash1 = generateSha1Hash(step1);
  const step2 = `${hash1}.${sharedSecret}`;
  return generateSha1Hash(step2);
}
```

2. **Timestamp Generation**
```javascript
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
}
```

3. **XML Request Builder**
```javascript
function buildAuthRequest(orderData, config) {
  const { orderId, amount, currency, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, timestamp } = orderData;
  
  const yearTwoDigits = expiryYear.length > 2 ? expiryYear.slice(-2) : expiryYear;
  const monthTwoDigits = expiryMonth.padStart(2, '0');
  
  const signature = generateSignature(
    timestamp,
    config.merchantId,
    orderId,
    amount,
    currency,
    cardNumber,
    config.sharedSecret
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
```

4. **Card Brand Detection**
```javascript
function getCardBrand(cardNumber) {
  const firstDigit = cardNumber.charAt(0);
  const firstTwoDigits = cardNumber.substring(0, 2);
  
  if (firstDigit === '4') return 'VISA';
  if (['51', '52', '53', '54', '55'].includes(firstTwoDigits) || 
      (parseInt(firstTwoDigits) >= 22 && parseInt(firstTwoDigits) <= 27)) return 'MC';
  if (['34', '37'].includes(firstTwoDigits)) return 'AMEX';
  if (firstTwoDigits === '36' || firstTwoDigits === '38' || firstDigit === '3') return 'DINERS';
  if (firstTwoDigits === '35') return 'JCB';
  if (['6011', '65'].includes(cardNumber.substring(0, 4)) || cardNumber.startsWith('644') || 
      cardNumber.startsWith('645') || cardNumber.startsWith('646') || 
      cardNumber.startsWith('647') || cardNumber.startsWith('648') || 
      cardNumber.startsWith('649')) return 'DISCOVER';
  
  return 'UNKNOWN';
}
```

5. **XML Response Parser**
```javascript
function parseXmlResponse(xmlString) {
  const resultMatch = xmlString.match(/<result>([^<]+)<\/result>/);
  const messageMatch = xmlString.match(/<message>([^<]+)<\/message>/);
  const orderIdMatch = xmlString.match(/<orderid>([^<]+)<\/orderid>/);
  const authCodeMatch = xmlString.match(/<authcode>([^<]+)<\/authcode>/);
  const pasRefMatch = xmlString.match(/<pasref>([^<]+)<\/pasref>/);
  const timestampMatch = xmlString.match(/<timestamp>([^<]+)<\/timestamp>/);
  
  return {
    resultCode: resultMatch ? resultMatch[1] : null,
    message: messageMatch ? messageMatch[1] : null,
    orderId: orderIdMatch ? orderIdMatch[1] : null,
    authCode: authCodeMatch ? authCodeMatch[1] : null,
    pasRef: pasRefMatch ? pasRefMatch[1] : null,
    timestamp: timestampMatch ? timestampMatch[1] : null
  };
}
```

### Integration Example in Your API

```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Configuration
const config = {
  merchantId: process.env.API_MERCHANT_ID,
  account: process.env.API_ACCOUNT,
  sharedSecret: process.env.API_SHARED_SECRET,
  apiUrl: process.env.API_URL
};

// [Copy all helper functions here]

// Your payment endpoint
app.post('/api/payments/process', async (req, res) => {
  try {
    const { amount, currency, cardNumber, cardHolderName, expiryMonth, expiryYear, cvv } = req.body;
    
    // Generate order data
    const orderId = `ORDER-${Date.now()}`;
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
    }, config);
    
    // Send to Global Payments
    const response = await axios.post(config.apiUrl, xmlRequest, {
      headers: { 'Content-Type': 'application/xml' }
    });
    
    // Parse response
    const parsedResponse = parseXmlResponse(response.data);
    
    // Return result
    res.json({
      success: parsedResponse.resultCode === '00',
      orderId: parsedResponse.orderId,
      authCode: parsedResponse.authCode,
      message: parsedResponse.message
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Session-Based Credentials with REST API

If you want to use session-based credentials (allowing clients to swap credentials), maintain sessions:

```javascript
const session = require('express-session');

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Set custom credentials endpoint
app.post('/api/credentials/set', (req, res) => {
  req.session.customCredentials = {
    apiMerchantId: req.body.apiMerchantId,
    apiSharedSecret: req.body.apiSharedSecret,
    // ... other credentials
  };
  res.json({ success: true });
});

// Get effective config
function getEffectiveConfig(req) {
  const sessionCreds = req.session.customCredentials || {};
  return {
    merchantId: sessionCreds.apiMerchantId || config.merchantId,
    sharedSecret: sessionCreds.apiSharedSecret || config.sharedSecret,
    // ... other fields
  };
}

// Use in payment endpoint
app.post('/api/payments/process', async (req, res) => {
  const effectiveConfig = getEffectiveConfig(req);
  // ... use effectiveConfig instead of config
});
```

## CORS Configuration

If your REST API runs on a different domain/port, enable CORS:

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://your-frontend-domain.com',
  credentials: true // Required for session cookies
}));
```

## Security Best Practices

1. **Never send credentials from frontend** - Always process on server
2. **Use HTTPS in production** - Encrypt all traffic
3. **Validate input** - Check card format, amount, etc.
4. **Log transactions** - Keep audit trail
5. **PCI compliance** - Never log full card numbers
6. **Rate limiting** - Prevent abuse
7. **Authentication** - Require user login where appropriate

## Testing Your Integration

```bash
# Test with curl
curl -X POST http://localhost:3001/process-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10.00",
    "currency": "EUR",
    "cardNumber": "4263970000005262",
    "cardHolderName": "Test User",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cvv": "123"
  }'
```

## Docker Deployment

Run this payment server as a microservice:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

```bash
docker build -t payment-api .
docker run -p 3001:3001 --env-file .env payment-api
```

## Need Help?

- Check `/wiki/API-Integration.md` for detailed API documentation
- See `/wiki/Troubleshooting.md` for common issues
- Review test cards in `/public/test-cards.html`
