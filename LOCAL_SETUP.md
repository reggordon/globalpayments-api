# Local Development Setup Guide

Complete step-by-step guide for running this Global Payments integration on your local machine.

## Prerequisites

Before you begin, make sure you have:

### 1. Node.js (Required)

Check if you have Node.js installed:
```bash
node --version
```

**Required**: Version 18.0.0 or higher

If not installed:
- **macOS**: `brew install node`
- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **Linux**: Use your package manager (e.g., `apt install nodejs`)

### 2. Git (Required)

Check if you have Git:
```bash
git --version
```

If not installed:
- **macOS**: `brew install git` or comes with Xcode
- **Windows**: Download from [git-scm.com](https://git-scm.com/)
- **Linux**: `apt install git` or `yum install git`

### 3. Global Payments Account (Required)

You need Global Payments sandbox credentials:

1. Go to [developer.globalpay.com](https://developer.globalpay.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Get your credentials from the "API Settings" and "HPP Settings" sections

You'll need:
- API Merchant ID
- API Account Name (usually "internet")
- API Shared Secret
- HPP Merchant ID
- HPP Shared Secret

**⚠️ Important**: API and HPP often have different credentials!

### 4. Text Editor (Recommended)

Any editor works, but popular choices:
- **VS Code**: [code.visualstudio.com](https://code.visualstudio.com/)
- **Sublime Text**: [sublimetext.com](https://www.sublimetext.com/)
- **Atom**: [atom.io](https://atom.io/)
- Or use terminal editors: `nano`, `vim`, etc.

## Step-by-Step Installation

### Step 1: Open Terminal

- **macOS**: Press `Cmd + Space`, type "Terminal", press Enter
- **Windows**: Press `Win + R`, type "cmd", press Enter
- **Linux**: Press `Ctrl + Alt + T`

### Step 2: Choose Installation Directory

Navigate to where you want to install:
```bash
# Go to your home directory
cd ~

# Or create a projects folder
mkdir -p ~/projects
cd ~/projects
```

### Step 3: Clone the Repository

```bash
git clone https://github.com/reggordon/globalpayments-api.git
```

**Expected output**:
```
Cloning into 'globalpayments-api'...
remote: Enumerating objects: 150, done.
remote: Counting objects: 100% (150/150), done.
...
Receiving objects: 100% (150/150), done.
```

### Step 4: Enter the Directory

```bash
cd globalpayments-api
```

### Step 5: Install Dependencies

```bash
npm install
```

**Expected output**:
```
added 150 packages in 30s
```

This downloads all required packages (Express, Winston logger, etc.)

**Time**: Takes 30-90 seconds depending on your internet speed

### Step 6: Create Configuration File

```bash
# Copy the example file
cp .env.example .env
```

**What this does**: Creates your personal configuration file from the template

### Step 7: Edit Configuration

Open `.env` in your text editor:

```bash
# Using VS Code
code .env

# Or nano (terminal editor)
nano .env

# Or any editor you prefer
```

You'll see:
```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

API_MERCHANT_ID=your_api_merchant_id
API_ACCOUNT=internet
API_SHARED_SECRET=your_api_shared_secret
API_URL=https://api.sandbox.realexpayments.com/epage-remote.cgi

HPP_MERCHANT_ID=your_hpp_merchant_id
HPP_ACCOUNT=internet
HPP_SHARED_SECRET=your_hpp_shared_secret
HPP_SANDBOX_URL=https://pay.sandbox.realexpayments.com/pay
HPP_RESPONSE_URL=http://localhost:3001/hpp-response
```

**Replace these values**:

1. `API_MERCHANT_ID` → Your API Merchant ID from Global Payments
2. `API_SHARED_SECRET` → Your API Shared Secret
3. `HPP_MERCHANT_ID` → Your HPP Merchant ID
4. `HPP_SHARED_SECRET` → Your HPP Shared Secret

**Leave these as-is**:
- `PORT=3001`
- `NODE_ENV=development`
- All the URLs
- `API_ACCOUNT=internet`
- `HPP_ACCOUNT=internet`

Save and close the file:
- **nano**: Press `Ctrl + X`, then `Y`, then `Enter`
- **VS Code**: Press `Cmd/Ctrl + S`, then close

### Step 8: Start the Server

```bash
npm start
```

**Expected output**:
```
Global Payments API Server started on port 3001
Environment: development
Configuration loaded from environment variables
  API Merchant ID: your_merchant_id
  API Account: internet
  HPP Merchant ID: your_hpp_merchant_id
  HPP Account: internet

Global Payments API Server running on http://localhost:3001
```

✅ **Success!** Your server is now running!

**⚠️ Keep this terminal window open** - closing it will stop the server.

### Step 9: Test in Browser

Open your web browser and go to:

```
http://localhost:3001
```

You should see the Global Payments integration homepage with links to:
- Direct API Payment
- HPP Integration Options
- Transaction History

## Making Your First Test Payment

### Option A: Direct API Payment (Easiest)

1. **Navigate to the API payment page**:
   ```
   http://localhost:3001/index.html
   ```

2. **Fill in the form**:
   - **Amount**: `10.00`
   - **Currency**: `EUR` (or your preferred currency)
   - **Card Number**: `4263970000005262`
   - **Expiry Date**: `12/26` (any future date)
   - **CVV**: `123`
   - **Cardholder Name**: `Test User`
   - **Email**: `test@example.com`

3. **Click "Process Payment"**

4. **Expected result**:
   - ✅ "Payment Successful!" message appears
   - Authorization code displayed
   - Order ID shown

5. **View the transaction**:
   ```
   http://localhost:3001/transactions.html
   ```

### Option B: HPP Lightbox (Popup Payment)

1. **Navigate to HPP Lightbox**:
   ```
   http://localhost:3001/hpp-lightbox.html
   ```

2. **Enter amount**: `10.00`

3. **Click "Pay with Lightbox"**

4. **A popup will appear** with Global Payments hosted form

5. **Enter test card details**:
   - Card: `4263970000005262`
   - Expiry: `12/26`
   - CVV: `123`
   - Name: `Test User`

6. **Submit payment**

7. **Popup closes** and you see success message

8. **View HPP transactions**:
   ```
   http://localhost:3001/hpp-transactions.html
   ```

## Understanding the File Structure

```
globalpayments-api/
├── .env                      # ← YOUR credentials (don't share!)
├── .env.example              # ← Template for .env
├── server.js                 # ← Main server code
├── package.json              # ← Dependencies list
├── README.md                 # ← Project overview
├── SETUP.md                  # ← Detailed setup guide
├── LOCAL_SETUP.md            # ← This file
│
├── public/                   # ← Web pages and assets
│   ├── index.html           # ← Direct API payment page
│   ├── hpp-lightbox.html    # ← HPP lightbox demo
│   ├── hpp-redirect.html    # ← HPP redirect demo
│   ├── hpp-iframe.html      # ← HPP iframe demo
│   ├── transactions.html    # ← API transaction history
│   ├── hpp-transactions.html # ← HPP transaction history
│   ├── css/                 # ← Stylesheets
│   └── js/                  # ← JavaScript files
│
├── data/                     # ← Created automatically when first transaction
│   ├── transactions.json    # ← API transactions saved here
│   └── hpp-transactions.json # ← HPP transactions saved here
│
└── logs/                     # ← Created automatically
    └── app.log              # ← Server logs
```

## Common Commands

### Start the server
```bash
npm start
```

### Stop the server
Press `Ctrl + C` in the terminal where server is running

### View recent logs
```bash
tail -f logs/app.log
```

### Clear transaction history
```bash
rm data/transactions.json
rm data/hpp-transactions.json
```

### Update code from GitHub
```bash
git pull origin master
npm install  # Install any new dependencies
```

## Troubleshooting

### Server won't start

**Error**: `Error: Cannot find module 'express'`
```bash
# Solution: Install dependencies
npm install
```

**Error**: `Error: listen EADDRINUSE :::3001`
```bash
# Solution: Port 3001 is already in use
# Find and kill the process using the port
lsof -ti:3001 | xargs kill -9
# Or change PORT in .env to 3002
```

**Error**: `Cannot read environment variables`
```bash
# Solution: Make sure .env file exists
ls -la .env
# If missing, create it:
cp .env.example .env
# Then edit with your credentials
```

### Payment fails

**Error**: "No such merchant id" (504)
- **Check**: Are you using the correct credentials?
- **Check**: API credentials for API pages, HPP credentials for HPP pages
- **Contact**: developer@globalpay.com to verify API access

**Error**: "Invalid signature" (509)
- **Check**: Is your shared secret correct?
- **Check**: No extra spaces in .env file
- **Try**: Copy-paste credentials again from GP dashboard

**Error**: Card declined
- **Try**: Use test card `4263970000005262` with CVV `123`
- **Check**: You're in sandbox mode (not production)

### Page won't load

**Error**: "Cannot GET /"
```bash
# Solution: Make sure you're accessing the right URL
# Try: http://localhost:3001/index.html
# Not: http://localhost:3001/
```

**Error**: Page loads but no payment form
- **Check**: Browser console for JavaScript errors (F12 → Console tab)
- **Check**: Are all .js files loading? (F12 → Network tab)

### Transactions not saving

**Error**: "ENOENT: no such file or directory"
```bash
# Solution: Create data directory
mkdir -p data
chmod 755 data
```

**Check**: File permissions
```bash
ls -la data/
# Should show writable permissions
```

## Development Tips

### Watch for changes (Auto-reload)

Install nodemon for automatic server restart on file changes:
```bash
npm install -g nodemon
nodemon server.js
```

### View real-time logs

In a second terminal window:
```bash
cd ~/projects/globalpayments-api
tail -f logs/app.log
```

### Test with curl

Test API endpoint directly:
```bash
curl http://localhost:3001/transactions/stats | json_pp
```

### Browser Developer Tools

Press `F12` in your browser to:
- View JavaScript console errors
- Inspect network requests
- Debug payment flows

## Next Steps

Once everything works locally:

1. ✅ Test all payment methods (API, HPP Lightbox, Redirect, Iframe)
2. ✅ Review transaction history features
3. ✅ Test with different test cards (success, decline)
4. ✅ Familiarize yourself with the code structure
5. ✅ Read DEPLOYMENT.md if you want to deploy online

## Getting Help

### Documentation
- **Global Payments Docs**: https://developer.globalpay.com/
- **API Reference**: https://developer.globalpay.com/#!/api
- **Test Cards**: https://developer.globalpay.com/test-card-numbers

### Support
- **Global Payments Support**: developer@globalpay.com
- **GitHub Issues**: https://github.com/reggordon/globalpayments-api/issues

### Quick Checklist

Before asking for help, verify:
- [ ] Node.js version 18+ installed (`node --version`)
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file exists and has your credentials
- [ ] No extra spaces or quotes in credential values
- [ ] Server starts without errors
- [ ] Can access http://localhost:3001/index.html
- [ ] Using test card `4263970000005262`

## Success Criteria

You're all set when:
- ✅ Server starts without errors
- ✅ Can see payment forms in browser
- ✅ Test payment succeeds
- ✅ Transaction appears in history
- ✅ Can export transactions to CSV

**Congratulations!** You now have a working Global Payments integration running locally!
