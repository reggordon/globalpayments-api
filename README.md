# Global Payments API Integration

A Node.js application that provides direct server-to-server API integration with Global Payments sandbox environment. This application processes payments directly through the Global Payments REST API.

## ⚠️ IMPORTANT NOTICE

**This integration requires API-specific credentials that are different from HPP credentials.**

If you receive error **504 "There is no such merchant id"**, your merchant account is not enabled for API access. You must:

1. Contact Global Payments support: **developer@globalpay.com**
2. Request: "Please enable XML/REST API access for my sandbox account"
3. Wait for API credentials or confirmation that your account is API-enabled

**HPP credentials will NOT work with this integration.** They are separate systems with different authentication.

## Features

- 🔐 Direct API integration with signature generation
- 💳 Support for multiple currencies (EUR, USD, GBP)
- 🎨 Clean, modern user interface
- ✅ Real-time payment processing
- 📊 Detailed transaction responses
- 🔒 Secure server-side card processing

## Differences from HPP Integration

| Feature | API Integration | HPP Integration |
|---------|----------------|-----------------|
| Card Data | Handled on your server | Handled by Global Payments |
| PCI Compliance | Your responsibility | Global Payments handles it |
| User Experience | Seamless, no redirect | Redirects to payment page |
| Control | Full control over UI/UX | Limited customization |
| Complexity | More complex | Simpler to implement |

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Global Payments sandbox account credentials
- **PCI DSS compliance** (required for handling card data)

## Installation

1. Navigate to the project directory:
```bash
cd /Users/reggordon/github/globalpayments-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure your credentials:
```bash
cp config.json.example config.json
```

4. Edit `config.json` and add your Global Payments sandbox credentials:
```json
{
  "merchantId": "YOUR_MERCHANT_ID",
  "account": "internet",
  "sharedSecret": "YOUR_SHARED_SECRET",
  "apiUrl": "https://api.sandbox.realexpayments.com/epage-remote.cgi"
}
```

## Getting Your Sandbox Credentials

**⚠️ IMPORTANT: API credentials are different from HPP credentials!**

To use the API integration, you need to register for API access:

1. Sign up for a Global Payments sandbox account at: https://developer.globalpay.com/
2. **Request API access** - This is separate from HPP access
3. Once approved, you'll receive:
   - **API Merchant ID**: Different from your HPP merchant ID
   - **API Shared Secret**: Different from your HPP shared secret
   - **Account**: Usually "internet" for API transactions

**Note:** The same merchant may have different credentials for:
- **HPP Integration** (Hosted Payment Page)
- **API Integration** (Direct XML/REST API)

If you haven't registered for API access yet, contact Global Payments support to enable API access for your sandbox account.

## Usage

1. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3001
```

3. Fill in the payment form:
   - **Amount**: The payment amount (e.g., 10.00)
   - **Currency**: Select your preferred currency
   - **Card Number**: Test card number
   - **Cardholder Name**: Customer name
   - **Expiry Date**: Card expiration (MM/YY)
   - **CVV**: Card security code

4. Click "Process Payment" to submit the transaction

5. Use test cards:
   - **Success**: 4263970000005262
   - **Declined**: 4000120000001154
   - **CVV**: 123
   - **Expiry**: Any future date

## Project Structure

```
globalpayments-api/
├── server.js                  # Express server with API integration
├── package.json               # Node.js dependencies
├── config.json.example        # Example configuration file
├── config.json               # Your actual config (not in git)
├── public/
│   └── index.html            # Payment form and results page
└── README.md                 # This file
```

## How It Works

### Payment Flow

1. **User fills payment form** → Frontend collects card details
2. **Data sent to your server** → Server receives payment data
3. **Build XML request** → Server creates XML auth request
4. **Generate signature** → SHA1 hash with shared secret
5. **Send to Global Payments** → POST request to API endpoint
6. **Process response** → Parse XML response
7. **Return result** → Display outcome to user

### Signature Generation

The application generates a SHA1 signature for each request:

```
Step 1: SHA1(timestamp.merchantid.orderid.amount.currency.cardnumber)
Step 2: SHA1(hash1.sharedsecret)
```

### API Request Format

The application sends XML requests to Global Payments:

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

## Security Notes

⚠️ **CRITICAL Security Considerations:**

- **PCI DSS Compliance**: This integration processes raw card data on your server. You MUST be PCI DSS compliant.
- Never commit `config.json` with real credentials to version control
- The shared secret must be kept confidential
- Use HTTPS in production (required for PCI compliance)
- Never log full card numbers in production
- Implement proper data encryption
- Consider using tokenization or HPP if PCI compliance is a concern

## Configuration Options

### config.json Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `merchantId` | Your Global Payments merchant ID | `"MerchantId123"` |
| `account` | Sub-account for transactions | `"internet"` |
| `sharedSecret` | Secret key for signature generation | `"secret123"` |
| `apiUrl` | Global Payments API endpoint | `"https://api.sandbox.realexpayments.com/epage-remote.cgi"` |

## Test Cards

Use these test cards in the sandbox environment:

| Card Number | Result | CVV | Expiry |
|-------------|--------|-----|--------|
| 4263970000005262 | Successful | 123 | Any future date |
| 4000120000001154 | Declined | 123 | Any future date |

## API Response Codes

| Code | Description |
|------|-------------|
| 00 | Transaction successful |
| 101 | Declined by bank |
| 102 | Referral B |
| 103 | Card reported lost/stolen |
| 200 | Communication error |
| 508 | Duplicate transaction |

## Troubleshooting

### Merchant ID not recognized (Error 504)
```
Result Code: 504
Message: There is no such merchant id
```

**Cause:** Your merchant ID is not enabled for API access or doesn't exist in the API system.

**Solution:**
1. Verify you're using API-specific credentials (not HPP credentials)
2. Contact Global Payments support: developer@globalpay.com
3. Request: "Please enable XML/REST API access for my sandbox merchant account"
4. They will provide API-specific credentials or enable your existing merchant for API access

**Important:** The merchant ID that works for HPP may not work for API. These are separate systems.

### Server won't start
- Ensure `config.json` exists and contains valid JSON
- Check that port 3001 is not already in use
- Verify all dependencies are installed

### Signature verification fails
- Verify your shared secret is correct
- Ensure merchant ID matches your account
- Check for extra spaces in config values

### API request fails
- Confirm the API URL is correct for sandbox
- Verify network connectivity
- Check server logs for detailed error messages

### Card declined
- Use correct test card numbers
- Ensure amount is in cents (e.g., 1000 = 10.00)
- Verify currency is supported

## Development

To modify the application:

1. Edit `server.js` for backend logic
2. Edit `public/index.html` for frontend UI
3. Use `npm run dev` for auto-reload during development
4. Check server console for debug output

## Comparison with HPP

**Use API Integration when:**
- You need full control over payment UI
- You want seamless user experience
- You have PCI DSS compliance
- You need custom payment flows

**Use HPP Integration when:**
- You want to minimize PCI scope
- You prefer simpler implementation
- You're okay with redirect experience
- You want Global Payments to handle card data

## Resources

- [Global Payments Developer Portal](https://developer.globalpay.com/)
- [API Integration Guide](https://developer.globalpay.com/#!/api)
- [XML API Documentation](https://developer.globalpay.com/#!/xml-guide)
- [PCI DSS Information](https://www.pcisecuritystandards.org/)

## License

MIT

## Support

For Global Payments API support, contact: developer@globalpay.com

For issues with this application, please check the troubleshooting section or review the server logs.

## Warning

⚠️ **This is a demonstration application for sandbox testing only.**

Never use this code in production without:
- Proper PCI DSS compliance
- Security audit
- HTTPS implementation
- Input validation and sanitization
- Proper error handling
- Logging and monitoring
- Data encryption at rest and in transit
