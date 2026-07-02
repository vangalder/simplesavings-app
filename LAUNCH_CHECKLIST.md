# Launch Checklist — simplesavings.app first-dollar readiness

All code for the monetization/security/UX plan is committed on `main` (not yet
pushed). **Do not `git push` until the external gates below are done** — the new
Next app calls Convex functions and a Clerk `convex` JWT template that must exist
in production first, or the live site's signed-in features will break.

## What's done (code, committed locally)
- Convex backend fully re-authed (`ctx.auth`); paid-state writes are internal;
  Stripe webhook moved to a Convex httpAction; `/api/insights` clerkId spoof
  closed; server-side free-tier metering; admin gated.
- Pricing reconciled in code to **$6.99 Pro / $2.99 Sample / 150¢ credits**; the
  "co-pilot" label purged everywhere.
- Public pricing section + AI-first copy (7 locales).
- Repo cleanup (prep/ untracked, dead components removed, summary refreshed).
- UX: responsive overflow fix, line-chart span fix, toggle focus fix, toast
  reposition, currency formatting + display-only label, i18n gaps, AI blurb
  bounded loading + deterministic fallback.

## External gates (only you can do these)

### 1. Clerk — create the `convex` JWT template
Clerk Dashboard → JWT Templates → New → **Convex** preset (name must be exactly
`convex`). Ensure `email` is in the claims. This is required for `ctx.auth` to
work at all. *(Verified 2026-07: no JWT templates exist yet.)*

### 2. Clerk — production instance/keys (P0-clerk-prod)
The site currently runs on a **dev** Clerk instance (`allowed-terrier-50.clerk.
accounts.dev`), hence the "Development mode" banner. Create/switch to a production
Clerk instance, then set in Vercel prod env: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
(`pk_live_…`) and `CLERK_SECRET_KEY` (`sk_live_…`). Create the `convex` JWT
template on the production instance too. Update `CLERK_JWT_ISSUER_DOMAIN` (below)
to the production issuer.

### 3. Stripe — create the two live prices
Live mode → products: **Pro** recurring **$6.99/mo**, **Pro Sample** one-time
**$2.99**. Set Vercel prod env `STRIPE_PRO_PRICE_ID` and
`STRIPE_PRO_SAMPLE_PRICE_ID` to the new price IDs.

### 4. Stripe — point the webhook at Convex
Add endpoint `https://simplesavings-app-ae970.convex.site/stripe-webhook` with
events: `checkout.session.completed`, `customer.subscription.created/updated/
deleted/paused/resumed`. Copy the signing secret to Convex prod env
`STRIPE_WEBHOOK_SECRET`. Disable the old `/api/webhooks/stripe` endpoint.

## Launch sequence (do in this order)

1. **Set Convex prod env** (deployment `simplesavings-app-ae970`):
   `npx convex env set CLERK_JWT_ISSUER_DOMAIN "<prod-issuer-url>" --prod`
   `npx convex env set ADMIN_EMAIL "trevor@vangalder.com" --prod`
   Confirm `STRIPE_SECRET_KEY` (live) and `STRIPE_WEBHOOK_SECRET` are set --prod.
2. **Set Vercel prod env**: the Clerk keys, Stripe price IDs, `ADMIN_EMAIL`.
3. **Push + deploy together** (Next app and Convex must move as one):
   `git push origin main` then immediately `npx convex deploy --yes`.
4. **Set prod app_config** (after deploy, via the now-internal CLI function):
   ```
   npx convex run appConfig:setConfigInternal '{"key":"proPriceDisplay","value":"6.99"}' --prod
   npx convex run appConfig:setConfigInternal '{"key":"proSamplePriceDisplay","value":"2.99"}' --prod
   npx convex run appConfig:setConfigInternal '{"key":"proSampleCreditLimitCents","value":"150"}' --prod
   npx convex run appConfig:setConfigInternal '{"key":"chatFreeTokenBudget","value":"40000"}' --prod
   ```
   Leave `paymentTestMode` at `sample` for now.
5. **Adversarial security pre-flight** (from an UNauthenticated ConvexHttpClient
   and a non-admin account) — all must fail:
   - `api.users.setUserPro / grantAiCredits`, `api.purchases.completeTasteTestPurchase`
     → "function not found" (they're internal).
   - `api.appConfig.setConfig`, `api.users.getAdminStats`, `api.shares.getShareAnalytics`
     → throw for non-admin/unauth.
   - `POST /api/insights` with no session + `{"clerkId":"<id>"}` in the body → 401.
6. **Flip live** (config only, no deploy):
   `npx convex run appConfig:setConfigInternal '{"key":"paymentTestMode","value":"off"}' --prod`
7. **Live-card test** (real card, then refund): fresh account → ~4 free AI
   messages → paywall → buy Pro Sample $2.99 (confirm +150 credits, webhook 200)
   → subscribe $6.99 (confirm Pro) → cancel → refund both.

## Still needs a human eye (couldn't verify headlessly)
- **Visual QA at 375 / 768 / 1440px**: confirm zero horizontal overflow, the
  line chart spans the full domain, header controls reachable, toast clears the
  header, palm art doesn't obscure data, and the years/date toggle keeps focus.
  The code fixes are in; they just haven't been eyeballed in a browser.
