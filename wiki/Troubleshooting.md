# Troubleshooting Guide

## Environment Variable Issues

### Error: Missing required environment variables

**Symptoms:**
```
Error: Missing required environment variables: API_MERCHANT_ID, API_SHARED_SECRET
```

**Solutions:**

1. **Check .env file exists**
```bash
ls -la .env
```

2. **Verify file is in project root**
```bash
pwd
# Should show: /Users/reggordon/github/globalpayments-api
```

3. **Copy from example if missing**
```bash
cp .env.example .env
```

4. **Check file contents**
```bash
cat .env
# Should show all variables
```

5. **Verify no typos in variable names**
- Must be EXACTLY as shown (case-sensitive)
- No spaces around `=` sign
- No quotes around values (unless they contain spaces)

6. **Restart server after changes**
```bash
# Kill existing process
pkill -f "node server.js"

# Start fresh
npm start
```

---

## API Integration Issues

### Error 504: No such merchant id

**Symptoms:**
```
Result Code: 504
Message: There is no such merchant id
```

**Causes:**
- Using HPP credentials for API integration
- Merchant ID not enabled for API access
- Typo in merchant ID

**Solutions:**

1. **Verify you have API credentials** (not just HPP)
```env
# API and HPP have DIFFERENT credentials
API_MERCHANT_ID=your_api_merchant_id    # For direct API
HPP_MERCHANT_ID=your_hpp_merchant_id    # For HPP
```

2. **Request API access**
- Email: developer@globalpay.com
- Subject: "Request XML/REST API Access for Sandbox"
- Include your merchant ID

3. **Check for typos**
- No extra spaces
- Correct case
- Complete ID

4. **Test with known working credentials**
- Contact Global Payments support for test credentials

---

### Error 506: Invalid signature

**Symptoms:**
```
Result Code: 506
Message: Invalid signature
```

**Causes:**
- Incorrect shared secret
- Wrong signature generation logic
- Extra whitespace in config
- Incorrect timestamp format

**Solutions:**

1. **Verify shared secret**
```bash
# Check your .env file
grep API_SHARED_SECRET .env
# No spaces before or after the value
```

2. **Check signature generation order**
```javascript
// Correct order:
const str = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}.${cardNumber}`;
```

3. **Verify timestamp format**
```javascript
// Must be: YYYYMMDDHHMMSS
// Example: 20241105143000
const timestamp = getTimestamp(); // Check this function
```

4. **Test with simple values**
```javascript
// Known working example:
timestamp = '20241105143000';
merchantId = 'testmerchant';
orderId = 'TEST-001';
amount = '1000';
currency = 'EUR';
cardNumber = '4263970000005262';
```

---

### Connection timeout or network errors

**Symptoms:**
```
Error: connect ETIMEDOUT
Error: ECONNREFUSED
```

**Solutions:**

1. **Check API URL**
```env
API_URL=https://api.sandbox.realexpayments.com/epage-remote.cgi
# Must be exactly this for sandbox
```

2. **Verify internet connection**
```bash
ping api.sandbox.realexpayments.com
```

3. **Check firewall settings**
- Allow outbound HTTPS (443)
- No corporate proxy blocking

4. **Increase timeout**
```javascript
const response = await axios.post(url, data, {
    timeout: 30000 // 30 seconds
});
```

---

## HPP Integration Issues

### HPP page won't load

**Symptoms:**
- Blank page after redirect
- JavaScript errors in console
- Infinite loading

**Solutions:**

1. **Check HPP URL**
```env
HPP_SANDBOX_URL=https://pay.sandbox.realexpayments.com/pay
# Must be exactly this
```

2. **Verify all required parameters**
```javascript
// Required:
TIMESTAMP
MERCHANT_ID
ORDER_ID
AMOUNT
CURRENCY
SHA1HASH
```

3. **Check browser console**
- Open Developer Tools (F12)
- Look for JavaScript errors
- Check Network tab for failed requests

4. **Validate signature**
```javascript
// Use exact order:
const str = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}`;
```

---

### HPP response not received

**Symptoms:**
- Payment completes but no redirect
- Response handler never called
- Transaction shows in logs but not in app

**Solutions:**

1. **Verify response URL is accessible**
```bash
curl -X POST http://localhost:3001/hpp-response
# Should not return connection error
```

2. **Check response URL in params**
```javascript
{
    MERCHANT_RESPONSE_URL: 'http://localhost:3001/hpp-response',
    // Must match your server URL
}
```

3. **Enable logging**
```javascript
app.post('/hpp-response', (req, res) => {
    logger.info('HPP Response received:', req.body);
    // Add this to see what's coming in
});
```

4. **Handle both POST and GET**
```javascript
app.post('/hpp-response', handleHppResponse);
app.get('/hpp-response', handleHppResponse);
```

---

## Server Issues

### Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**

1. **Find and kill the process**
```bash
# Find process using port 3001
lsof -ti:3001

# Kill it
kill -9 $(lsof -ti:3001)
```

2. **Use different port**
```env
PORT=3002
```

3. **Restart cleanly**
```bash
pkill -f "node server.js"
npm start
```

---

### Server crashes on startup

**Symptoms:**
```
node:internal/modules/cjs/loader:936
  throw err;
  ^
```

**Solutions:**

1. **Check for syntax errors**
```bash
node --check server.js
```

2. **Verify all dependencies installed**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Check Node.js version**
```bash
node --version
# Should be 14.x or higher
```

4. **Look at full error stack**
- Read the complete error message
- Note the file and line number
- Check that line for issues

---

## Transaction Issues

### Transactions not saving

**Symptoms:**
- Payment succeeds but doesn't appear in history
- transactions.json empty or missing

**Solutions:**

1. **Check file permissions**
```bash
ls -la data/transactions.json
# Should be readable/writable
```

2. **Verify data directory exists**
```bash
mkdir -p data
```

3. **Check disk space**
```bash
df -h
```

4. **Look for save errors**
```javascript
// Add error handling
try {
    fs.writeFileSync('./data/transactions.json', JSON.stringify(transactions, null, 2));
} catch (error) {
    logger.error('Failed to save transaction:', error);
}
```

---

### Duplicate transactions

**Symptoms:**
- Same order ID processed multiple times
- Error 508: Duplicate transaction

**Solutions:**

1. **Generate unique order IDs**
```javascript
// Add random component
const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

2. **Check for double-submission**
- Disable submit button after click
- Add loading state
- Prevent multiple requests

3. **Implement idempotency**
```javascript
// Check if order ID already exists
if (transactions.find(t => t.orderId === orderId)) {
    return res.status(400).json({ error: 'Duplicate order ID' });
}
```

---

## Logging Issues

### Logs not being created

**Symptoms:**
- logs/ directory empty
- No log files generated

**Solutions:**

1. **Check logs directory exists**
```bash
mkdir -p logs
```

2. **Verify permissions**
```bash
chmod 755 logs
```

3. **Check LOG_LEVEL**
```env
LOG_LEVEL=info  # Not 'silent' or 'none'
```

4. **Test logger directly**
```javascript
const logger = require('./logger');
logger.info('Test message');
```

---

### Log files too large

**Symptoms:**
- Disk space warnings
- Performance issues
- Large log files (>100MB)

**Solutions:**

1. **Logs rotate automatically** (configured for 5MB max)

2. **Manually clean old logs**
```bash
rm logs/*.log.1
rm logs/*.log.2
# etc.
```

3. **Adjust rotation settings in logger.js**
```javascript
maxsize: 5 * 1024 * 1024,  // 5MB (increase if needed)
maxFiles: 5,               // Keep 5 rotated files
```

4. **Lower log level in production**
```env
LOG_LEVEL=warn  # Only warnings and errors
```

---

## Payment Declined Issues

### Test cards being declined

**Symptoms:**
```
Result Code: 101
Message: DECLINED
```

**Solutions:**

1. **Use correct test card numbers**
```
Success: 4263970000005262
Decline: 4000120000001154 (this should decline!)
```

2. **Check amount format**
```javascript
// Must be in cents
const amountInCents = Math.round(parseFloat(amount) * 100);
// $10.00 becomes 1000
```

3. **Verify currency support**
```javascript
// Supported: EUR, USD, GBP
// Others may not work in sandbox
```

4. **Use valid expiry date**
```
Format: MMYY
Example: 1225 (December 2025)
Must be future date
```

5. **Use correct CVV**
```
Visa/MC: 123 (3 digits)
Amex: 1234 (4 digits)
```

---

## Getting Help

### Before contacting support:

1. ✅ Check server logs in `logs/` directory
2. ✅ Review browser console for JavaScript errors
3. ✅ Verify all environment variables are set
4. ✅ Test with known working credentials
5. ✅ Try with different test cards
6. ✅ Check this troubleshooting guide

### Contact Information

**Global Payments Support:**
- Email: developer@globalpay.com
- Include: Merchant ID, order ID, timestamp, error message

**Application Issues:**
- Check `logs/error.log` for details
- Review `logs/payments.log` for transaction flow
- Include error messages and timestamps

---

## Quick Reference Commands

```bash
# Restart server
pkill -f "node server.js" && npm start

# Check logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# Check payment logs
tail -f logs/payments.log

# Test environment variables
node -e "require('dotenv').config(); console.log(process.env.API_MERCHANT_ID)"

# Find process on port
lsof -ti:3001

# Kill process on port
kill -9 $(lsof -ti:3001)

# Check Node version
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json && npm install
```
