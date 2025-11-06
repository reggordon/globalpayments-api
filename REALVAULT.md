# Realvault Integration Guide

This guide explains how to enable secure card storage using Global Payments Realvault.

## What is Realvault?

Realvault is Global Payments' secure card tokenization service that allows you to:
- Store customer payment cards securely (PCI-compliant)
- Charge stored cards without handling sensitive card data
- Implement recurring payments and subscription billing
- Reduce PCI compliance scope for your application

## Prerequisites

1. Active Global Payments merchant account
2. Realvault feature enabled on your account
3. API credentials (Merchant ID, Account, Shared Secret)

## Enabling Realvault

### Step 1: Contact Global Payments

Contact Global Payments support to enable Realvault:
- **Email:** developer@globalpay.com
- **Support Portal:** [Global Payments Developer Portal](https://developer.globalpay.com)

Request:
- Realvault / Card Storage API access
- Account configuration for card tokenization
- Confirm your merchant ID and account name

### Step 2: Configure Environment Variables

Once Realvault is enabled, update your `.env` file:

```bash
# Enable Realvault
REALVAULT_ENABLED=true

# Realvault account (usually same as API account)
REALVAULT_ACCOUNT=your_api_account
```

### Step 3: Restart Your Application

```bash
npm start
```

The application will now use Realvault for all card storage operations.

## How It Works

### Storing Cards

When a customer saves a card:

1. **Card Entry:** Customer enters card details via hosted fields
2. **Tokenization:** Application sends card data to Global Payments
3. **Realvault Storage:** Global Payments stores card securely and returns:
   - `payerref`: Unique customer identifier
   - `cardref`: Unique card token
4. **Local Metadata:** Application stores only:
   - Masked card number (first 6 + last 4 digits)
   - Card brand, expiry date
   - Customer name/email
   - Token references

**No sensitive card data is stored in your database.**

### Charging Stored Cards

When charging a stored card:

1. **Select Card:** Customer selects saved card
2. **Reference Lookup:** Application retrieves card token
3. **Receipt-In Request:** Application sends payment request with:
   - `payerref`: Customer reference
   - `paymentmethod`: Card reference token
   - Amount and currency
4. **Authorization:** Global Payments processes payment
5. **Response:** Transaction result returned

## API Endpoints

### Store Card

**POST** `/store-card`

Stores a new card in Realvault.

**Request:**
```json
{
  "cardNumber": "4263970000005262",
  "cardHolderName": "John Doe",
  "expiryMonth": "12",
  "expiryYear": "2025",
  "cvv": "123",
  "customerEmail": "john@example.com"
}
```

**Response (Realvault Enabled):**
```json
{
  "success": true,
  "message": "Card stored securely in Realvault",
  "token": "CARD-1234567890-abc123",
  "maskedCardNumber": "426397****5262",
  "cardBrand": "VISA",
  "realvaultEnabled": true
}
```

### Charge Stored Card

**POST** `/charge-stored-card`

Charges a card stored in Realvault.

**Request:**
```json
{
  "token": "CARD-1234567890-abc123",
  "amount": 10.00,
  "currency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "CHARGE-1234567890",
  "amount": 10.00,
  "currency": "EUR",
  "authCode": "123456",
  "message": "AUTHORISED",
  "maskedCardNumber": "426397****5262"
}
```

### List Stored Cards

**GET** `/stored-cards`

Returns all stored cards for display.

**Response:**
```json
{
  "success": true,
  "cards": [
    {
      "token": "CARD-1234567890-abc123",
      "payerRef": "PAYER-1234567890-xyz789",
      "maskedCardNumber": "426397****5262",
      "cardBrand": "VISA",
      "cardHolderName": "John Doe",
      "expiryMonth": "12",
      "expiryYear": "2025",
      "createdAt": "2025-11-06T12:00:00.000Z",
      "lastUsed": null,
      "storedInRealvault": true
    }
  ]
}
```

## Security & Compliance

### PCI DSS Scope Reduction

With Realvault:
- ✅ Card data never touches your servers
- ✅ No card storage = reduced PCI compliance scope
- ✅ Global Payments handles all card security
- ✅ Your application only stores non-sensitive tokens

### Data Flow

```
Customer Card → Your Application → Global Payments Realvault
                                          ↓
                                    Secure Storage
                                          ↓
                                    Returns Token
                                          ↓
Your Database ← Token Only ─────────────┘
```

### Best Practices

1. **Never log card data:** Ensure no card numbers appear in logs
2. **Use HTTPS:** Always use TLS for all communications
3. **Token-only storage:** Only store card tokens, never full PANs
4. **Validate permissions:** Ensure users can only access their own cards
5. **Monitor transactions:** Review failed charges for fraud patterns

## Testing

### Test Cards (Sandbox)

Use these test cards with Realvault sandbox:

| Card Number         | Brand      | Result     |
|---------------------|------------|------------|
| 4263970000005262    | Visa       | Approved   |
| 5425230000004415    | Mastercard | Approved   |
| 374101000000608     | Amex       | Approved   |
| 4000120000001154    | Visa       | Declined   |

### Test Workflow

1. Save test card via UI or API
2. Verify card appears with 🔒 icon (Realvault stored)
3. Attempt charge against stored card
4. Verify transaction succeeds
5. Check card "last used" timestamp updates

## Troubleshooting

### "Realvault not enabled" Error

**Problem:** Trying to charge cards but Realvault is disabled.

**Solution:**
1. Check `.env` file: `REALVAULT_ENABLED=true`
2. Restart application
3. Verify with Global Payments that Realvault is enabled on your account

### "Invalid payer reference" Error

**Problem:** Card token not found in Realvault.

**Solution:**
1. Card may have been stored locally (before Realvault enabled)
2. Re-save the card with Realvault enabled
3. Check `storedInRealvault` flag in card metadata

### "Card not found" Error

**Problem:** Token doesn't exist in local database.

**Solution:**
1. Verify card was saved successfully
2. Check `data/stored-cards.json` file
3. Ensure token matches exactly

## Production Checklist

Before going live with Realvault:

- [ ] Realvault enabled on production merchant account
- [ ] Production credentials configured in `.env`
- [ ] `REALVAULT_ENABLED=true` set
- [ ] HTTPS/TLS enabled on all endpoints
- [ ] Error handling tested for all scenarios
- [ ] Card storage tested with real cards
- [ ] Charging stored cards tested
- [ ] PCI compliance documentation reviewed
- [ ] Fraud monitoring configured
- [ ] Transaction logging implemented

## Support

### Global Payments Support
- Developer Portal: https://developer.globalpay.com
- Email: developer@globalpay.com
- Documentation: https://developer.globalpay.com/api

### Common Questions

**Q: Is Realvault free?**  
A: Realvault may have additional fees. Contact Global Payments for pricing.

**Q: Can I migrate existing tokens?**  
A: Yes, but requires coordination with Global Payments support.

**Q: What happens if Realvault is disabled later?**  
A: Cards stored in Realvault cannot be charged. Local storage cards are unaffected.

**Q: Can I use Realvault in sandbox?**  
A: Yes, if enabled on your sandbox account. Contact support to enable.

## Next Steps

1. **Enable Realvault:** Contact Global Payments
2. **Update Configuration:** Set `REALVAULT_ENABLED=true`
3. **Test Integration:** Save and charge test cards
4. **Review Security:** Ensure PCI compliance
5. **Go Live:** Deploy to production

---

For more information, see:
- [SETUP.md](./SETUP.md) - Initial setup guide
- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - Local development
- [TRANSFERABILITY.md](./TRANSFERABILITY.md) - Codebase portability
