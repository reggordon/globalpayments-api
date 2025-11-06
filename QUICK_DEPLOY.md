# Quick Deploy Guide

## Prerequisites
1. Install Google Cloud CLI: `brew install google-cloud-sdk`
2. Login: `gcloud auth login`

## Deploy in 3 Steps

### 1. Create your environment file
```bash
cp .env.yaml.example .env.yaml
```
Edit `.env.yaml` with your credentials (it's already gitignored)

### 2. Run deployment script
```bash
./deploy.sh
```

That's it! The script will:
- Create Google Cloud project
- Enable required APIs
- Build and deploy your app
- Give you the live URL

### 3. Update HPP callback URL
After first deployment:
1. Copy the URL you received (e.g., `https://globalpayments-api-xyz.run.app`)
2. Edit `.env.yaml` and update `HPP_RESPONSE_URL`
3. Run `./deploy.sh` again

Now HPP transactions will be saved!

## View your app
```bash
gcloud run services list
```

## View logs
```bash
gcloud run logs tail globalpayments-api --region us-central1
```

## Estimated Cost
- **Free tier:** 2M requests/month
- **Light usage:** $0-2/month
- **Moderate usage:** $2-5/month

## Need help?
See full documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)
