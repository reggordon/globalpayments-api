# Google Cloud Run Deployment Guide

## Prerequisites
1. Google Cloud account with billing enabled
2. gcloud CLI installed

## Setup Instructions

### 1. Install Google Cloud CLI
```bash
brew install google-cloud-sdk
```

### 2. Initialize and Login
```bash
gcloud init
gcloud auth login
```

### 3. Create a New Project
```bash
gcloud projects create globalpayments-api-demo --name="Global Payments API"
gcloud config set project globalpayments-api-demo
```

### 4. Enable Required APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### 5. Set Environment Variables
Create a `.env.yaml` file (DO NOT commit this):
```yaml
API_MERCHANT_ID: "dev791880573356328554"
API_ACCOUNT: "internet"
API_SHARED_SECRET: "hIAPYfgOhm"
API_URL: "https://api.sandbox.realexpayments.com/epage-remote.cgi"
HPP_MERCHANT_ID: "dev791880573356328554"
HPP_ACCOUNT: "internet"
HPP_SHARED_SECRET: "hIAPYfgOhm"
HPP_SANDBOX_URL: "https://pay.sandbox.realexpayments.com/pay"
HPP_RESPONSE_URL: "https://globalpayments-api-demo-XXXXXXXXX.run.app/hpp-response"
PORT: "3001"
NODE_ENV: "production"
LOG_LEVEL: "info"
```

### 6. Deploy to Cloud Run
```bash
cd /Users/reggordon/github/globalpayments-api

# Build and deploy in one command
gcloud run deploy globalpayments-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

### 7. Get Your Service URL
```bash
gcloud run services describe globalpayments-api \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
```

### 8. Update HPP_RESPONSE_URL
Once you get your service URL (e.g., `https://globalpayments-api-abc123.run.app`):

1. Update `.env.yaml`:
   ```yaml
   HPP_RESPONSE_URL: "https://globalpayments-api-abc123.run.app/hpp-response"
   ```

2. Redeploy:
   ```bash
   gcloud run deploy globalpayments-api \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --env-vars-file .env.yaml
   ```

### 9. Test Your Deployment
```bash
# Open in browser
gcloud run services browse globalpayments-api \
  --platform managed \
  --region us-central1
```

## Cost Management

### Monitor Usage
```bash
# View service details
gcloud run services describe globalpayments-api --region us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=globalpayments-api" --limit 50
```

### Set Budget Alerts
1. Go to https://console.cloud.google.com/billing/budgets
2. Create a budget alert for $5-10/month
3. Get notified before costs exceed threshold

## Useful Commands

### View Logs
```bash
gcloud run logs tail globalpayments-api --region us-central1
```

### Update Environment Variables
```bash
gcloud run services update globalpayments-api \
  --region us-central1 \
  --update-env-vars KEY=VALUE
```

### Delete Service (to stop costs)
```bash
gcloud run services delete globalpayments-api --region us-central1
```

## Security Notes

- Never commit `.env.yaml` to git (it's in .gitignore)
- Use Secret Manager for production credentials
- Enable Cloud Armor for DDoS protection
- Set up Cloud CDN for static assets

## Troubleshooting

### Build Fails
```bash
# Build locally first
docker build -t globalpayments-api .
docker run -p 3001:3001 globalpayments-api
```

### Service Won't Start
```bash
# Check logs
gcloud run logs read --service globalpayments-api --region us-central1 --limit 100
```

### Cost Too High
```bash
# Scale down
gcloud run services update globalpayments-api \
  --region us-central1 \
  --max-instances 2 \
  --memory 256Mi
```

## Alternative: Deploy from GitHub

Set up continuous deployment:
```bash
# Connect to GitHub repository
gcloud run deploy globalpayments-api \
  --source https://github.com/reggordon/globalpayments-api \
  --branch feature/hpp-integration-options \
  --region us-central1
```
