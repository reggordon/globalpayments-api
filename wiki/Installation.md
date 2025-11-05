# Installation Guide

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Global Payments sandbox account
- PCI DSS compliance (for handling card data)

## Step-by-Step Installation

### 1. Clone or Navigate to Project

```bash
cd /Users/reggordon/github/globalpayments-api
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- express
- dotenv
- winston
- xml2js
- Other required dependencies

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Global Payments API Credentials
API_MERCHANT_ID=your_merchant_id
API_ACCOUNT=your_account
API_SHARED_SECRET=your_secret
API_URL=https://api.sandbox.realexpayments.com/epage-remote.cgi

# Global Payments HPP Credentials
HPP_MERCHANT_ID=your_hpp_merchant_id
HPP_ACCOUNT=your_hpp_account
HPP_SHARED_SECRET=your_hpp_secret
HPP_SANDBOX_URL=https://pay.sandbox.realexpayments.com/pay
HPP_RESPONSE_URL=http://localhost:3001/hpp-response
```

### 4. Verify Installation

Start the server:

```bash
npm start
```

You should see:
```
Server starting...
Environment: development
Port: 3001
Server running on http://localhost:3001
```

### 5. Test the Application

Open your browser and navigate to:
```
http://localhost:3001
```

## Getting Sandbox Credentials

### For API Integration

1. Sign up at: https://developer.globalpay.com/
2. Contact developer@globalpay.com
3. Request: "Please enable XML/REST API access for my sandbox account"
4. You'll receive:
   - API Merchant ID
   - API Shared Secret
   - Account name (usually "internet")

### For HPP Integration

HPP credentials are provided separately and may be different from API credentials. Check your Global Payments dashboard or contact support.

## Development Mode

For auto-reload during development:

```bash
npm run dev
```

Or use nodemon:

```bash
npm install -g nodemon
nodemon server.js
```

## Troubleshooting Installation

### Port Already in Use

If port 3001 is already in use, change it in `.env`:

```env
PORT=3002
```

### Missing Dependencies

If you get module errors:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Loaded

Ensure `.env` file is:
- In the project root directory
- Named exactly `.env` (not `.env.txt`)
- Contains all required variables
- Has no syntax errors

### Permission Issues

On macOS/Linux, you may need to fix permissions:

```bash
chmod 644 .env
chmod 755 node_modules
```

## Next Steps

- [API Integration Guide](./API-Integration.md)
- [HPP Integration Guide](./HPP-Integration.md)
- [Security Best Practices](./Security.md)
