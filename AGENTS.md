# AGENTS.md

This document provides the universal, core principles and philosophy for the AI agent across the entire project. This file must remain **lightweight and token-efficient**. Detailed, folder-specific rules should be defined in local `AGENTS.md` files within subdirectories.

## I. Agent Identity & Role

**Agent Name:** Project Architect Assistant
**Overarching Goal:** To produce code that is consistent, maintainable, and aligned with the company's best practices, prioritizing long-term project health over short-term expediency.

## II. Universal Principles (Nearest Wins Hierarchy)

The agent must adhere to the following principles at all times. This list is kept short to minimize cognitive load and token cost.

1.  **Rule Hierarchy:** The "Nearest Wins" rule applies. Instructions found in a subfolder's local `AGENTS.md` file **always** override the general instructions in a parent directory's `AGENTS.md` or this root file.
2.  **Readability:** Prioritize clear, simple, and idiomatic code over overly complex or clever solutions. Always add comments for non-obvious logic.
3.  **Language Standard:** Adhere strictly to **TypeScript**. Avoid using `any` unless explicitly necessary and documented.
4.  **Token Efficiency:** When asked for a code solution, only respond with the required code blocks and brief explanations. Do not generate verbose prose or repeat instructions from this file.

## III. Universal Anti-Patterns (Do NOT Do This)

These are critical mistakes that must be avoided in all circumstances across the entire codebase.

1.  **Circular Dependencies:** Never introduce circular imports between modules.
2.  **File Naming:** Do NOT use hyphen-cased file names (`component-name.tsx`) for components or modules. Always use `PascalCase` (`ComponentName.tsx`).
3.  **Untyped Variables:** Do NOT rely on implicit typing for function parameters or complex object declarations. Explicitly define types/interfaces where applicable.

---

## IV. Project Docs & Maintenance (read before building)

This is a **live production** app (savings calculator + AI strategist chat, Clerk auth,
Stripe payments). Read the right doc before touching a subsystem, and **keep docs in sync
with code** — a stale agent-facing claim wastes hours.

| Doc | Read it before you… |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | touch any subsystem — it's the system map + data model + config keys (single source of truth for deployment names, `app_config`, env vars) |
| [`USER-FLOWS.md`](./USER-FLOWS.md) | change how an actor moves through the app |
| [`SECURITY.md`](./SECURITY.md) | change auth, webhooks, a public route, or anything money-related — preserve the invariants |
| [`docs/simplesavings-product-reference.md`](./docs/simplesavings-product-reference.md) | change user-facing behavior — **this file is live-injected into every AI prompt**, so errors here mislead users directly |

### Docs maintenance table — when you change X, update Y

| You change… | Update… |
|---|---|
| a Convex function / table / index (`convex/`) | `ARCHITECTURE.md` (functions/data model tables) |
| an API route or its auth (`app/api/`) | `ARCHITECTURE.md` §2 + `SECURITY.md` if auth/exposure changes |
| pricing / `app_config` keys or values | `ARCHITECTURE.md` config table + `docs/simplesavings-product-reference.md` |
| a user/actor flow | `USER-FLOWS.md` |
| auth, webhooks, secrets, or a public LLM route | `SECURITY.md` (invariants + known-gaps) |
| the calculator layout | `docs/simplesavings-product-reference.md` (Layout) + `README.md` |
| the active AI model/provider default | `ARCHITECTURE.md` config table |
| deployment target / Stripe account / prod host | `ARCHITECTURE.md` + `APPLICATION_SUMMARY.md` (state block) |

### Facts that are easy to get wrong (verify, don't assume)
- Prod Convex deployment/host = **`patient-crane-902`** (`ae970` is only the project id).
- Stripe = live, dedicated **simplesavings.app** account `acct_1TYxy4Pwai2zIs5e` (not boat.bot).
- Layout = single-column tabbed at **all** sizes (no two-column desktop view).
- Charts = **ECharts**, never Recharts. Copy **de-emphasizes "AI"**; "co-pilot" is **banned**.
- Deploy convention: `git push origin main` → `npx convex deploy --yes`.

---

## V. Rule Loading Logic

The agent must use **just-in-time context indexing** for rule application:

* **Initialization:** Load this root `AGENTS.md` file.
* **During a Task:** If the current task involves a specific directory, search for and load the `AGENTS.md` file nearest to the file being modified or created.
* **Conflict Resolution:** Resolve any conflicting instructions using the **Nearest Wins** hierarchy (Rule II.1).
* **Post-Task:** Release the context of the localized file to conserve tokens for the general conversation.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
