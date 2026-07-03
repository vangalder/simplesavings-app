# User Flows — simplesavings.app

> **Audience: developers & future agents.** Every end-to-end path through the app,
> derived from the entry points in [`ARCHITECTURE.md`](./ARCHITECTURE.md). Shape:
> `entry → steps → components/files → data → outcome`. Update when you add or change a flow.

## Actors

- **Anonymous** — no Clerk session. Can use the calculator and see the AI blurb, but cannot chat.
- **Authenticated** — signed in via Clerk (Google OAuth).
- **Admin** — `email === ADMIN_EMAIL`. Sees `AdminPanel`; can bypass payments via `paymentTestMode`.
- **System** — Clerk & Stripe webhooks (`convex/http.ts`).

---

## A. Anonymous: calculator → blurb → paywall

`/` → `Calculator.tsx` mounts, hydrates state from **URL params → localStorage → defaults**
→ user edits inputs (`AnimatedNumberInput`) → `results` recompute (`useMemo`) → after a
1500ms debounce `POST /api/ai-blurb` → `AIBlurb.tsx` shows the one-line summary + CTA →
click CTA → `onUpsellClick`: anonymous users have no `scenarioId`, so this opens
`ProUpsellModal.tsx`.

- **Files:** `Calculator.tsx`, `AIBlurb.tsx`, `ProUpsellModal.tsx`, `app/api/ai-blurb/route.ts`.
- **Data:** reads/writes localStorage + URL only (no Convex when anonymous).
- **Key gate:** `POST /api/insights` returns **401** for anonymous callers — the free chat
  taste is metered **per authenticated user**, so a truly anonymous visitor cannot chat.
- **Outcome:** paywall modal or sign-in prompt.

## B. Sign in → provisioning

Any sign-in CTA → Clerk Google OAuth modal → Clerk session set → Convex client receives the
JWT → `useConvexAuth().isAuthenticated` flips true → `Header`/`UserDropdown` effect fires
`users.ensureUser` (self-healing provisioning, gated on `isConvexAuthed`).

- **Files:** `Header.tsx`, `app/providers.tsx`, `convex/users.ts`, `convex/http.ts`.
- **Two provisioning paths:** client `ensureUser` (primary) **and** the Clerk webhook
  `POST /clerk-webhook` → `internal.users.upsertFromClerk` (backup).
- **Data:** a `users` row keyed by `clerkId`.

## C. Scenario autosave / save / share

- **Autosave:** signed-in + `isConvexAuthed` + `results.totalValue > 0` → 4s-debounced
  `scenarios.autosaveScenario` → sets `scenarioId`. On load, `scenarios.getDefaultScenario`
  restores inputs + cached blurb (via `blurbInputsHash`).
- **Explicit save:** `SaveButtonWithCloud.tsx` → always localStorage; signed-in → overwrite
  the first scenario or open `SaveScenarioModal` → `scenarios.saveScenario` (free users capped
  to 1 scenario).
- **Share:** total's share icon → `ShareModal.tsx` (builds a `?sa/mc/ty/ir=…` link) →
  `POST /api/shares/record` → `shares.recordShare` (surfaced in `AdminPanel` analytics).
- **Outcome:** scenario persisted; appears on `/profile` as a `ScenarioCard` (load → `/?params`,
  open → `/plan/[id]`, delete → `scenarios.deleteScenario`).

## D. AI chat with calculator updates

Insights tab → `AIChat.tsx` (renders only when `scenarioId && aiBlurb && isChatEligible`) →
auto-opener (`__OPENER__`, no user bubble) → user sends → `POST /api/insights` (body carries
provider/model/history/frozen blurb/calc facts) → server access gate `users.getMyAccess`:
`isPro || hasCredits || freePath` else **402 `upgrade_required`** → SSE `delta` stream renders
live → `done` event carries `cleanText` + `calcUpdates[]` (parsed from `<calc_update>` tags
server-side) + usage → client applies each update via `onCalculatorUpdate` → both messages
persisted via `messages.addMessage`. Server meters via `users.recordChatUsage` (cost always;
free tokens only on the free path — **the client cannot skip metering**).

- **calc_update chip:** rendered per assistant message; click → `onOpenCalculator(fields)` →
  switches to the Inputs tab, scrolls, and rings the changed fields (`highlightFields`, ~2.9s).
- **Files:** `AIChat.tsx`, `Calculator.tsx`, `app/api/insights/route.ts`, `convex/messages.ts`,
  `convex/users.ts`.
- **On 402:** the pending message is removed and the upsell chip is shown.

> `/plan/[id]` uses `InsightsPanel.tsx` (a distinct, paid-only chat with an intent-capture form
> and admin `ProviderPicker`), not `AIChat`. Both hit `POST /api/insights`.

## E. Purchase → webhook → credits → tier

`ProUpsellModal` / `PricingSection` / `InsightsPanel` CTA → `startCheckout(type)`
(`lib/checkout.ts`) → `POST /api/checkout`:

- **Admin test-mode bypass:** if `paymentTestMode` is set and caller is admin →
  `users.applyAdminTestGrant` → redirect `/?testPaid=1` (no Stripe).
- **Normal:** create/reuse Stripe customer → `checkout.sessions.create` (metadata carries
  `clerkId`, `type`, `scenarioId`) → return hosted Stripe URL → browser redirects.

On payment, Stripe calls `POST /stripe-webhook` (`constructEventAsync`, `convex/http.ts`):
- `checkout.session.completed` + `type==="one_time"` → `internal.purchases.completeTasteTestPurchase`
  grants `proSampleCreditLimitCents` (150¢) + `internal.users.setStripeCustomer`.
- `customer.subscription.created/updated` (active/trialing) → `internal.users.setUserPro`;
  `paused`/`deleted` → `unsetUserPro`; `resumed` → `setUserPro` (clerkId resolved via
  `internal.users.getClerkIdByStripeCustomer`).

- **Success redirect:** `/profile?upgraded=1` (Pro) or `/profile?sample=1&sid=…` (Sample).
- **Outcome:** `users.getAiCreditBalance` reflects new `granted`/`isPro`; tier badge + chat
  gates flip; `isChatEligible` becomes true.
- **All paid-state writes are internal mutations** — unreachable from the public API.

## F. Admin

`/profile` as `ADMIN_EMAIL` → `AdminPanel.tsx` (behind `AdminErrorBoundary`) → model pickers
(`AdminModelMatrix` → `appConfig.setConfig(defaultBlurbModel / defaultConversationModel =
openrouter:<id>)`), pricing/credit-cap inputs, payment test-mode selector (selecting `sample`
also `users.seedTestCredits`), plus blurb-performance and share-analytics charts. These config
values feed the checkout bypass and the prices shown across the pricing/upsell UIs.

- **All admin queries gate on `useConvexAuth().isAuthenticated` (`"skip"` otherwise)**, and the
  server enforces authority via `requireAdmin` — the client allowlist is UI-only.
