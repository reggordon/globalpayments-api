# API Response Codes

## Overview

Global Payments returns numeric result codes to indicate the outcome of payment requests. This guide lists all common codes and their meanings.

---

## Success Codes

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 00 | Successful | Transaction approved | Proceed with order fulfillment |
| 000 | Successful | Alternative success code | Proceed with order fulfillment |

---

## Decline Codes

### General Declines

| Code | Message | Description | Customer Action |
|------|---------|-------------|----------------|
| 101 | Declined by bank | Bank declined without specific reason | Contact card issuer |
| 102 | Referral B | Bank requires phone authorization | Call card issuer |
| 103 | Card reported lost/stolen | Card flagged as lost or stolen | Use different card |
| 104 | Card reported lost/stolen | Restricted card | Use different card |
| 200 | Declined | Generic decline | Contact card issuer |
| 201 | Expired card | Card past expiration date | Use valid card |
| 202 | Card reported lost/stolen | Security concern | Use different card |

### Insufficient Funds

| Code | Message | Description | Customer Action |
|------|---------|-------------|----------------|
| 110 | Not sufficient funds | Insufficient balance | Use different card or add funds |

### Invalid Information

| Code | Message | Description | Customer Action |
|------|---------|-------------|----------------|
| 111 | Card number invalid | Invalid card number format | Check card number |
| 115 | Invalid merchant | Merchant not recognized | Contact support |
| 122 | CVV mismatch | CVV doesn't match | Verify CVV code |
| 203 | Invalid card type | Card type not accepted | Use different card type |

---

## Communication Errors

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 200 | Communication error | Network issue | Retry transaction |
| 204 | Bank communications error | Cannot reach bank | Retry or contact support |
| 205 | Bank system unavailable | Bank temporarily down | Retry later |
| 220 | Timeout | Request timed out | Retry transaction |

---

## Validation Errors

### Merchant/Configuration

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 504 | No such merchant id | Merchant ID not found | Verify credentials |
| 506 | Invalid signature | Security validation failed | Check signature generation |
| 509 | Invalid transaction type | Unsupported transaction type | Check request format |
| 520 | Account not found | Sub-account doesn't exist | Verify account name |
| 530 | Account closed | Account no longer active | Contact Global Payments |

### Transaction Data

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 508 | Duplicate transaction | Order ID already used | Use unique order ID |
| 510 | Invalid amount | Amount format incorrect | Check amount format (cents) |
| 511 | Invalid currency | Unsupported currency | Use EUR, USD, or GBP |
| 515 | Invalid order ID | Order ID format incorrect | Check order ID format |

### Card Data

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 501 | Invalid card number | Card number format invalid | Validate card number |
| 502 | Invalid expiry date | Expiry format incorrect | Use MMYY format |
| 503 | Missing CVV | CVV required but not provided | Include CVV |
| 507 | Invalid CVV | CVV format incorrect | Check CVV format |

---

## 3D Secure Codes

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 110 | 3DS authentication required | Strong customer authentication needed | Initiate 3DS flow |
| 115 | 3DS authentication failed | Customer failed authentication | Transaction declined |

---

## Refund/Void Codes

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 600 | Refund successful | Refund processed | Confirm with customer |
| 601 | Refund declined | Refund not allowed | Check original transaction |
| 602 | Original transaction not found | Cannot find auth to refund | Verify pasref/authcode |
| 603 | Already refunded | Transaction already refunded | Check transaction history |
| 604 | Partial refund not allowed | Full refund required | Refund entire amount |

---

## HPP-Specific Codes

| Code | Message | Description | Action |
|------|---------|-------------|--------|
| 999 | User cancelled | Customer cancelled payment | Return to checkout |
| 666 | Client side validation failed | Form validation error | Fix form data |

---

## Testing Codes

For sandbox testing, these codes can be triggered:

| Test Card | Triggers Code | Result |
|-----------|--------------|--------|
| 4263970000005262 | 00 | Success |
| 4000120000001154 | 101 | Declined |
| 4000130000001724 | 102 | Referral |
| 4000160000004147 | 103 | Lost/Stolen |

---

## Code Ranges

Understanding code patterns:

| Range | Category |
|-------|----------|
| 00-99 | Success |
| 100-199 | Bank declines |
| 200-299 | Communication errors |
| 300-399 | Reserved |
| 400-499 | Reserved |
| 500-599 | Validation errors |
| 600-699 | Refund/void responses |
| 700-999 | Other/HPP specific |

---

## Response Handling Examples

### Success Check

```javascript
if (response.result === '00' || response.result === '000') {
    // Transaction successful
    processOrder();
} else {
    // Transaction failed
    handleDecline(response.result, response.message);
}
```

### Specific Error Handling

```javascript
switch(response.result) {
    case '00':
        return { success: true, message: 'Payment successful' };
    
    case '101':
        return { success: false, message: 'Card declined. Please contact your bank.' };
    
    case '110':
        return { success: false, message: 'Insufficient funds. Please use a different card.' };
    
    case '122':
        return { success: false, message: 'CVV mismatch. Please check your security code.' };
    
    case '504':
        logger.error('Configuration error: Invalid merchant ID');
        return { success: false, message: 'System error. Please contact support.' };
    
    case '506':
        logger.error('Security error: Invalid signature');
        return { success: false, message: 'System error. Please contact support.' };
    
    case '508':
        return { success: false, message: 'Duplicate transaction. Please refresh and try again.' };
    
    default:
        return { success: false, message: `Transaction failed: ${response.message}` };
}
```

### User-Friendly Messages

```javascript
function getUserMessage(resultCode) {
    const messages = {
        '00': 'Payment successful!',
        '101': 'Your card was declined. Please contact your bank.',
        '110': 'Insufficient funds. Please try a different card.',
        '122': 'Invalid security code. Please check your CVV.',
        '201': 'Your card has expired. Please use a valid card.',
        '508': 'Duplicate transaction. Please refresh the page.',
        '999': 'Payment cancelled.',
    };
    
    return messages[resultCode] || 'Payment failed. Please try again or contact support.';
}
```

### Retry Logic

```javascript
const RETRYABLE_CODES = ['200', '204', '205', '220'];

function shouldRetry(resultCode) {
    return RETRYABLE_CODES.includes(resultCode);
}

async function processPaymentWithRetry(paymentData, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await processPayment(paymentData);
            
            if (response.result === '00') {
                return response; // Success
            }
            
            if (!shouldRetry(response.result)) {
                return response; // Don't retry non-retryable errors
            }
            
            if (attempt < maxRetries) {
                logger.info(`Retry attempt ${attempt} for ${response.result}`);
                await sleep(1000 * attempt); // Exponential backoff
            }
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await sleep(1000 * attempt);
        }
    }
}
```

---

## Logging Best Practices

### What to Log

```javascript
logger.info('Payment attempt', {
    orderId: orderId,
    amount: amount,
    currency: currency,
    resultCode: response.result,
    message: response.message,
    lastFour: cardNumber.slice(-4)
});
```

### Error Tracking

```javascript
if (response.result !== '00') {
    logger.error('Payment failed', {
        orderId: orderId,
        resultCode: response.result,
        message: response.message,
        timestamp: new Date().toISOString()
    });
}
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Success Rate**
   - Track percentage of '00' responses
   - Alert if drops below threshold

2. **Decline Patterns**
   - Monitor 101, 110, 122 codes
   - Look for unusual patterns

3. **System Errors**
   - Watch for 504, 506 codes
   - Indicates configuration issues

4. **Communication Errors**
   - Track 200, 204, 220 codes
   - May indicate connectivity issues

### Sample Alert Rules

```javascript
// Alert if success rate drops
if (successRate < 0.95) {
    sendAlert('Success rate dropped below 95%');
}

// Alert on configuration errors
if (resultCode === '504' || resultCode === '506') {
    sendAlert('Configuration error detected');
}

// Alert on high decline rate
if (declineRate > 0.20) {
    sendAlert('Decline rate above 20%');
}
```

---

## Additional Resources

- [Global Payments Developer Portal](https://developer.globalpay.com/)
- [API Documentation](https://developer.globalpay.com/#!/api)
- [Troubleshooting Guide](./Troubleshooting.md)
- [Security Best Practices](./Security.md)

---

## Quick Reference Card

Print this for quick reference:

```
┌─────────────────────────────────────────┐
│     GLOBAL PAYMENTS RESULT CODES        │
├──────┬──────────────────────────────────┤
│  00  │ ✅ Success                       │
│ 101  │ ❌ Declined by bank             │
│ 110  │ ❌ Insufficient funds           │
│ 122  │ ❌ CVV mismatch                 │
│ 200  │ ⚠️  Communication error         │
│ 201  │ ❌ Expired card                 │
│ 504  │ 🔧 Invalid merchant ID          │
│ 506  │ 🔧 Invalid signature            │
│ 508  │ ⚠️  Duplicate transaction       │
│ 999  │ ℹ️  User cancelled              │
└──────┴──────────────────────────────────┘
```
