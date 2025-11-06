# Global Payments API Integration

A complete, production-ready Node.js application for integrating with Global Payments (Realex). Includes both Direct API and Hosted Payment Page (HPP) implementations.

**🎯 Ready to use with your own Global Payments account!**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/reggordon/globalpayments-api.git
cd globalpayments-api

# Install dependencies
npm install

# Configure with YOUR credentials
cp .env.example .env
# Edit .env with your Global Payments credentials

# Start server
npm start
```

Open http://localhost:3001

**📖 New to this?** See the detailed **[Local Setup Guide](./LOCAL_SETUP.md)** with step-by-step instructions for beginners.

**☁️ Want to deploy?** See **[SETUP.md](./SETUP.md)** for production deployment options.

## What's Included

✅ **Direct API Integration**
- Hosted Fields for secure card entry
- Server-side payment processing  
- Full PCI-compliant card handling

✅ **HPP Integration** (4 implementation modes)
- Lightbox (popup overlay)
- Redirect (full page redirect)
- Iframe (embedded frame)
- Drop-in (full iframe UI)

✅ **Transaction Management**
- Separate history for API and HPP transactions
- Export to CSV
- View raw gateway responses for debugging
- Real-time statistics dashboard

✅ **Card Storage** (Realvault Integration)
- Secure card tokenization
- Save cards for future use
- Charge stored cards
- PCI-compliant storage via Global Payments Realvault
- See **[REALVAULT.md](./REALVAULT.md)** for setup

✅ **Production Ready**
- Automated Google Cloud Run deployment
- Environment-based configuration
- Comprehensive logging with Winston
- Security best practices included

## Getting Started

### For New Users

See **[SETUP.md](./SETUP.md)** for complete setup instructions including:
- How to get Global Payments credentials
- Local development setup
- Testing with sandbox
- Production deployment

### For Quick Deploy

```bash
cp .env.yaml.example .env.yaml
# Edit .env.yaml with your credentials
./deploy.sh
```

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
