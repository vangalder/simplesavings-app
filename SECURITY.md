# Security — simplesavings.app

> **Audience: developers & future agents.** The security posture and its invariants.
> Preserve the invariants below; if you change auth, webhooks, or a public route, update
> this file. Companion: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`USER-FLOWS.md`](./USER-FLOWS.md).

## Trust boundaries

| Boundary | Untrusted input | Where it's checked |
|---|---|---|
| Browser → Convex | JWT-authenticated queries/mutations | `ctx.auth.getUserIdentity()`; owner/admin helpers in `convex/lib/auth.ts` |
| Browser → Next API | request bodies to `app/api/*` | Clerk `auth()` (401 on authed routes); payload caps on `ai-blurb` |
| Clerk → Convex | `POST /clerk-webhook` | Svix signature (`CLERK_WEBHOOK_SECRET`) |
| Stripe → Convex | `POST /stripe-webhook` | Stripe signature (`STRIPE_WEBHOOK_SECRET`, SubtleCrypto verify) |

## Authentication & authorization

- **Identity:** Clerk (Google OAuth). The Convex-integration `aud:"convex"` claim rides on the
  **default** session token; the custom adapters (`app/providers.tsx`, `lib/serverAuth.ts`)
  ensure that token is what's sent. See `ARCHITECTURE.md` §2.
- **Join key:** `users.clerkId` = JWT `subject`. All self-scoped reads/writes derive the caller
  from `ctx.auth` — **never** from a caller-passed id (the pre-launch clerkId-spoofing hole is
  closed).
- **Ownership:** `requireScenarioOwner` gates every scenario/message read & write.
- **Admin:** `requireAdmin` compares `identity.email` to `ADMIN_EMAIL`.
  ⚠ **This requires the `email` claim in the Clerk session token.** In production the token was
  customized to include `"email": "{{user.primary_email_address}}"`. If that claim is dropped,
  `identity.email` is undefined, `requireAdmin` fails, and the admin panel breaks. The client
  admin allowlist is **UI-only**; server authority is `requireAdmin`.

## Secrets

- Loaded from env only (Vercel + Convex). `.env.local` is git-ignored (verified). No secret is
  committed, logged, or shipped to the client. Only `NEXT_PUBLIC_*` values reach the browser.
- `STRIPE_SECRET_KEY` exists in both Vercel (checkout route) and Convex (webhook). Keep them the
  **same live key for the simplesavings.app account** `acct_1TYxy4Pwai2zIs5e`.

## Input validation & data exposure

- **Public LLM routes are rate-limited + globally spend-capped** via `convex/rateLimit.ts`
  (`checkPublicLlm`): a durable **per-IP fixed window (20/min)** that survives across
  serverless instances, plus a **global daily circuit breaker** that hard-caps total public
  LLM calls per UTC day (`app_config.publicLlmDailyCap`, default 6000 — tune at runtime, no
  deploy). Applied to `ai-blurb` and `narrative`. This is the "bill cannot exceed ~$X/day"
  guarantee even against rotating IPs. Both routes fail **open** on a limiter error (a Convex
  blip shouldn't break the funnel) — the global cap holds under normal operation.
- `app/api/ai-blurb/route.ts`: also keeps a fast in-memory per-IP check + an **8k-char payload
  cap (413)**. `app/api/narrative/route.ts`: **4k-char payload cap (413)**.
- `convex/appConfig.ts` `getConfig` is intentionally public (non-secret display values only:
  prices, budgets, model names). `setConfig` is admin-gated; `setConfigInternal` is CLI-only.
- `blurbLogs.logBlurbCall` is public but insert-only (exposes no data). Read functions are admin-gated.

## Security invariants (must stay true)

1. **All paid-state / money writes are `internalMutation`** — `setUserPro`, `unsetUserPro`,
   `grantAiCredits`, `setStripeCustomer`, `completeTasteTestPurchase`, `upsertFromClerk`,
   `setConfigInternal`. They are unreachable from the public API and only invoked by webhooks/CLI.
2. **Chat metering is server-authoritative** — the `getMyAccess` gate and `recordChatUsage` live
   in `app/api/insights/route.ts`; the client cannot skip payment or metering.
3. **`paymentTestMode` affects admins only** — honored solely in `checkout/route.ts` behind an
   admin email check, and the grant runs `applyAdminTestGrant` whose authority is enforced in
   Convex via `requireAdmin`. A forged non-admin call is rejected server-side.
4. **Authed routes 401 without a session** — `insights`, `checkout`, `shares/record`.
5. **Webhooks verify signatures** before doing any work.
6. **Public LLM routes are rate-limited and globally spend-capped** (`convex/rateLimit.ts`);
   the daily cap bounds worst-case spend regardless of how traffic is distributed.

## Known gaps (documented risks — fix before they matter)

| Gap | File | Risk | Mitigation idea |
|---|---|---|---|
| `insights` **trusts client-supplied `provider`/`model`** | `app/api/insights/route.ts` | an authed user could point chat at an arbitrary/expensive model (bounded by the free-token meter / 402, so blast radius is small) | enforce a server-side model allowlist |
| Account farming on the free chat taste | `app/api/insights/route.ts` | each new Google account grants ~4 free messages; many accounts = some cost | acceptable for now (OAuth friction); add per-account/global chat caps if abused |

Not data-exposure holes; cost/abuse surfaces. The previously wide-open `narrative` route is now
behind the durable rate limiter + global daily cap (see Input validation above).
