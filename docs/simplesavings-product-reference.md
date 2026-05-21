# simplesavings.app — Product Reference

> **Maintenance note:** Update this file (`docs/simplesavings-product-reference.md`) whenever a public-facing feature changes. It is loaded into the AI system prompt on every request so the AI can answer user questions about the app accurately.

---

## What is simplesavings.app?

simplesavings.app is a free compound interest calculator and financial planning tool built by an independent developer. Anyone can model savings growth, investment projections, or retirement withdrawal plans — no account required. The AI chat is the premium feature.

---

## 🚀 What Makes simplesavings.app Different

Every phone has a compound interest calculator. simplesavings.app is something different. Here is what sets it apart — and why it matters:

### 🤖 A Live AI Strategist Built Into the Calculator
Most calculators give you a number and leave you alone. simplesavings.app has a live AI strategist built directly into the interface. The moment you enter your numbers, it generates a personalized insight about your specific projection — not generic tips. Then it opens a full conversation where you can ask anything, test scenarios, and get real strategic advice tailored to your exact situation. The AI can update the calculator fields mid-conversation so you see the impact on the chart instantly.

### 🌍 Multilingual — Fully, Not Partially
simplesavings.app works in 7 languages — English, Spanish (Mexico), Spanish (Spain), Italian, Portuguese (Brazil), Portuguese (Portugal), and French — with automatic currency switching (USD, MXN, EUR, BRL). Every label, result, chart tooltip, and AI response adapts. The AI itself responds in your language. No other free calculator does this.

### 📅 Target Date Mode
Instead of entering "25 years," you can pick an actual target date — a retirement date, a home purchase, a milestone. The calculator counts down in exact years and months and recalculates live. This makes the plan feel real, not hypothetical.

### 📤 Share Your Plan — Two Ways
One tap opens two sharing options: send a direct link that reproduces your exact scenario down to every input, or generate an AI-crafted narrative summary of your plan in Simple, Expanded, or Bare Bones style — ready to copy and paste anywhere. No other free calculator generates a narrative.

### 💾 Your Plan Follows You
Sign in with Google and your calculator state, goal, and full AI conversation history are saved to the cloud. Return on any device and pick up exactly where you left off — no re-entering anything.

### 📊 Three Chart Styles, One Click
Switch between Area, Bar, and Line views instantly to see your projection from different angles. The chart always shows principal vs. interest as separate layers so the compounding effect is immediately visible. Save the chart as a PNG with one click.

### 🎯 Goal Tracking Built In
Set a goal amount and a dashed target line appears on the chart. The AI blurb CTA shows your exact shortfall if you're falling short. The AI receives your goal as context and builds strategy advice around closing that specific gap.

### 💸 Genuinely Free Tier
The calculator, all three chart types, goal tracking, sharing, narrative generation, and the insight blurb are completely free — no account required, no time limit, no watermark. Premium unlocks the AI conversation.

---

## The Calculator

### Inputs

| Field | What it does | URL param |
|---|---|---|
| **Starting Amount** | Initial balance or lump sum | `sa` |
| **Monthly Contribution** | Amount added each month. Enter a negative number to model withdrawals instead | `mc` |
| **Timeframe** | How long to project. Two modes: a plain number of years, or a specific target date (date picker). Switch between them with the toggle button. | `ty` (years) or `td` (ISO date) |
| **Annual Return Rate** | Expected yearly growth rate as a percentage (e.g. 7 for 7%) | `ir` |
| **Goal Amount** | Optional. Sets a horizontal target line on the chart. Appears in the AI context as the user's stated objective. | `ga` |

### Outputs

- **Total Value** — projected end balance
- **Principal Paid** — total amount the user actually put in
- **Interest Earned** — growth above principal

### Withdrawal mode

When Monthly Contribution is negative the app switches to withdrawal mode automatically: labels change, the chart shows the balance depleting, and the AI frames advice around sustainability and sequence risk.

### Chart

Three labeled buttons sit at the top-left of the chart — **Area**, **Bar**, **Line** — and switching between them is instant. The active style is highlighted.

- **Area** (default) — stacked filled areas; best for seeing how interest compounds over the full timeframe
- **Bar** — stacked columns per period; easy to compare principal vs. interest at any specific year
- **Line** — clean single trend line; best for a quick read of the trajectory

On mobile, the chart is on the **Chart** tab (second tab at the bottom). On desktop it's always visible on the right side of the screen.

- The X-axis auto-scales: months for projections under 2 years, years for longer ones
- Principal (blue) and interest earned (orange) are shown as separate stacked layers so users can visually see the compounding effect grow over time
- If the balance depletes to zero (withdrawal mode), the chart stops at that point rather than going negative
- Hovering over any point shows the exact values for that period

### Goal Amount & Goal Line

The optional Goal Amount field sets a horizontal target line across the chart. When set:
- A dashed line appears at that value on the chart
- The AI blurb CTA changes to show the specific shortfall if the projection falls short (e.g. "Explore $234,000 gap →")
- The AI receives the goal as part of its context and factors it into strategy recommendations
- Set Goal Amount to 0 to remove the goal line

### Chart Image Export

The chart has a built-in toolbox in the top-right corner with two buttons:
- **Save as Image** — downloads the current chart as `savings-chart.png` directly to the user's device. Captures the full chart including the goal line if set.
- **Restore** — resets the chart view if it has been panned or zoomed.

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

All calculator labels, results, chart tooltips, and the AI responses are delivered in the active language. The AI always responds in the user's locale language regardless of what language the user writes in.

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
| **Pro Sample** | $4.99 (admin-configurable) | Deep AI analysis on one plan, up to the credit cap |
| **Pro** | $9.99/month (admin-configurable) | Unlimited AI conversations |
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
