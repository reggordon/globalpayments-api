# Custom Domain Setup for Cloud Run

This guide will help you set up a custom domain for your Global Payments API to avoid the "deceptive site" warning on the .run.app subdomain.

## Prerequisites

- A domain name (e.g., example.com)
- Access to your domain's DNS settings
- gcloud CLI installed and authenticated

## Step 1: Choose Your Domain

Pick a subdomain for your API, such as:
- `gp-api.yourdomain.com`
- `payments.yourdomain.com`
- `api.yourdomain.com`

## Step 2: Map Domain to Cloud Run

Run these commands (replace `YOUR_DOMAIN` with your actual domain):

```bash
# Navigate to project directory
cd /Users/reggordon/github/globalpayments-api

# Set your domain (example: gp-api.yourdomain.com)
DOMAIN="YOUR_DOMAIN_HERE"

# Map the domain to your Cloud Run service
gcloud run domain-mappings create \
  --service globalpayments-api \
  --domain $DOMAIN \
  --region us-central1 \
  --project globalpayments-api-demo
```

## Step 3: Get DNS Records

After running the command above, Google Cloud will provide DNS records. You'll see output like:

```
Resource records:
  NAME                  TYPE  DATA
  gp-api.yourdomain.com A     216.239.32.21
  gp-api.yourdomain.com A     216.239.34.21
  gp-api.yourdomain.com A     216.239.36.21
  gp-api.yourdomain.com A     216.239.38.21
  gp-api.yourdomain.com AAAA  2001:4860:4802:32::15
  gp-api.yourdomain.com AAAA  2001:4860:4802:34::15
  gp-api.yourdomain.com AAAA  2001:4860:4802:36::15
  gp-api.yourdomain.com AAAA  2001:4860:4802:38::15
```

## Step 4: Update DNS Settings

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these DNS records:

1. Add A records (IPv4):
   - Type: `A`
   - Name: `gp-api` (or your subdomain)
   - Value: All four IP addresses from Step 3

2. Add AAAA records (IPv6):
   - Type: `AAAA`
   - Name: `gp-api` (or your subdomain)
   - Value: All four IPv6 addresses from Step 3

## Step 5: Wait for DNS Propagation

DNS changes can take 5 minutes to 48 hours. You can check status with:

```bash
# Check domain mapping status
gcloud run domain-mappings describe $DOMAIN \
  --region us-central1 \
  --project globalpayments-api-demo
```

## Step 6: Update HPP_RESPONSE_URL

Once your domain is verified, update your configuration:

1. Edit `.env.yaml`:
```yaml
HPP_RESPONSE_URL: "https://YOUR_DOMAIN/hpp-response"
```

2. Redeploy:
```bash
./deploy.sh
```

## Step 7: Enable SSL (Automatic)

Google Cloud Run automatically provisions an SSL certificate for your custom domain. This can take up to 15 minutes after DNS propagation.

Check SSL status:
```bash
gcloud run domain-mappings describe $DOMAIN \
  --region us-central1 \
  --project globalpayments-api-demo \
  --format="value(status.certificateStatus)"
```

## Quick Commands Reference

```bash
# List all domain mappings
gcloud run domain-mappings list --region us-central1

# Describe a specific mapping
gcloud run domain-mappings describe YOUR_DOMAIN --region us-central1

# Delete a domain mapping (if needed)
gcloud run domain-mappings delete YOUR_DOMAIN --region us-central1
```

## Alternative: Use Cloudflare (Recommended)

If you use Cloudflare for DNS, you can also:
1. Set up the domain mapping as above
2. Use Cloudflare's proxy (orange cloud) for additional DDoS protection
3. Get faster DNS propagation

## Troubleshooting

### Domain verification fails
- Make sure DNS records are exactly as provided by gcloud
- Wait longer for DNS propagation
- Check with `dig YOUR_DOMAIN` or `nslookup YOUR_DOMAIN`

### SSL certificate not provisioning
- Ensure DNS is fully propagated
- Check that you're using the exact records from gcloud
- Wait up to 24 hours for certificate provisioning

### "deceptive site" warning persists
- Report the old .run.app URL to Google Safe Browsing as resolved
- The custom domain should have a clean reputation
- If using a new domain, give it a few days to establish reputation

## Don't Have a Domain?

You can register one at:
- **Google Domains**: https://domains.google/ ($12-15/year)
- **Namecheap**: https://www.namecheap.com/ ($8-12/year)
- **Cloudflare**: https://www.cloudflare.com/products/registrar/ (at-cost pricing)

## Questions?

After you have your domain ready, I can help you with the specific DNS records and deployment configuration.
