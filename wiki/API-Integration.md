# API Integration Guide

## Overview

The Direct API integration allows you to process payments server-to-server with full control over the payment flow and UI.

## How It Works

### Payment Flow

1. **User fills payment form** → Frontend collects card details
2. **Data sent to your server** → Server receives payment data via POST
3. **Build XML request** → Server creates XML authorization request
4. **Generate signature** → SHA1 hash with shared secret for security
5. **Send to Global Payments** → POST request to API endpoint
6. **Process response** → Parse XML response
7. **Return result** → Display outcome to user

### Signature Generation

The application generates a SHA1 signature for each request:

```
Step 1: SHA1(timestamp.merchantid.orderid.amount.currency.cardnumber)
Step 2: SHA1(hash1.sharedsecret)
```

Example in Node.js:

```javascript
const crypto = require('crypto');

function generateSignature(timestamp, merchantId, orderId, amount, currency, cardNumber, secret) {
    // First hash
    const hash1 = crypto
        .createHash('sha1')
        .update(`${timestamp}.${merchantId}.${orderId}.${amount}.${currency}.${cardNumber}`)
        .digest('hex');
    
    // Second hash with secret
    const hash2 = crypto
        .createHash('sha1')
        .update(`${hash1}.${secret}`)
        .digest('hex');
    
    return hash2;
}
```

## API Request Format

### Authorization Request

```xml
<?xml version="1.0" encoding="UTF-8"?>
<request type="auth" timestamp="YYYYMMDDHHMMSS">
  <merchantid>YOUR_MERCHANT_ID</merchantid>
  <account>internet</account>
  <orderid>ORDER-123456789</orderid>
  <amount currency="EUR">1000</amount>
  <card>
    <number>4263970000005262</number>
    <expdate>1225</expdate>
    <chname>John Doe</chname>
    <type>VISA</type>
    <cvn>
      <number>123</number>
      <presind>1</presind>
    </cvn>
  </card>
  <autosettle flag="1"/>
  <sha1hash>generated_signature</sha1hash>
</request>
```

### Amount Format

Amounts are in the smallest currency unit (cents/pence):
- $10.00 = 1000
- €25.50 = 2550
- £100.00 = 10000

### Timestamp Format

Format: `YYYYMMDDHHMMSS`

Example: `20241105143000` (Nov 5, 2024, 2:30:00 PM)

```javascript
function getTimestamp() {
    const now = new Date();
    return now.toISOString()
        .replace(/[-:T]/g, '')
        .substring(0, 14);
}
```

## Response Handling

### Success Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response timestamp="20241105143001">
  <merchantid>YOUR_MERCHANT_ID</merchantid>
  <account>internet</account>
  <orderid>ORDER-123456789</orderid>
  <result>00</result>
  <message>AUTH CODE: 12345</message>
  <pasref>14521823742687291</pasref>
  <authcode>12345</authcode>
  <cvnresult>M</cvnresult>
  <avspostcoderesponse>M</avspostcoderesponse>
  <avsaddressresponse>M</avsaddressresponse>
  <sha1hash>response_signature</sha1hash>
</response>
```

### Error Response

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response timestamp="20241105143001">
  <merchantid>YOUR_MERCHANT_ID</merchantid>
  <result>101</result>
  <message>DECLINED</message>
  <orderid>ORDER-123456789</orderid>
</response>
```

## Supported Currencies

- EUR (Euro)
- USD (US Dollar)
- GBP (British Pound)
- Many others - check with Global Payments

## Card Types Supported

- Visa
- Mastercard
- American Express
- Discover
- Diners Club
- JCB

## Test Cards

| Card Number | Type | Result | CVV |
|-------------|------|--------|-----|
| 4263970000005262 | Visa | Success | 123 |
| 4000120000001154 | Visa | Declined | 123 |
| 5425230000004415 | Mastercard | Success | 123 |
| 374101000000608 | Amex | Success | 1234 |

Expiry: Any future date (e.g., 12/25)

## Common Response Codes

See [API Response Codes](./Response-Codes.md) for complete list.

## Best Practices

1. **Always use HTTPS** in production
2. **Never log full card numbers** - mask all but last 4 digits
3. **Validate input** on both client and server
4. **Store only last 4 digits** of card numbers
5. **Implement rate limiting** to prevent abuse
6. **Use unique order IDs** for each transaction
7. **Verify response signatures** for security
8. **Handle timeouts gracefully** (30 second timeout recommended)

## PCI Compliance

⚠️ **Important**: Direct API integration requires PCI DSS compliance because card data touches your server.

Requirements:
- Annual PCI DSS assessment
- Secure server configuration
- Encrypted data transmission (HTTPS)
- Secure coding practices
- Regular security audits

Consider using [HPP Integration](./HPP-Integration.md) if PCI compliance is a concern.

## Code Example

```javascript
const express = require('express');
const crypto = require('crypto');
const xml2js = require('xml2js');

app.post('/process-payment', async (req, res) => {
    const { amount, currency, cardNumber, cardholderName, expiryMonth, expiryYear, cvv } = req.body;
    
    // Generate order ID
    const orderId = `ORDER-${Date.now()}`;
    
    // Generate timestamp
    const timestamp = getTimestamp();
    
    // Format expiry date
    const expiryDate = `${expiryMonth}${expiryYear.slice(-2)}`;
    
    // Convert amount to cents
    const amountInCents = Math.round(parseFloat(amount) * 100);
    
    // Generate signature
    const signature = generateSignature(
        timestamp,
        process.env.API_MERCHANT_ID,
        orderId,
        amountInCents,
        currency,
        cardNumber,
        process.env.API_SHARED_SECRET
    );
    
    // Build XML request
    const xmlRequest = buildXmlRequest({
        timestamp,
        merchantId: process.env.API_MERCHANT_ID,
        account: process.env.API_ACCOUNT,
        orderId,
        amount: amountInCents,
        currency,
        cardNumber,
        expiryDate,
        cardholderName,
        cvv,
        signature
    });
    
    // Send to Global Payments
    const response = await sendToGlobalPayments(xmlRequest);
    
    // Parse and return response
    res.json(response);
});
```

## Next Steps

- [Troubleshooting Guide](./Troubleshooting.md)
- [Security Best Practices](./Security.md)
- [Response Codes Reference](./Response-Codes.md)
