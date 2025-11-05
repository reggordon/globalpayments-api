# Global Payments API Integration

A Node.js application for direct server-to-server integration with Global Payments sandbox environment.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start server
npm start
```

Open http://localhost:3001

## Features

- � Direct API and HPP integration
- � Secure server-side processing
- 📊 Transaction history tracking
- 🎨 Modern, responsive UI
- 🔄 Refund support

## Configuration

Create a `.env` file with your Global Payments credentials:

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# API Credentials
API_MERCHANT_ID=your_merchant_id
API_ACCOUNT=your_account
API_SHARED_SECRET=your_secret
API_URL=https://api.sandbox.realexpayments.com/epage-remote.cgi

# HPP Credentials
HPP_MERCHANT_ID=your_hpp_merchant_id
HPP_ACCOUNT=your_hpp_account
HPP_SHARED_SECRET=your_hpp_secret
HPP_SANDBOX_URL=https://pay.sandbox.realexpayments.com/pay
HPP_RESPONSE_URL=http://localhost:3001/hpp-response
```

⚠️ **Never commit `.env` to version control!**

## Test Cards

| Card Number | Result | CVV |
|-------------|--------|-----|
| 4263970000005262 | Success | 123 |
| 4000120000001154 | Declined | 123 |

Expiry: Any future date

## Documentation

For detailed documentation, see the [Wiki](./wiki):

- [Installation Guide](./wiki/Installation.md)
- [API Integration](./wiki/API-Integration.md)
- [HPP Integration](./wiki/HPP-Integration.md)
- [Security Best Practices](./wiki/Security.md)
- [Troubleshooting](./wiki/Troubleshooting.md)
- [API Response Codes](./wiki/Response-Codes.md)

```

## Project Structure

```
globalpayments-api/
├── server.js              # Express server
├── logger.js              # Winston logging
├── .env                   # Your credentials (not in git)
├── public/                # Frontend files
│   ├── css/              # Stylesheets
│   └── js/               # Client scripts
├── data/                  # Transaction storage
└── logs/                  # Application logs
```

## Important Notes

### API vs HPP Credentials

**API** and **HPP** use different credentials. If you get error 504 "no such merchant id":
- You're using HPP credentials for API integration (or vice versa)
- Contact developer@globalpay.com to request API access

### Security

- ⚠️ **PCI DSS compliance required** for handling card data
- Use HTTPS in production
- Never log full card numbers
- Rotate credentials regularly

## Resources

- [Global Payments Developer Portal](https://developer.globalpay.com/)
- [API Documentation](https://developer.globalpay.com/#!/api)
- [Support](mailto:developer@globalpay.com)

## License

MIT

---

⚠️ **Sandbox Only**: This is a demonstration application. Production use requires proper security audit, PCI compliance, and HTTPS implementation.

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

- **Environment Variables**: All sensitive credentials are stored in `.env` file (not committed to git)
- **PCI DSS Compliance**: This integration processes raw card data on your server. You MUST be PCI DSS compliant.
- The `.env` file is in `.gitignore` to prevent accidental commits
- Never share your `.env` file or commit it to version control
- The shared secret must be kept confidential
- Use HTTPS in production (required for PCI compliance)
- Never log full card numbers in production
- Implement proper data encryption
- Consider using tokenization or HPP if PCI compliance is a concern
- Rotate credentials regularly
- Use different credentials for development, staging, and production

## Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `API_MERCHANT_ID` | Your Global Payments API merchant ID | `your_api_merchant_id` |
| `API_ACCOUNT` | API sub-account for transactions | `your_account` |
| `API_SHARED_SECRET` | Secret key for API signature generation | `your_api_secret` |
| `API_URL` | Global Payments API endpoint | `https://api.sandbox.realexpayments.com/epage-remote.cgi` |
| `HPP_MERCHANT_ID` | Your Global Payments HPP merchant ID | `your_hpp_merchant_id` |
| `HPP_ACCOUNT` | HPP sub-account | `your_hpp_account` |
| `HPP_SHARED_SECRET` | Secret key for HPP signature generation | `your_hpp_secret` |
| `HPP_SANDBOX_URL` | HPP hosted page URL | `https://pay.sandbox.realexpayments.com/pay` |
| `HPP_RESPONSE_URL` | URL where HPP redirects after payment | `http://localhost:3001/hpp-response` |

**Note:** API and HPP credentials are separate and may have different values.

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

### Environment variables not loaded
```
Error: Missing required environment variables
```

**Solution:**
1. Ensure `.env` file exists in the project root
2. Copy from example: `cp .env.example .env`
3. Fill in all required variables
4. Restart the server

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
- Ensure `.env` file exists and contains all required variables
- Check that port 3001 (or your PORT value) is not already in use
- Verify all dependencies are installed (`npm install`)
- Check for typos in environment variable names

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
