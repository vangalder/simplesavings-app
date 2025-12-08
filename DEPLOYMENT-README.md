# Deployment Guide

## Current Status

✅ **Phase 0 Complete**: Next.js application initialized with:
- Next.js 14 with TypeScript and Tailwind CSS
- Responsive landing page matching Figma design
- Calculator component with compound interest calculations
- Chart visualization using ECharts
- Google Analytics integration (G-7SSJWHL9D0)
- Vercel Analytics integration
- Project structure for Clerk, Convex, and Stripe (ready for Phase 3)

## Next Steps for Deployment

### 1. Vercel CLI Setup (Manual - Requires User Interaction)

```bash
# Login to Vercel (interactive - opens browser)
vercel login

# Initialize and link project
vercel link --project simplesavings-app
```

### 2. Configure Environment Variables

```bash
# Add Google Analytics ID (already in vercel.json, but verify)
vercel env add NEXT_PUBLIC_GA_ID production
# Enter: G-7SSJWHL9D0

# Add other environment variables as needed:
# - Clerk keys (when configured)
# - Convex URL (when configured)
# - Stripe keys (when configured)
```

### 3. Deploy to Production

```bash
# Deploy to production
vercel --prod
```

### 4. Add Custom Domain

```bash
# Add custom domain
vercel domains add simplesavings.app

# Get DNS instructions
vercel domains inspect simplesavings.app --json > /tmp/dns-config.json
# Review DNS configuration and configure in Namecheap
```

### 5. Configure DNS in Namecheap

1. Log into Namecheap Dashboard
2. Navigate to Domain List → Manage → Advanced DNS
3. Add DNS records as provided by Vercel:
   - CNAME: `www` → `cname.vercel-dns.com`
   - Or A records with IPs from Vercel
4. Wait for DNS propagation (24-48 hours)

### 6. Enable Monitoring

1. Go to Vercel Dashboard → Project Settings → Monitoring
2. Enable uptime monitoring
3. Configure error alerts for 4xx/5xx responses
4. Set email notifications to: `trevor@vangalder.com`

### 7. Verify Deployment

```bash
# Check deployment status
vercel ls

# Verify DNS resolution
dig simplesavings.app +short

# Test application
curl -I https://simplesavings.app
```

## Project Structure

```
simplesavings-app/
├── app/
│   ├── layout.tsx          # Root layout with GA and Vercel Analytics
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles with Tailwind
├── components/
│   ├── Calculator.tsx       # Main calculator component
│   ├── Chart.tsx            # ECharts visualization
│   ├── Header.tsx           # Header with navigation
│   └── Footer.tsx           # Footer with legal links
├── convex/                  # Convex database (ready for Phase 3)
├── lib/
│   └── utils.ts             # Utility functions
├── vercel.json              # Vercel configuration
└── prep/
    └── CONFIGURATION-AND-CLI.md  # Complete CLI reference
```

## Notes

- Clerk and Convex are set up but commented out until credentials are configured
- Middleware is a no-op until Clerk is configured
- All environment variables should be added via Vercel CLI or Dashboard
- SSL certificates are automatic with Vercel
- Build passes successfully: `npm run build`
