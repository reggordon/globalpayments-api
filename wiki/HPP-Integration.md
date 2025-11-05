# HPP Integration Guide

## Overview

Hosted Payment Page (HPP) integration redirects users to Global Payments' secure payment page, reducing your PCI compliance scope.

## Differences from API Integration

| Feature | API Integration | HPP Integration |
|---------|----------------|-----------------|
| Card Data | Handled on your server | Handled by Global Payments |
| PCI Compliance | Full PCI DSS required | Reduced PCI scope |
| User Experience | Seamless, no redirect | Redirects to payment page |
| Control | Full UI/UX control | Limited customization |
| Implementation | More complex | Simpler |
| Security | You handle card data | Global Payments handles it |

## When to Use HPP

✅ **Use HPP when:**
- You want to minimize PCI compliance requirements
- You prefer simpler implementation
- You're okay with redirect experience
- You don't need full UI control
- You want Global Payments to handle card security

❌ **Don't use HPP when:**
- You need seamless single-page experience
- You require full control over payment UI
- You want custom payment flows
- You already have PCI DSS compliance

## HPP Payment Flow

1. **User initiates payment** → User clicks "Pay" button
2. **Generate HPP token** → Your server creates signed token
3. **Redirect to HPP** → User redirected to Global Payments page
4. **User enters card details** → On Global Payments secure page
5. **Payment processed** → Global Payments processes payment
6. **Redirect back** → User redirected to your response URL
7. **Verify signature** → Your server validates response
8. **Display result** → Show payment outcome to user

## HPP Token Generation

### Request Parameters

```javascript
{
    TIMESTAMP: '20241105143000',
    MERCHANT_ID: 'your_merchant_id',
    ACCOUNT: 'your_account',
    ORDER_ID: 'ORDER-123456789',
    AMOUNT: '1000',
    CURRENCY: 'EUR',
    AUTO_SETTLE_FLAG: '1',
    HPP_VERSION: '2'
}
```

### Signature Generation

```javascript
function generateHppSignature(params, secret) {
    // Step 1: Create string to sign
    const stringToSign = `${params.TIMESTAMP}.${params.MERCHANT_ID}.${params.ORDER_ID}.${params.AMOUNT}.${params.CURRENCY}`;
    
    // Step 2: SHA1 hash
    const hash1 = crypto
        .createHash('sha1')
        .update(stringToSign)
        .digest('hex');
    
    // Step 3: Hash with secret
    const signature = crypto
        .createHash('sha1')
        .update(`${hash1}.${secret}`)
        .digest('hex');
    
    return signature;
}
```

## Response Handling

### POST Response Parameters

Global Payments sends these parameters back to your response URL:

```javascript
{
    TIMESTAMP: '20241105143001',
    MERCHANT_ID: 'your_merchant_id',
    ORDER_ID: 'ORDER-123456789',
    RESULT: '00',
    MESSAGE: 'Authorised',
    PASREF: '14521823742687291',
    AUTHCODE: '12345',
    AMOUNT: '1000',
    CURRENCY: 'EUR',
    SHA1HASH: 'response_signature',
    // Additional fields...
}
```

### Verify Response Signature

```javascript
function verifyHppResponse(response, secret) {
    const stringToVerify = `${response.TIMESTAMP}.${response.MERCHANT_ID}.${response.ORDER_ID}.${response.RESULT}.${response.MESSAGE}.${response.PASREF}.${response.AUTHCODE}`;
    
    const hash1 = crypto
        .createHash('sha1')
        .update(stringToVerify)
        .digest('hex');
    
    const expectedSignature = crypto
        .createHash('sha1')
        .update(`${hash1}.${secret}`)
        .digest('hex');
    
    return expectedSignature === response.SHA1HASH;
}
```

## HPP Drop-In UI

Global Payments provides a JavaScript Drop-In UI that displays HPP in a lightbox instead of full redirect.

### Implementation

```html
<script src="https://pay.sandbox.realexpayments.com/pay/sdk/web/v1/js/rxp-hpp.js"></script>

<script>
    RealexHpp.setHppUrl('https://pay.sandbox.realexpayments.com/pay');
    
    RealexHpp.lightbox.init('payButton', 'responseUrl', {
        // HPP token parameters
        TIMESTAMP: timestamp,
        MERCHANT_ID: merchantId,
        ORDER_ID: orderId,
        AMOUNT: amount,
        CURRENCY: currency,
        SHA1HASH: signature,
        // ... other parameters
    });
</script>
```

## Result Codes

| Code | Description |
|------|-------------|
| 00 | Successful |
| 101 | Declined by bank |
| 102 | Referral B |
| 103 | Card reported lost/stolen |
| 200 | Communication error |
| 508 | Duplicate transaction |

See [API Response Codes](./Response-Codes.md) for complete list.

## Customization Options

### Logo and Branding

```javascript
{
    HPP_LOGO: 'https://yoursite.com/logo.png',
    HPP_MERCHANT_NAME: 'Your Store Name',
    HPP_CUSTOMER_EMAIL: 'customer@example.com',
    HPP_CUSTOMER_PHONENUMBER_MOBILE: '+353871234567'
}
```

### Return URLs

```javascript
{
    MERCHANT_RESPONSE_URL: 'https://yoursite.com/payment-response',
    HPP_POST_RESPONSE: 'https://yoursite.com/hpp-response',
    HPP_POST_DIMENSIONS: 'https://yoursite.com/hpp-dimensions'
}
```

## Testing

### Test Cards

Same test cards work for HPP as API:

| Card Number | Result | CVV |
|-------------|--------|-----|
| 4263970000005262 | Success | 123 |
| 4000120000001154 | Declined | 123 |

### Test Scenarios

1. **Successful Payment**: Use test card 4263970000005262
2. **Declined Payment**: Use test card 4000120000001154
3. **User Cancels**: Click "Cancel" on HPP
4. **Timeout**: Wait without submitting form

## Security Best Practices

1. **Always verify response signatures** - Never trust client data
2. **Use HTTPS** for response URLs
3. **Validate all response parameters**
4. **Check RESULT code** before processing order
5. **Store transaction references** (PASREF, AUTHCODE)
6. **Log all HPP interactions** for audit trail
7. **Handle duplicate submissions** gracefully
8. **Set appropriate timeouts** on HPP page

## Common Issues

### Invalid Signature Error

**Cause**: Incorrect signature generation or secret key

**Solution**:
- Verify shared secret is correct
- Check parameter order in signature string
- Ensure no extra spaces in parameters
- Use exact timestamp format

### HPP Page Won't Load

**Cause**: Incorrect HPP URL or parameters

**Solution**:
- Verify HPP_SANDBOX_URL is correct
- Check all required parameters are present
- Validate merchant ID is for HPP (not API)
- Check browser console for JavaScript errors

### Response Not Received

**Cause**: Response URL not accessible or incorrect

**Solution**:
- Ensure response URL is publicly accessible
- Verify HTTPS certificate is valid
- Check firewall settings
- Test URL manually

## Code Example

### Generate HPP Token

```javascript
app.post('/generate-hpp-token', (req, res) => {
    const { amount, currency, orderId } = req.body;
    
    const timestamp = getTimestamp();
    const amountInCents = Math.round(parseFloat(amount) * 100);
    
    const params = {
        TIMESTAMP: timestamp,
        MERCHANT_ID: process.env.HPP_MERCHANT_ID,
        ACCOUNT: process.env.HPP_ACCOUNT,
        ORDER_ID: orderId,
        AMOUNT: amountInCents.toString(),
        CURRENCY: currency,
        AUTO_SETTLE_FLAG: '1',
        HPP_VERSION: '2',
        MERCHANT_RESPONSE_URL: process.env.HPP_RESPONSE_URL
    };
    
    const signature = generateHppSignature(params, process.env.HPP_SHARED_SECRET);
    params.SHA1HASH = signature;
    
    res.json({
        hppUrl: process.env.HPP_SANDBOX_URL,
        params: params
    });
});
```

### Handle HPP Response

```javascript
app.post('/hpp-response', (req, res) => {
    const response = req.body;
    
    // Verify signature
    const isValid = verifyHppResponse(response, process.env.HPP_SHARED_SECRET);
    
    if (!isValid) {
        logger.error('Invalid HPP signature');
        return res.status(400).send('Invalid signature');
    }
    
    // Save transaction
    const transaction = {
        orderId: response.ORDER_ID,
        result: response.RESULT,
        message: response.MESSAGE,
        authCode: response.AUTHCODE,
        pasRef: response.PASREF,
        success: response.RESULT === '00',
        timestamp: new Date().toISOString()
    };
    
    saveTransaction(transaction);
    
    // Redirect to result page
    res.redirect(`/hpp-result.html?orderId=${response.ORDER_ID}`);
});
```

## Next Steps

- [API Integration Guide](./API-Integration.md) - Compare with API approach
- [Security Best Practices](./Security.md) - Additional security guidelines
- [Troubleshooting](./Troubleshooting.md) - Common issues and solutions
