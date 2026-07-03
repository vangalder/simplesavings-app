# Architecture — simplesavings.app

> **Audience: developers & future agents.** This is the authoritative system map.
> Every claim here is verified against code with exact paths. When you change the
> system, update this file (see the maintenance table in `AGENTS.md`).
> Companion docs: [`USER-FLOWS.md`](./USER-FLOWS.md) · [`SECURITY.md`](./SECURITY.md) · [`docs/simplesavings-product-reference.md`](./docs/simplesavings-product-reference.md) (the user-facing doc that is live-injected into every AI prompt).

## What it is

A savings calculator whose differentiated feature is an **AI savings strategist**
(streaming chat) that reads your projection and names the highest-impact levers.
The calculator is the free hook; the chat is metered and monetized. Live in
production at https://simplesavings.app with real payments.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind, next-intl (7 locales), ECharts (`echarts-for-react`) |
| Backend | Convex (queries/mutations/internalMutations/httpActions) — prod deployment **`patient-crane-902`** |
| Auth | Clerk (Google OAuth), integrated with Convex via `aud:"convex"` on the default session token |
| Payments | Stripe (live) on the dedicated **simplesavings.app** account `acct_1TYxy4Pwai2zIs5e` |
| AI | Multi-provider (Anthropic/OpenAI/Google/OpenRouter/xAI); **live default = OpenRouter** (`openrouter:anthropic/claude-haiku-4.5` for both blurb & chat) |
| Hosting | Vercel (Next.js) + Convex Cloud |

> **Deployment naming (single source of truth):** the prod Convex deployment is
> **`patient-crane-902`** → cloud `patient-crane-902.convex.cloud`, HTTP actions
> `patient-crane-902.convex.site`. `simplesavings-app-ae970` is only the Convex
> **project id** (and the local dev deployment name in `.env.local`) — never use it
> as a host.

## System map

```
                          Browser (Next.js client)
   ┌───────────────────────────────────────────────────────────────┐
   │  app/page.tsx: Header · Calculator · PricingSection · Footer   │
   │  app/providers.tsx  ── ConvexProviderWithAuth + custom Clerk    │
   │                        adapter (useConvexAuthFromClerk)         │
   └───────┬───────────────────────────────┬───────────────────────┘
           │ useQuery/useMutation (JWT)     │ fetch()
           ▼                                ▼
   ┌─────────────────┐        ┌──────────────────────────────────────┐
   │  Convex backend │        │  Next.js API routes (app/api/*)       │
   │  patient-crane- │◀───────│  insights (chat SSE, authed, metered) │
   │  902            │ setAuth│  checkout (Stripe, authed)            │
   │                 │(token) │  ai-blurb (public, rate-limited)      │
   │  ctx.auth gate  │        │  narrative, openrouter-models (public)│
   │  8 tables       │        │  shares/record (authed)               │
   └───┬─────────────┘        └──────────┬───────────────────────────┘
       │ internal.* (webhooks only)      │ LLM APIs (Anthropic/OpenAI/
       ▼                                 │ Google/OpenRouter/xAI), Stripe
   ┌─────────────────────────┐           ▼
   │ convex/http.ts          │     External providers
   │  POST /clerk-webhook     │◀─── Clerk (Svix)
   │  POST /stripe-webhook    │◀─── Stripe (live webhook we_1Toyq…)
   └─────────────────────────┘
```

## Subsystems

### 1. Convex backend (`convex/`)

Public functions derive the caller from `ctx.auth` (never a caller-passed id).
Sensitive/money writes are `internalMutation` (unreachable from the public API) and
are only invoked by the webhooks in `http.ts`.

| File | Responsibility | Notable functions |
|---|---|---|
| `convex/users.ts` | identity, credits/Pro state, admin stats | `getMyUser`/`getMyAccess`/`getAiCreditBalance` (public self); `ensureUser`/`recordChatUsage`/`updateUserPreferences` (public self); `seedTestCredits`/`applyAdminTestGrant`/`getAdminStats` (admin-gated); `setUserPro`/`unsetUserPro`/`grantAiCredits`/`setStripeCustomer`/`upsertFromClerk` (**internal**); `getClerkIdByStripeCustomer` (internalQuery) |
| `convex/scenarios.ts` | scenario CRUD + blurb cache | all public, owner-scoped via `requireScenarioOwner`; free users capped to 1 scenario |
| `convex/messages.ts` | chat history | `getMessagesByScenario`/`addMessage`/`clearMessages` (owner-scoped) |
| `convex/purchases.ts` | one-time Pro Sample fulfillment | `completeTasteTestPurchase` (**internal**, idempotent on `stripePaymentIntentId`) |
| `convex/appConfig.ts` | runtime key/value config | `getConfig` (public read); `setConfig` (admin); `setConfigInternal` (internal, CLI) |
| `convex/shares.ts` | share tracking | `recordShare` (public, self); `getShareAnalytics` (admin) |
| `convex/blurbLogs.ts` | blurb telemetry | `logBlurbCall` (public insert-only); `getModelStats`/`getRecentLogs` (admin) |
| `convex/providerConfigs.ts` | per-user model prefs | all public, self-scoped |
| `convex/http.ts` | webhooks | `POST /clerk-webhook` (Svix) → `internal.users.upsertFromClerk`; `POST /stripe-webhook` (SubtleCrypto verify) → internal user/purchase mutations |
| `convex/auth.config.ts` | Convex↔Clerk JWT provider | `{ domain: CLERK_JWT_ISSUER_DOMAIN, applicationID: "convex" }` |
| `convex/lib/auth.ts` | auth helpers | `getIdentity`, `getCurrentUser(OrNull)`, `requireAdmin`, `requireScenarioOwner` |

**Auth join key:** users are keyed by `users.clerkId` = Clerk user id = JWT `subject`
claim (looked up via `by_clerk_id`, NOT `tokenIdentifier`). Deliberate — documented in
`convex/lib/auth.ts` header. `requireAdmin` compares `identity.email` to
`process.env.ADMIN_EMAIL` (single-email allowlist; **requires the `email` claim in the
Clerk session token** — see `SECURITY.md`).

### 2. Next.js server layer (`app/api/`, `lib/`)

| Route | Method | Auth | Calls | Notes |
|---|---|---|---|---|
| `app/api/insights/route.ts` | POST | **required (401)** | `getMyAccess` gate → LLM stream → `recordChatUsage` | metered chat (SSE); 402 `upgrade_required` when out of access; parses `<calc_update>` tags server-side |
| `app/api/checkout/route.ts` | POST | **required (401)** | `ensureUser`, Stripe `checkout.sessions.create`, `applyAdminTestGrant` | `paymentTestMode` honored **only for admins** |
| `app/api/ai-blurb/route.ts` | POST | public | LLM, `getConfig(defaultBlurbModel)`, `logBlurbCall` | in-memory **per-IP rate limit (10/min)** + **8k-char cap** |
| `app/api/narrative/route.ts` | POST | public | Anthropic Haiku only | ⚠ **no rate limit / no size cap** (see `SECURITY.md`) |
| `app/api/openrouter-models/route.ts` | GET | public | OpenRouter model list | admin model-picker catalog; static fallback |
| `app/api/shares/record/route.ts` | POST | **required (401)** | `recordShare` | |
| `app/api/insights/local/route.ts` | POST | — | — | stub, returns 501 |

**Auth adapters (the non-obvious part):**
- `app/providers.tsx` — `useConvexAuthFromClerk()` passed to `ConvexProviderWithAuth`
  (NOT `ConvexProviderWithClerk`). It always calls `getToken({skipCache})` — the
  **default** Clerk session token, which carries `aud:"convex"`. The stock
  `convex/react-clerk` adapter requested a nonexistent `convex` JWT template and sent
  no token → "Not authenticated" on every call. This hand-rolled hook is the fix.
- `lib/serverAuth.ts` `getConvexToken()` — the server analog: tries `template:"convex"`,
  falls back to the default token. Feeds `ConvexHttpClient.setAuth()` in every authed route.

**Model dispatch:** config strings are `"provider:modelId"`. `anthropic` → Anthropic SDK;
everything else (`openai`/`openrouter`/`xai`/`google`) → OpenAI SDK with per-provider
`baseURL`/`apiKey` overrides. Cost is computed from per-model rate tables with a default
fallback.

### 3. Frontend (`app/`, `components/`)

- **Pages:** `/` (Calculator), `/profile` (auth-gated account + AdminPanel), `/plan/[id]`
  (scenario detail + `InsightsPanel` chat). `app/insights/page.tsx` redirects to `/`.
- **`components/Calculator.tsx`** — the orchestrator: compounding math (`useMemo`), 3-layer
  persistence (URL 500ms / localStorage 1s / Convex autosave 4s), and the tab system.
- **Layout:** single-column, centered `max-w-2xl mx-auto`, tabbed (`Inputs`/`Chart`/`Insights`
  via `activeTab` + the `mobileTab()` helper) with a fixed bottom tab nav — **at all screen
  sizes** (the old `lg:` two-column grid is gone).
- **Auth gating:** components gate writes/queries on `useConvexAuth().isAuthenticated`
  (`isConvexAuthed`), using `"skip"` until authed. `Header` self-heals provisioning via
  `users.ensureUser`.

### 4. Config, i18n, data (`i18n/`, `messages/`, `lib/currency.ts`, `tailwind.config.ts`)

- **i18n (next-intl):** 7 locales (`en`, `es-MX`, `es-ES`, `it`, `pt-PT`, `pt-BR`, `fr-FR`);
  locale is **cookie/header-based, not in the URL** (`i18n/request.ts`; `middleware.ts` is
  Clerk-only). 18 message namespaces in `messages/*.json`.
- **`app_config` (runtime, admin-editable):** see the table in
  `docs/simplesavings-product-reference.md` and below.
- **Currency:** `lib/currency.ts` (7 currencies incl. crypto, display-only formatting);
  `components/AnimatedCurrency.tsx` renders space-separator locales digit-by-digit to avoid
  the animated-number library's oversized separator gap.

## Data model (`convex/schema.ts`)

| Table | Key fields | Indexes |
|---|---|---|
| `users` | `clerkId`, `email?`, `isPro`, `stripeCustomerId?`, `aiCreditsGranted?`/`aiCreditsUsed?` (cents), `freeChatTokensUsed?` (live free meter), `locale?`/`currency?` | `by_clerk_id`, `by_stripe_customer` |
| `scenarios` | inputs (`startingAmount`…`interestRate`), results, `goalAmount?`, `chartType?`, blurb cache (`blurbEn?`…`blurbInputsHash?`), `chatTokensUsedFree?` **(deprecated)** | `by_user` |
| `messages` | `scenarioId`, `userId`, `role`, `content`, token/cost telemetry | `by_scenario`, `by_user` |
| `purchases` | `stripePaymentIntentId`, `status`, `creditsGranted?` | `by_user`, `by_payment_intent` (idempotency) |
| `app_config` | `key`, `value` | `by_key` |
| `shares` | `sharedBy`, `sharedWith`, `url` | `by_shared_by`, `by_shared_with` |
| `blurb_logs` | provider/model/tokens/latency/cost | `by_provider_model`, `by_created_at` |
| `provider_configs` | `userId`, `provider`, `model`, `isDefault` | `by_user` |

## `app_config` keys (current prod values)

| Key | Value | Controls |
|---|---|---|
| `proPriceDisplay` | `6.99` | displayed Pro price |
| `proSamplePriceDisplay` | `2.99` | displayed Pro Sample price |
| `proSampleCreditLimitCents` | `150` | credits granted per Pro Sample purchase |
| `chatFreeTokenBudget` | `40000` | free-tier chat token allowance (~4 messages) |
| `paymentTestMode` | `off` | admin-only Stripe bypass (`off`/`sample`/`pro`) |
| `defaultBlurbModel` | `openrouter:anthropic/claude-haiku-4.5` | blurb model |
| `defaultConversationModel` | `openrouter:anthropic/claude-haiku-4.5` | chat model |

## Environment variables

**Client:** `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
**Server — AI:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`.
**Server — Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PRO_SAMPLE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.
**Server — auth/admin:** `ADMIN_EMAIL`, `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`.
Set on Vercel (Next.js runtime) and Convex (backend) separately; `STRIPE_SECRET_KEY` lives in both.

## Brand tokens (`tailwind.config.ts`)

Primary teal `#206A5D` · secondary lime `#81B214` · accent gold `#FFCC29` · accent-orange
`#F58634`. Fonts: Inter (sans), Space Grotesk (display), Roboto Mono (mono).
