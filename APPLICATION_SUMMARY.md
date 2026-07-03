# Application Summary — simplesavings.app

> One-page current-state overview. Deep detail lives in the dedicated docs — this
> file intentionally stays thin and points to them so there's a single source of truth.

## What it is

A savings calculator whose headline feature is an **AI savings strategist** (streaming
chat) that reads your projection and names the highest-impact levers to hit your goal
faster. The calculator is the free hook; the chat is metered and monetized.

## State (2026-07)

**Live in production** at https://simplesavings.app with Clerk sign-in and **real Stripe
payments on**.

- **Auth:** Clerk (Google OAuth) enforced server-side via Convex `ctx.auth`; sensitive/money
  writes are `internalMutation`; admin gated via `requireAdmin` (`identity.email === ADMIN_EMAIL`).
- **Backend:** Convex, prod deployment **`patient-crane-902`** (`patient-crane-902.convex.site`
  for webhooks). `simplesavings-app-ae970` is only the project id — not a host.
- **Payments:** Stripe (live) on the dedicated **simplesavings.app** account
  `acct_1TYxy4Pwai2zIs5e`; webhook is a Convex httpAction at `.../stripe-webhook`.
- **Pricing:** Pro **$6.99/mo**, Pro Sample **$2.99 → 150¢ credits**, free chat budget **40,000
  tokens** (~4 messages).
- **AI:** multi-provider capable; live default runs through **OpenRouter** (Claude Haiku) for
  both the blurb and the chat.
- **Layout:** single-column, centered, tabbed (Inputs / Chart / Insights) at **all** screen sizes.
- **i18n:** 7 locales; charts via **ECharts** (not Recharts).

## Where to read more

| Topic | Doc |
|---|---|
| System map, subsystems, data model, config keys | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| End-to-end user/actor flows | [`USER-FLOWS.md`](./USER-FLOWS.md) |
| Security posture & invariants | [`SECURITY.md`](./SECURITY.md) |
| User-facing product reference (AI prompt source) | [`docs/simplesavings-product-reference.md`](./docs/simplesavings-product-reference.md) |
| Production launch record | [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) |
| Agent rules + docs maintenance table | [`AGENTS.md`](./AGENTS.md) |
