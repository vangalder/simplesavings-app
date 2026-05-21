# simplesavings.app — Product Reference

> **Maintenance note:** Update this file (`docs/simplesavings-product-reference.md`) whenever a public-facing feature changes. It is loaded into the AI system prompt on every request so the AI can answer user questions about the app accurately.

---

## What is simplesavings.app?

simplesavings.app is a free compound interest calculator and financial planning tool built by an independent developer. Anyone can model savings growth, investment projections, or retirement withdrawal plans — no account required. The AI chat is the premium feature.

---

## The Calculator

### Inputs

| Field | What it does | URL param |
|---|---|---|
| **Starting Amount** | Initial balance or lump sum | `sa` |
| **Monthly Contribution** | Amount added each month. Enter a negative number to model withdrawals instead | `mc` |
| **Timeframe** | How long to project. Two modes: a plain number of years, or a specific target date (date picker). Switch between them with the toggle button. | `ty` (years) or `td` (ISO date) |
| **Annual Return Rate** | Expected yearly growth rate as a percentage (e.g. 7 for 7%) | `ir` |
| **Goal Amount** | Optional. Sets a horizontal target line on the chart. Appears in the AI co-pilot context as the user's stated objective. | `ga` |

### Outputs

- **Total Value** — projected end balance
- **Principal Paid** — total amount the user actually put in
- **Interest Earned** — growth above principal

### Withdrawal mode

When Monthly Contribution is negative the app switches to withdrawal mode automatically: labels change, the chart shows the balance depleting, and the AI co-pilot frames advice around sustainability and sequence risk.

### Chart

Three display styles, switchable via buttons at the top of the chart: **Area** (default — stacked filled areas showing principal vs. interest growth), **Bar** (stacked columns), **Line** (clean trend line). All three update instantly as inputs change.

- The X-axis auto-scales: months for projections under 2 years, years for longer ones
- Principal (blue) and interest earned (orange) are shown as separate stacked layers so users can visually see the compounding effect grow over time
- If the balance depletes to zero (withdrawal mode), the chart stops at that point rather than going negative
- Hovering over any point shows the exact values for that period

### Goal Amount & Goal Line

The optional Goal Amount field sets a horizontal target line across the chart. When set:
- A dashed line appears at that value on the chart
- The AI blurb CTA changes to show the specific shortfall if the projection falls short (e.g. "Explore $234,000 gap →")
- The AI co-pilot receives the goal as part of its context and factors it into strategy recommendations
- Set Goal Amount to 0 to remove the goal line

### Chart Image Export

Saving the chart as an image file is not currently a feature of the app.

### Compound interest formula

Monthly compounding. Future value = principal × (1 + r/12)^n + contribution × [(1 + r/12)^n − 1] / (r/12), where r = annual rate / 100 and n = months.

---

## Languages & Currencies

The app is fully multilingual. The language/currency is set by the URL locale prefix (e.g. `/es-MX/`, `/fr-FR/`). Users switch locale from the language picker in the header.

| Locale | Language | Currency |
|---|---|---|
| `en` | English | USD |
| `es-MX` | Español (México) | MXN |
| `es-ES` | Español (España) | EUR |
| `it` | Italiano | EUR |
| `pt-BR` | Português (Brasil) | BRL |
| `pt-PT` | Português (Portugal) | EUR |
| `fr-FR` | Français (France) | EUR |

All calculator labels, results, chart tooltips, and the AI co-pilot responses are delivered in the active language. The AI always responds in the user's locale language regardless of what language the user writes in.

---

## Sharing

The **Share** button opens the Share Modal with two options:

1. **Share Link** — sends a direct URL to a recipient's email. Requires sign-in. The URL encodes all calculator inputs as query params so the exact scenario is reproduced when the link is opened.

2. **Share Narrative** — AI-generated text summary of the plan. Three styles:
   - **Simple** — concise one-paragraph summary
   - **Expanded** — more detailed with context
   - **Bare Bones** — a plain-text formula with no AI, always instant: e.g. *"25 years at 7%, starting with $10,000 + $500/mo: $567,000 (https://simplesavings.app)"*
   
   Up to 3 AI-generated refreshes per style (bare bones is unlimited). Copy to clipboard.

---

## AI Features

### Insight Blurb

Every time the calculator inputs change, a short AI-generated insight appears below the results (after a ~1.5 second pause). It highlights what's interesting or notable about the specific numbers — not generic advice. Below the blurb is a CTA button that opens the AI chat. If a goal is set and the projection falls short, the button labels the specific shortfall amount.

### AI Chat (Co-Pilot)

An inline conversational AI thread that lives below the blurb. The AI knows the user's exact calculator state at all times and can:
- Answer questions about the plan
- Surface savings strategies and hidden leverage points
- Update calculator fields directly mid-conversation (the chart updates instantly when it does)
- Model "what if" scenarios on request

The AI opens every new conversation with a proactive question seeded from the blurb. Past conversations are saved and restored when the user returns.

**Access requirements:** The chat requires sign-in plus one of:
- A Pro subscription
- A one-time credit purchase (30 messages)
- Admin-granted free token budget (used for promotions, demos, or classroom access)

---

## Pricing

| Plan | Price | What's included |
|---|---|---|
| **One-Time** | $4.99 | ~30 messages of AI analysis on one plan |
| **Pro** | $9.99/month | Unlimited AI conversations |
| **Free tier** | $0 | Full calculator, sharing, narratives, insight blurb — no AI chat |

Payment is handled via Stripe. Users who have not purchased see an upsell prompt when they click the AI chat CTA.

---

## Saving & Persistence

- **Without an account:** Calculator state is saved in browser localStorage and restored on return. State is also encoded in the URL (shareable).
- **With an account (signed in via Google):** Calculator state is automatically saved to the cloud (Convex database) and restored on any device, even after clearing the browser. AI conversation history is also saved and restored per plan.
- **Sign-in provider:** Google (via Clerk). No password required.

---

## Layout

- **Desktop:** Two-column layout. Left column: calculator inputs + results + AI chat. Right column: chart + goal input.
- **Mobile:** Three tabs at the bottom: **Inputs**, **Chart**, **Insights** (AI chat or upsell prompt). The chat input bar sticks above the keyboard when typing.
- **Keyboard shortcut:** Cmd-S / Ctrl-S saves the current calculation.
