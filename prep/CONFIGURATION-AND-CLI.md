# Configuration and CLI Commands

## Configuration Values

### Project Configuration
- **Custom Domain**: `simplesavings.app`
- **Vercel Project Name**: `simplesavings-app`
- **Domain Registrar**: `namecheap`
- **Google Analytics Property Measurement ID**: `G-7SSJWHL9D0`
- **Vercel Alert Email**: `trevor@vangalder.com`

### Environment Variables

#### Required for Production
- `NEXT_PUBLIC_GA_ID`: `G-7SSJWHL9D0` (Google Analytics)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: (Clerk authentication - to be configured)
- `CLERK_SECRET_KEY`: (Clerk authentication - to be configured)
- `NEXT_PUBLIC_CONVEX_URL`: (Convex database - to be configured)
- `CONVEX_DEPLOYMENT`: (Convex deployment key - to be configured)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: (Stripe payments - to be configured)
- `STRIPE_SECRET_KEY`: (Stripe payments - to be configured)
- `STRIPE_WEBHOOK_SECRET`: (Stripe webhook - to be configured)

## Vercel CLI Commands

### Initial Setup
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Initialize project (link to existing project)
vercel

# Link to specific project
vercel link --project simplesavings-app
```

### Deployment
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# List deployments
vercel ls

# View deployment details
vercel inspect [DEPLOYMENT_URL]
```

### Domain Management
```bash
# Add custom domain
vercel domains add simplesavings.app

# List domains
vercel domains ls

# Inspect domain configuration
vercel domains inspect simplesavings.app

# Remove domain
vercel domains rm simplesavings.app
```

### Environment Variables
```bash
# Add environment variable
vercel env add [VAR_NAME]

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm [VAR_NAME]

# Pull environment variables to local .env file
vercel env pull .env.local
```

### Analytics and Monitoring
```bash
# Enable analytics
vercel analytics enable

# View analytics
vercel analytics

# View logs
vercel logs [DEPLOYMENT_URL]

# View function logs
vercel logs [DEPLOYMENT_URL] --follow
```

## DNS Configuration (Namecheap)

### Manual Configuration Steps
1. Log into Namecheap Dashboard
2. Navigate to Domain List → Manage → Advanced DNS
3. Add DNS records as provided by Vercel:
   - **CNAME record**: `www` → `cname.vercel-dns.com`
   - **A records**: Use IPs provided by Vercel (if CNAME not supported)
4. Wait for DNS propagation (24-48 hours)

### DNS Verification
```bash
# Check DNS resolution
dig simplesavings.app +short
nslookup simplesavings.app

# Check SSL certificate
curl -I https://simplesavings.app
```

## Deployment History

### Initial Deployment
- **Date**: TBD
- **Status**: Pending
- **Notes**: Initial setup with Next.js 14, Clerk, Convex, Stripe

## Deviations and Notes

- All Vercel operations performed via CLI as per requirements
- SSL certificates managed automatically by Vercel
- Monitoring configured via Vercel Dashboard (Project Settings → Monitoring)
