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
