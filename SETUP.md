# Setup Guide for Global Payments API Integration

This guide will help you set up and deploy this Global Payments integration with your own credentials.

## Prerequisites

1. **Global Payments Account**: Register at [developer.globalpay.com](https://developer.globalpay.com/)
2. **Node.js**: Version 18 or higher
3. **Git**: For cloning the repository

## Quick Start (Local Development)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/reggordon/globalpayments-api.git

# Navigate into the directory
cd globalpayments-api

# Install dependencies (requires Node.js 18+)
npm install
```

**Expected output**: You should see packages installing. Takes about 30-60 seconds.

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Now open `.env` in your text editor:

```bash
# Use your preferred editor
nano .env
# or
code .env
# or
open .env
```

Replace the placeholder values with **YOUR** Global Payments credentials:

```env
# Server Configuration (leave these as-is for local testing)
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Global Payments API Credentials (Server-to-Server)
API_MERCHANT_ID=your_api_merchant_id        # 👈 Replace with your Merchant ID
API_ACCOUNT=internet                        # 👈 Usually "internet", check your account
API_SHARED_SECRET=your_api_shared_secret    # 👈 Replace with your Secret
API_URL=https://api.sandbox.realexpayments.com/epage-remote.cgi

# Global Payments HPP Credentials (Hosted Payment Page)
HPP_MERCHANT_ID=your_hpp_merchant_id        # 👈 Replace with your HPP Merchant ID
HPP_ACCOUNT=internet                        # 👈 Usually "internet"
HPP_SHARED_SECRET=your_hpp_shared_secret    # 👈 Replace with your HPP Secret
HPP_SANDBOX_URL=https://pay.sandbox.realexpayments.com/pay
HPP_RESPONSE_URL=http://localhost:3001/hpp-response  # 👈 Leave this as-is for local
```

💡 **Tip**: API and HPP credentials are often different! Check your Global Payments dashboard for both.

### 3. Start the Server

```bash
npm start
```

**Expected output**:
```
Global Payments API Server running on http://localhost:3001
Environment: development
Configuration loaded from environment variables
  API Merchant ID: your_merchant_id
  API Account: internet
  HPP Merchant ID: your_hpp_merchant_id
  HPP Account: internet
```

✅ If you see this, you're ready to go!

### 4. Test the Integration

Open your browser to: **http://localhost:3001**

You should see the main payment page with links to:
- Direct API Payment (`/index.html`)
- HPP Options (`/hpp-options.html`)
- Transaction History (`/transactions.html` and `/hpp-transactions.html`)

## Getting Your Global Payments Credentials

### API Credentials (Direct Integration)

1. Log in to [Global Payments Developer Portal](https://developer.globalpay.com/)
2. Navigate to **API Settings**
3. Copy your:
   - Merchant ID
   - Account Name (usually "internet")
   - Shared Secret

⚠️ **Note**: API access requires separate registration. Contact developer@globalpay.com if you don't have API credentials.

### HPP Credentials (Hosted Payment Page)

1. Log in to [Global Payments Developer Portal](https://developer.globalpay.com/)
2. Navigate to **HPP Settings**
3. Copy your:
   - Merchant ID
   - Account Name
   - Shared Secret

**API and HPP credentials are usually different!** You may have HPP access but not API access.

## Features Included

✅ **Direct API Integration**
- Hosted Fields for secure card entry
- Server-side payment processing
- Transaction history with raw gateway responses

✅ **HPP Integration** (4 modes)
- Lightbox (popup overlay)
- Redirect (full page)
- Iframe (embedded)
- Drop-in (full iframe)

✅ **Transaction Management**
- View all API and HPP transactions separately
- Export to CSV
- View raw gateway responses
- Real-time statistics

## Production Deployment (Google Cloud Run)

### Option 1: Automated Script

```bash
# 1. Copy and configure environment for production
cp .env.yaml.example .env.yaml

# 2. Edit .env.yaml with your production credentials
nano .env.yaml

# 3. Run deployment script
./deploy.sh
```

The script will:
- Create Google Cloud project
- Enable required APIs
- Build and deploy your application
- Provide you with a live URL

### Option 2: Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed step-by-step instructions.

### Update HPP Response URL

After first deployment, update `.env.yaml` with your Cloud Run URL:

```yaml
HPP_RESPONSE_URL: "https://your-service-abc123.run.app/hpp-response"
```

Then redeploy:
```bash
./deploy.sh
```

## Testing

### Test Cards (Sandbox)

Use these test card numbers in the sandbox environment:

| Card Number          | Result    | CVV | Expiry         | Use Case                    |
|---------------------|-----------|-----|----------------|----------------------------|
| 4263970000005262    | Success   | 123 | Any future date | Test successful payment    |
| 4000120000001154    | Declined  | 123 | Any future date | Test declined payment      |
| 4012001037141112    | Success   | 123 | Any future date | Alternative success card   |

**Expiry Date**: Use any future date (e.g., 12/2026)  
**CVV**: Use 123 for all test cards  
**Cardholder Name**: Use any name

### Test Workflow

#### Option 1: Direct API Payment
1. Go to http://localhost:3001/index.html
2. Fill in the form:
   - Amount: 10.00
   - Card Number: 4263970000005262
   - Expiry: 12/26
   - CVV: 123
   - Name: Test User
3. Click "Process Payment"
4. You should see "✅ Payment Successful!"
5. View the transaction at http://localhost:3001/transactions.html

#### Option 2: HPP Lightbox
1. Go to http://localhost:3001/hpp-lightbox.html
2. Enter amount: 10.00
3. Click "Pay with Lightbox"
4. In the popup:
   - Card Number: 4263970000005262
   - Expiry: 12/26
   - CVV: 123
   - Name: Test User
5. Complete payment
6. View at http://localhost:3001/hpp-transactions.html

#### Option 3: HPP Redirect
1. Go to http://localhost:3001/hpp-redirect.html
2. Enter amount and click "Pay with Redirect"
3. You'll be taken to Global Payments page
4. Enter test card details
5. Complete payment
6. ⚠️ **Note**: Redirect back may show 404 in sandbox (known issue)
7. Transaction is still saved! Check http://localhost:3001/hpp-transactions.html

### Verify Everything Works

✅ **Checklist**:
- [ ] Server starts without errors
- [ ] Can access http://localhost:3001
- [ ] Direct API payment succeeds
- [ ] HPP Lightbox payment succeeds
- [ ] Transactions appear in history
- [ ] Can export transactions to CSV
- [ ] Can view raw gateway responses

### Common Issues During Local Testing

#### "No such merchant id" (Error 504)
- **Cause**: Wrong credentials or using HPP credentials for API (or vice versa)
- **Fix**: 
  1. Double-check you copied credentials correctly
  2. Verify you're using API credentials for Direct API
  3. Verify you're using HPP credentials for HPP pages
  4. Contact developer@globalpay.com to verify API access

#### "Connection refused"
- **Cause**: Server not running or wrong port
- **Fix**: Make sure `npm start` is running and you're using port 3001

#### "Cannot find module"
- **Cause**: Dependencies not installed
- **Fix**: Run `npm install` again

#### Transactions not saving
- **Cause**: File permissions or data directory doesn't exist
- **Fix**: 
  ```bash
  mkdir -p data
  chmod -R 755 data
  ```

#### HPP shows blank page
- **Cause**: CORS or incorrect HPP URL
- **Fix**: Check console for errors, verify HPP_SANDBOX_URL in .env

## File Structure

```
globalpayments-api/
├── .env.example              # Local environment template
├── .env.yaml.example         # Cloud deployment template
├── server.js                 # Main Express server
├── logger.js                 # Winston logging configuration
├── package.json              # Dependencies
├── Dockerfile                # Container configuration
├── deploy.sh                 # Automated deployment script
├── SETUP.md                  # This file
├── DEPLOYMENT.md             # Detailed deployment guide
├── QUICK_DEPLOY.md           # Quick deployment reference
├── README.md                 # Project overview
├── public/                   # Frontend files
│   ├── index.html           # API payment page
│   ├── hpp-lightbox.html    # HPP lightbox demo
│   ├── hpp-redirect.html    # HPP redirect demo
│   ├── hpp-iframe.html      # HPP iframe demo
│   ├── hpp-dropin.html      # HPP drop-in demo
│   ├── transactions.html    # API transaction history
│   ├── hpp-transactions.html # HPP transaction history
│   ├── css/                 # Stylesheets
│   └── js/                  # Client-side JavaScript
├── data/                     # Transaction storage (created automatically)
│   ├── transactions.json    # API transactions
│   └── hpp-transactions.json # HPP transactions
└── logs/                     # Application logs (created automatically)
```

## Security Considerations

### Development
- ⚠️ Never commit `.env` or `.env.yaml` to version control
- ✅ Use `.env.example` as template only
- ✅ Sandbox credentials are safe for testing

### Production
- ⚠️ **HTTPS required** - Cloud Run provides this automatically
- ⚠️ **PCI DSS compliance** required if storing card data
- ✅ Use Google Cloud Secret Manager for credentials
- ✅ Enable Cloud Armor for DDoS protection
- ✅ Implement rate limiting for API endpoints
- ✅ Rotate credentials regularly

## Troubleshooting

### "No such merchant id" Error (504)
- **Cause**: Using HPP credentials for API integration (or vice versa)
- **Solution**: Verify you're using the correct credentials for each integration type
- **Note**: API access requires separate registration - contact developer@globalpay.com

### Transactions Not Saving
- Check that `data/` directory exists and is writable
- Verify server logs: `npm start` should show transaction saves
- Check file permissions: `chmod -R 755 data/`

### HPP Redirect Shows 404
- This is a known Global Payments sandbox limitation
- Transactions ARE saved successfully
- Check `/hpp-transactions.html` to view results
- Production environment usually works correctly

### Deployment Fails
- Verify Google Cloud CLI installed: `gcloud --version`
- Check billing enabled: https://console.cloud.google.com/billing
- Verify `.env.yaml` exists and is valid YAML format
- Try manual deployment steps in DEPLOYMENT.md

## Support & Resources

- **Global Payments Support**: developer@globalpay.com
- **Documentation**: https://developer.globalpay.com/
- **API Reference**: https://developer.globalpay.com/#!/api
- **Test Cards**: https://developer.globalpay.com/test-card-numbers

## Cost Estimates

### Google Cloud Run (Free Tier)
- **Free**: 2 million requests/month
- **Free**: 360,000 GB-seconds/month
- **Typical Cost**: $0-2/month for low-traffic demo
- **Recommendation**: Set budget alert at $5/month

### Global Payments Sandbox
- **Free**: Unlimited test transactions
- **Production**: Varies by region and volume

## Next Steps

1. ✅ Get your credentials from Global Payments
2. ✅ Test locally with sandbox credentials
3. ✅ Deploy to Cloud Run
4. ✅ Test in production environment
5. ✅ Review security checklist before going live
6. ✅ Set up monitoring and alerts

## License

MIT License - Feel free to use this codebase for your own Global Payments integration!

## Questions?

This is a fully functional, production-ready template. Simply add your credentials and deploy!
