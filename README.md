# Global Payments API Integration

Production-ready Node.js payment processing with Global Payments. Includes user authentication, card storage (RealVault), and complete transaction management.

## Quick Start

```bash
git clone https://github.com/reggordon/globalpayments-api.git
cd globalpayments-api
npm install
cp .env.example .env
# Edit .env with your Global Payments credentials
npm start
```

Open http://localhost:3001

## Environment Configuration

Create `.env` with your credentials:

```env
PORT=3001
NODE_ENV=development

# API Credentials
API_MERCHANT_ID=your_merchant_id
API_ACCOUNT=your_account
API_SHARED_SECRET=your_secret

# HPP Credentials
HPP_MERCHANT_ID=your_merchant_id
HPP_SHARED_SECRET=your_secret
HPP_RESPONSE_URL=https://your-domain.com/hpp-response

# Session
SESSION_SECRET=your_session_secret
```

## Project Structure

```
globalpayments-api/
├── server.js                 # Express server + API endpoints
├── public/
│   ├── index.html           # Payment form
│   ├── register.html        # User registration
│   ├── login.html           # User login
│   ├── profile.html         # User dashboard
│   ├── css/main.css         # Styles
│   └── js/                  # Client scripts
├── data/
│   ├── users.json           # User accounts
│   ├── stored-cards.json    # Saved cards
│   └── transactions.json    # Transaction history
├── .env                     # Your credentials (not in git)
├── .env.yaml                # Cloud Run config
└── deploy.sh                # Deployment script
```

## Features

- ✅ User registration & login with bcrypt
- ✅ Global Payments RealVault card storage
- ✅ Charge stored cards with tokenization
- ✅ Transaction history & filtering
- ✅ Responsive modern UI
- ✅ All card types (VISA, MC, AMEX, JCB, DINERS)
- ✅ **Session-based credential swapping** - Test multiple merchant accounts without restarting

## Quick Deploy

```bash
cp .env.yaml.example .env.yaml
# Edit .env.yaml with your credentials
./deploy.sh
```

Production: https://payments.reggordon.com

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create user account |
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/user` | Get current user |
| GET | `/api/user/transactions` | User transactions |
| GET | `/api/user/cards` | Saved cards |
| POST | `/process-payment` | Direct payment |
| POST | `/charge-stored-card` | Charge saved card |
| POST | `/api/credentials/set` | Set session credentials |
| POST | `/api/credentials/reset` | Reset to defaults |
| GET | `/api/credentials/status` | Check active credentials |

## Session-Based Credential Swapping

Easily test multiple merchant accounts without restarting the server or editing `.env` files.

### How It Works

Visit `http://localhost:3001/` (Credentials Management page) to:
- Set custom API and/or HPP credentials for your session
- Override default credentials temporarily
- Reset back to `.env` defaults anytime

### Features

- **Independent Configuration**: Set API credentials separately from HPP credentials
- **Partial Overrides**: Override only what you need - defaults fill in the rest
- **Session Isolation**: Each browser session has independent credentials
- **No Server Restart**: Changes apply immediately without restarting
- **Temporary**: Credentials reset when session expires or you click "Reset to Defaults"

### Use Cases

✅ Test different merchant accounts simultaneously  
✅ Demo with client-specific credentials  
✅ Switch between sandbox and production environments  
✅ Team members can use their own test credentials  

### Example

```javascript
// Set only API credentials (HPP uses defaults from .env)
POST /api/credentials/set
{
  "apiMerchantId": "test_merchant_123",
  "apiSharedSecret": "test_secret_456"
}

// Set only HPP credentials (API uses defaults from .env)
POST /api/credentials/set
{
  "hppMerchantId": "demo_hpp_merchant",
  "hppSharedSecret": "demo_secret"
}

// Reset everything back to .env defaults
POST /api/credentials/reset
```

## Test Cards

| Card | Result | CVV | Expiry |
|------|--------|-----|--------|
| 4263970000005262 | Success | 123 | Any future |
| 4000120000001154 | Declined | 123 | Any future |

## License

MIT
