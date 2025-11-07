# Domain Verification Steps for payments.reggordon.com

## Step 1: Verify Domain Ownership

Before mapping your domain to Cloud Run, you need to verify you own `reggordon.com`.

### Option A: Using Google Search Console (Recommended)

1. Go to: https://search.google.com/search-console
2. Click "Add Property"
3. Enter: `reggordon.com`
4. Choose verification method:
   - **DNS TXT Record** (easiest): Add a TXT record to your DNS
   - **HTML File**: Upload a file to your website root
   - **HTML Tag**: Add a meta tag to your homepage

5. Follow the instructions and click "Verify"

### Option B: Using Webmaster Central

1. Go to: https://www.google.com/webmasters/verification/
2. Add `reggordon.com`
3. Follow verification steps

### Option C: Via gcloud CLI

```bash
# This will guide you through domain verification
gcloud domains verify reggordon.com
```

## Step 2: After Domain is Verified

Once `reggordon.com` is verified in Google Search Console or Webmaster Central, run:

```bash
gcloud beta run domain-mappings create \
  --service=globalpayments-api \
  --domain=payments.reggordon.com \
  --region=us-central1 \
  --project=globalpayments-api-demo
```

## Step 3: Get DNS Records

After successful mapping, you'll receive DNS records like:

```
NAME                      TYPE  DATA
payments.reggordon.com    A     216.239.32.21
payments.reggordon.com    A     216.239.34.21
payments.reggordon.com    A     216.239.36.21
payments.reggordon.com    A     216.239.38.21
payments.reggordon.com    AAAA  2001:4860:4802:32::15
payments.reggordon.com    AAAA  2001:4860:4802:34::15
payments.reggordon.com    AAAA  2001:4860:4802:36::15
payments.reggordon.com    AAAA  2001:4860:4802:38::15
```

## Step 4: Add DNS Records to Your Domain Registrar

Go to where you registered `reggordon.com` (GoDaddy, Namecheap, Cloudflare, etc.) and add:

### A Records (IPv4):
- Name: `payments`
- Type: `A`
- Value: `216.239.32.21`
- Repeat for all 4 IP addresses

### AAAA Records (IPv6):
- Name: `payments`
- Type: `AAAA`
- Value: All IPv6 addresses from Step 3

## Step 5: Wait for DNS Propagation

Wait 5-30 minutes, then check:

```bash
# Check if DNS is propagated
dig payments.reggordon.com

# Check domain mapping status
gcloud beta run domain-mappings describe payments.reggordon.com \
  --region=us-central1 \
  --project=globalpayments-api-demo
```

## Step 6: Update Configuration

Once SSL is provisioned (automatic, takes ~15 mins), update `.env.yaml`:

```yaml
HPP_RESPONSE_URL: "https://payments.reggordon.com/hpp-response"
```

Then redeploy:

```bash
./deploy.sh
```

## Quick Start: Do This First!

**Right now, go to:** https://search.google.com/search-console

1. Click "Add Property"
2. Enter: `reggordon.com`
3. Choose "DNS TXT record" verification
4. Add the TXT record they provide to your DNS
5. Click "Verify"

Once that's done, let me know and I'll run the domain mapping command for you!
