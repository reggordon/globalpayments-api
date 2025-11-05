# Security Best Practices

## Overview

Payment processing involves sensitive data. This guide covers essential security practices for the Global Payments integration.

⚠️ **This application is for sandbox testing only. Production deployment requires additional security measures.**

---

## Environment Variables

### ✅ DO

1. **Store all credentials in .env**
```env
API_MERCHANT_ID=your_merchant_id
API_SHARED_SECRET=your_secret
```

2. **Add .env to .gitignore**
```bash
# Already configured in this project
echo ".env" >> .gitignore
```

3. **Use different credentials per environment**
```env
# Development
API_MERCHANT_ID=dev_merchant

# Production
API_MERCHANT_ID=prod_merchant
```

4. **Rotate secrets regularly**
- Change secrets every 90 days
- Update immediately if compromised
- Use strong, random values

### ❌ DON'T

1. **Never commit .env to git**
```bash
# Check if .env is tracked
git status

# If it's there, remove it
git rm --cached .env
```

2. **Never hardcode credentials**
```javascript
// BAD
const merchantId = 'mymerchant123';

// GOOD
const merchantId = process.env.API_MERCHANT_ID;
```

3. **Never share .env files**
- Don't email them
- Don't commit to git
- Don't store in shared drives
- Don't include in screenshots

---

## PCI DSS Compliance

### What is PCI DSS?

Payment Card Industry Data Security Standard - required for handling card data.

### Compliance Levels

| Level | Transaction Volume | Requirements |
|-------|-------------------|--------------|
| 1 | >6M/year | Most stringent, annual audit |
| 2 | 1M-6M/year | Annual self-assessment |
| 3 | 20K-1M/year | Annual self-assessment |
| 4 | <20K/year | Annual self-assessment |

### Direct API Integration

**⚠️ Full PCI DSS Compliance Required**

When using Direct API (this application), card data touches your server:
- ✅ You control the UI/UX
- ❌ You are responsible for card data security
- ❌ Full PCI DSS compliance mandatory
- ❌ Annual security audits required

### HPP Integration

**✅ Reduced PCI Scope**

When using HPP, Global Payments handles card data:
- ✅ Simplified compliance (SAQ A)
- ✅ Global Payments secures card data
- ✅ Lower audit requirements
- ❌ Less control over UI

### Recommendation

**If you don't have PCI DSS compliance, use HPP integration instead of Direct API.**

---

## HTTPS/TLS

### Production Requirements

**HTTPS is MANDATORY for production:**

```javascript
// Enforce HTTPS
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});
```

### TLS Version

Use TLS 1.2 or higher:

```javascript
const https = require('https');
const tls = require('tls');

tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
```

### Certificate

- Use valid SSL certificate (not self-signed)
- Keep certificate up to date
- Use automated renewal (Let's Encrypt)

---

## Card Data Security

### Never Store Sensitive Data

**❌ NEVER store:**
- Full card numbers (except last 4 digits)
- CVV/CVC codes
- Expiry dates (in plain text)
- Card PINs

**✅ CAN store:**
- Last 4 digits: `****5262`
- Masked number: `4263 97** **** 5262`
- Transaction reference (PASREF)
- Authorization code
- Order ID

### Implementation

```javascript
// Mask card number
function maskCardNumber(cardNumber) {
    return cardNumber.replace(/^(\d{6})\d+(\d{4})$/, '$1******$2');
}

// Store only what's needed
const transaction = {
    orderId: orderId,
    maskedCard: maskCardNumber(cardNumber),
    lastFour: cardNumber.slice(-4),
    amount: amount,
    result: result,
    pasRef: pasRef,  // Store this
    authCode: authCode  // Store this
    // DON'T store full card number or CVV
};
```

---

## Logging Security

### What to Log

✅ **DO log:**
- Transaction IDs
- Amounts
- Timestamps
- Result codes
- Masked card numbers (last 4 digits)
- API request/response (without sensitive data)

❌ **DON'T log:**
- Full card numbers
- CVV codes
- Shared secrets
- Raw API credentials
- Customer passwords

### Implementation

```javascript
// Good logging
logger.info('Payment processed', {
    orderId: orderId,
    amount: amount,
    currency: currency,
    lastFour: cardNumber.slice(-4),
    result: result
});

// Bad logging
logger.info('Payment processed', {
    cardNumber: cardNumber,  // ❌ Never do this
    cvv: cvv,                // ❌ Never do this
    secret: secret           // ❌ Never do this
});
```

### Log File Security

```bash
# Set appropriate permissions
chmod 640 logs/*.log

# Only app user should read/write
chown appuser:appuser logs/*.log

# Add to logrotate for automatic cleanup
# /etc/logrotate.d/globalpayments-api
/path/to/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
}
```

---

## Input Validation

### Client-Side Validation

```javascript
// Validate card number (Luhn algorithm)
function validateCardNumber(number) {
    const digits = number.replace(/\D/g, '');
    if (!/^\d{13,19}$/.test(digits)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i]);
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Validate expiry
function validateExpiry(month, year) {
    const now = new Date();
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    return expiry > now;
}

// Validate CVV
function validateCVV(cvv, cardType) {
    if (cardType === 'AMEX') {
        return /^\d{4}$/.test(cvv);
    }
    return /^\d{3}$/.test(cvv);
}
```

### Server-Side Validation

**Always validate on server** - never trust client data:

```javascript
app.post('/process-payment', (req, res) => {
    const { amount, cardNumber, cvv } = req.body;
    
    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Validate card number
    if (!cardNumber || !/^\d{13,19}$/.test(cardNumber)) {
        return res.status(400).json({ error: 'Invalid card number' });
    }
    
    // Validate CVV
    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
        return res.status(400).json({ error: 'Invalid CVV' });
    }
    
    // Process payment...
});
```

---

## Rate Limiting

Prevent abuse with rate limiting:

```javascript
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: 'Too many payment attempts, please try again later'
});

app.post('/process-payment', paymentLimiter, async (req, res) => {
    // Payment processing...
});
```

---

## Signature Verification

### Always Verify Response Signatures

```javascript
function verifyResponseSignature(response, secret) {
    const expectedSig = generateSignature(
        response.timestamp,
        response.merchantId,
        response.orderId,
        response.result,
        response.message,
        response.pasRef,
        response.authCode,
        secret
    );
    
    return response.sha1hash === expectedSig;
}

app.post('/hpp-response', (req, res) => {
    // ALWAYS verify signature first
    if (!verifyResponseSignature(req.body, process.env.HPP_SHARED_SECRET)) {
        logger.error('Invalid signature - possible tampering');
        return res.status(400).send('Invalid signature');
    }
    
    // Process response...
});
```

### Generate Signatures Correctly

```javascript
// Correct order is critical
const str = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}.${cardNumber}`;

// Use secure hash
const hash1 = crypto.createHash('sha1').update(str).digest('hex');
const hash2 = crypto.createHash('sha1').update(`${hash1}.${secret}`).digest('hex');
```

---

## Database Security

If storing transaction data in a database:

### Encryption at Rest

```javascript
const crypto = require('crypto');

// Encrypt sensitive data
function encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt sensitive data
function decrypt(text, key) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
```

### Use Parameterized Queries

```javascript
// Good - parameterized
db.query('SELECT * FROM transactions WHERE order_id = ?', [orderId]);

// Bad - SQL injection risk
db.query(`SELECT * FROM transactions WHERE order_id = '${orderId}'`);
```

---

## Network Security

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 22/tcp   # SSH (from specific IPs only)
sudo ufw deny 3001/tcp  # Block direct access to app
```

### Reverse Proxy

Use nginx or similar:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Dependency Security

### Keep Dependencies Updated

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update packages
npm update
```

### Use Package Lock

```bash
# Always commit package-lock.json
git add package-lock.json
```

### Review Dependencies

```bash
# List all dependencies
npm ls

# Check outdated packages
npm outdated
```

---

## Error Handling

### Don't Leak Information

```javascript
// Bad - exposes internal details
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.stack });
});

// Good - generic error
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
```

---

## Production Checklist

Before deploying to production:

- [ ] HTTPS enabled with valid certificate
- [ ] Environment variables properly configured
- [ ] Secrets rotated from sandbox values
- [ ] Logging configured (but not logging sensitive data)
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error handling doesn't leak information
- [ ] Dependencies updated and audited
- [ ] Firewall rules configured
- [ ] Reverse proxy setup (nginx/Apache)
- [ ] PCI DSS compliance assessment completed
- [ ] Security audit performed
- [ ] Backup and disaster recovery plan
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

---

## Security Resources

- [PCI DSS Standards](https://www.pcisecuritystandards.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Global Payments Security](https://developer.globalpay.com/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Guide](https://expressjs.com/en/advanced/best-practice-security.html)

---

## Contact for Security Issues

**Security vulnerabilities:**
- Contact Global Payments: developer@globalpay.com
- Include: Detailed description, steps to reproduce, impact assessment

**For this application:**
- Review code thoroughly before production use
- Conduct security audit
- Implement additional security measures as needed
