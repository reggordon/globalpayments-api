#!/bin/bash

# Google Cloud Run Deployment Script
# Run this after setting up gcloud CLI and creating .env.yaml

set -e  # Exit on error

echo "🚀 Global Payments API - Cloud Run Deployment"
echo "=============================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install with: brew install google-cloud-sdk"
    exit 1
fi

echo "✓ gcloud CLI found"

# Check if .env.yaml exists
if [ ! -f ".env.yaml" ]; then
    echo "❌ Error: .env.yaml not found"
    echo "Create it from template: cp .env.yaml.example .env.yaml"
    echo "Then edit .env.yaml with your values"
    exit 1
fi

echo "✓ .env.yaml found"

# Set variables
PROJECT_ID=${1:-globalpayments-api-demo}
SERVICE_NAME="globalpayments-api"
REGION="us-central1"

echo ""
echo "📋 Deployment Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Service Name: $SERVICE_NAME"
echo "   Region: $REGION"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🔧 Setting up Google Cloud project..."

# Create project if it doesn't exist
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo "Creating new project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --name="Global Payments API"
fi

# Set current project
gcloud config set project $PROJECT_ID

echo "✓ Project configured"

echo ""
echo "🔌 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
echo "✓ APIs enabled"

echo ""
echo "📦 Building and deploying to Cloud Run..."
echo "This may take 2-3 minutes..."
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --quiet

echo ""
echo "✅ Deployment complete!"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "🌐 Your application is live at:"
echo "   $SERVICE_URL"
echo ""
echo "⚠️  IMPORTANT: Update HPP_RESPONSE_URL"
echo ""
echo "1. Edit .env.yaml and update HPP_RESPONSE_URL to:"
echo "   HPP_RESPONSE_URL: \"${SERVICE_URL}/hpp-response\""
echo ""
echo "2. Redeploy to activate HPP callbacks:"
echo "   ./deploy.sh $PROJECT_ID"
echo ""
echo "📊 View logs:"
echo "   gcloud run logs tail $SERVICE_NAME --region $REGION"
echo ""
echo "💰 Monitor costs:"
echo "   https://console.cloud.google.com/billing"
echo ""
