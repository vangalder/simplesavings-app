# simplesavings.app

A savings calculator with an **AI savings strategist** built in. Model your money,
then talk through the highest-impact moves to reach your goal faster. Live in
production at **https://simplesavings.app** with sign-in and real payments.

The calculator is the free hook; the strategist chat is the differentiated, metered
feature (free taste → Pro Sample credits → Pro subscription).

## Features

- **Compound-interest calculator** — starting amount, monthly contribution, timeframe (years
  or target date), and rate; future value with principal/interest split.
- **AI savings strategist** — a streaming chat that reads your projection, names the levers,
  and can update the calculator for you via inline "Calculator updated" chips.
- **Interactive charts** — area/bar/line growth visualization (ECharts), doubling markers, goal line.
- **Accounts & cloud save** — Clerk (Google) sign-in, saved scenarios, share links.
- **Monetization** — Stripe: $2.99 Pro Sample (one-time credits) and $6.99/mo Pro (unlimited chat).
- **7 languages / multi-currency** — next-intl (en, es-MX, es-ES, it, pt-PT, pt-BR, fr-FR); USD/MXN/EUR/BRL + crypto display.

## Tech stack

| | |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript, Tailwind |
| Backend | Convex (prod deployment `patient-crane-902`) |
| Auth | Clerk (Google OAuth), integrated with Convex |
| Payments | Stripe (live) |
| AI | Multi-provider; default runs through OpenRouter (Claude Haiku) |
| Charts | ECharts (`echarts-for-react`) |
| Hosting | Vercel + Convex Cloud |

## Getting started

```bash
npm install
npm run dev        # Next.js dev server (also run `npx convex dev` for the backend)
npm run build      # production build
npm start          # serve production build
npm run lint
```

Deploy convention: after `git push origin main`, run `npx convex deploy --yes` to ship the
backend. Environment variables (Clerk, Convex, Stripe, and the AI provider keys) live in Vercel
and Convex — see the full list in [`ARCHITECTURE.md`](./ARCHITECTURE.md#environment-variables).

## Documentation

| Doc | What it covers |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System map, subsystems, data model, auth adapters, config keys |
| [`USER-FLOWS.md`](./USER-FLOWS.md) | Every end-to-end actor flow |
| [`SECURITY.md`](./SECURITY.md) | Trust boundaries, auth, security invariants, known gaps |
| [`docs/simplesavings-product-reference.md`](./docs/simplesavings-product-reference.md) | User-facing product doc (also injected into every AI prompt) |
| [`AGENTS.md`](./AGENTS.md) | Agent-facing rules + the docs maintenance table |
| [`APPLICATION_SUMMARY.md`](./APPLICATION_SUMMARY.md) | One-page current-state overview |

## License

© 2026 simplesavings.app. All rights reserved.
