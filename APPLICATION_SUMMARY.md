# Simple Savings App - Application Summary Overview

**Last meaningful update**: 2026-07  
**Status**: Live in production at https://simplesavings.app (Vercel + Convex)

> ## ⚠️ Current State (2026-07) — read this first
> Much of the section-by-section detail below dates from the 2025-01 MVP and is
> retained for architectural context, but the following now reflects production:
>
> - **Auth is live.** Clerk (Google OAuth) is configured. Convex enforces
>   identity server-side via `ctx.auth.getUserIdentity()` (`convex/auth.config.ts`,
>   `convex/lib/auth.ts`) — functions no longer trust a caller-supplied `clerkId`.
>   Paid-state writes are `internalMutation`s; admin reads require `requireAdmin`.
> - **Database is live.** Convex prod deployment `simplesavings-app-ae970`
>   (tables: users, scenarios, messages, purchases, app_config, shares,
>   blurb_logs, provider_configs, per `convex/schema.ts`).
> - **Payments** run through Stripe (webhook is a Convex httpAction at
>   `/stripe-webhook`). Monetization: a **$2.99** one-time Pro Sample (grants AI
>   credits) and a **$6.99/mo** Pro subscription — not the legacy $0.99 model.
>   Free tier = full calculator + sharing + blurbs + a short metered AI taste
>   (`chatFreeTokenBudget`).
> - **AI insights chat** is the differentiated product: a multi-provider
>   (Anthropic/OpenAI/Google/OpenRouter/xAI) savings strategist that can write
>   changes back into the calculator. System prompt in `app/api/insights/route.ts`.
> - Design/prep assets have been removed from the repo tree (kept locally; see
>   `.gitignore`).

---

## 1. Application Overview

### Purpose
Simple Savings App is a modern, responsive savings calculator web application that helps users visualize their financial future through compound interest calculations. The application features beautiful visualizations, real-time calculations, and a mobile-first design philosophy.

### Core Functionality
- **Compound Interest Calculator**: Calculate future savings with monthly contributions
- **Interactive Charts**: Visualize growth over time using ECharts with animated transitions
- **Save & Share**: Save calculations to localStorage and share via URL parameters
- **Responsive Design**: Mobile-first layout that adapts to all screen sizes
  - Mobile: Stacked layout (form → results → chart)
  - Desktop/Tablet: Split layout (form left 50%, chart right 50%)

### Business Goals
From `prep/business-plan-simplesavings-app.md`:
- **MVP Phase**: Launch responsive web application with basic calculator + save/share
- **Monetization**: $0.99 one-time purchase for save/share functionality (Phase 1)
- **Premium Features**: Multiple scenarios, LLM-powered assistance, investment research (Phase 2-3)
- **Mobile Apps**: Native Flutter apps for iOS and Android (Phase 3, separate project)
- **Revenue Target**: Break-even by Month 1-2, $100/month gross by Month 3

### Current Stage
✅ **Phase 0 Complete** - MVP web application ready for deployment
- Core calculator functionality implemented
- Chart visualizations working
- Responsive design complete
- Analytics integration ready
- Authentication and database infrastructure prepared (Clerk, Convex) but not yet configured

---

## 2. Architecture Overview

### Technology Stack

**Frontend Framework**:
- **Next.js 14** (App Router) - Server-side rendering, SEO optimization
- **TypeScript** - Type safety throughout
- **React 18.3.1** - UI library
- **Tailwind CSS 3.4.4** - Utility-first CSS framework

**Visualization & UI**:
- **ECharts 5.5.0** with `echarts-for-react 3.0.2` - Interactive charts
- **react-animated-numbers 1.1.1** - Animated number displays
- **Custom SVG palm leaf overlays** - Design system elements

**Authentication & Database** (Ready for Phase 3):
- **Clerk 5.0.0** - Authentication (configured but not active)
- **Convex 1.11.0** - Database (schema defined, not initialized)
- **Stripe 17.0.0** - Payment processing (ready for integration)

**Analytics & Monitoring**:
- **Google Analytics** - Property ID: `G-7SSJWHL9D0`
- **Vercel Analytics 1.3.1** - Built-in performance monitoring

**Build Tools**:
- **TypeScript 5.5.4** - Type checking
- **ESLint 8.57.0** - Code linting
- **PostCSS 8.4.39** - CSS processing
- **Autoprefixer 10.4.19** - CSS vendor prefixes

### Project Structure

```
simplesavings-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with fonts, GA, Vercel Analytics
│   ├── page.tsx                 # Home page (Calculator)
│   ├── globals.css              # Global styles with Tailwind
│   ├── insights/page.tsx        # Insights page (placeholder)
│   └── profile/page.tsx        # Profile page (placeholder)
├── components/                   # React components
│   ├── Calculator.tsx           # Main calculator with state management
│   ├── Chart.tsx                # ECharts visualization with SVG overlays
│   ├── Header.tsx               # Header with logo and share button
│   ├── Footer.tsx               # Footer with legal links
│   ├── TabNavigation.tsx        # Tab navigation component
│   ├── TabContentContainer.tsx  # Container for tab content
│   ├── AnimatedCurrency.tsx     # Animated currency display
│   ├── AnimatedNumberInput.tsx  # Animated number input component
│   ├── BackgroundPalmLeaves.tsx # Background decorative elements
│   ├── ChartPalmLeaves.tsx      # Chart-specific palm leaf overlays
│   └── SvgPalmOverlays.tsx      # SVG overlay component
├── lib/                          # Utility functions
│   ├── defaultValues.ts         # Default calculator values
│   ├── utils.ts                 # Helper functions
│   └── svgLayers.ts             # SVG layer utilities
├── convex/                       # Convex database (Phase 3)
│   ├── schema.ts                # Database schema (commented out)
│   └── users.ts                 # User functions (placeholder)
├── public/                       # Static assets
│   ├── logo.png, logo.svg       # Application logo
│   ├── Icon-share.png, Icon-share.svg # Share icon
│   ├── palm-fronds-and-silhouettes.svg # SVG assets
│   └── palm-leaves/             # Palm leaf image assets
├── prep/                         # Documentation and prototypes
│   ├── business-plan-simplesavings-app.md # Business plan
│   ├── DEPLOYMENT-README.md      # Deployment guide
│   ├── CONFIGURATION-AND-CLI.md # CLI reference
│   └── prototypes/               # Design mockups and assets
├── vercel.json                   # Vercel deployment configuration
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── middleware.ts                  # Next.js middleware (no-op until Clerk configured)
```

### Deployment Infrastructure

**Hosting Platform**: **Vercel**
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Regions**: `iad1` (US East)
- **Environment Variables**: Configured in `vercel.json` and Vercel Dashboard

**Deployment Method**:
- Vercel CLI for deployments
- Automatic deployments on git push (when configured)
- SSL certificates: Automatic (Vercel-managed)
- CDN: Vercel Edge Network (global distribution)

**Configuration Files**:
- `vercel.json` - Vercel-specific settings (build command, framework, regions, env vars)
- `next.config.js` - Next.js configuration (React strict mode enabled)
- `.env.example` - Environment variable template

---

## 3. Component/Module Status

### ✅ Complete Components

**Calculator Component** (`components/Calculator.tsx`):
- ✅ State management with TypeScript interfaces
- ✅ URL parameter synchronization (shareable links)
- ✅ LocalStorage persistence
- ✅ Real-time compound interest calculations
- ✅ Input validation and sanitization
- ✅ Animated number inputs
- ✅ Save functionality with metadata tracking
- ✅ Share functionality (Web Share API + clipboard fallback)
- ✅ Responsive layout (mobile-first, desktop split view)

**Chart Component** (`components/Chart.tsx`):
- ✅ ECharts integration with stacked area chart
- ✅ Principal vs. Interest visualization
- ✅ SVG palm leaf overlays (dynamic loading from SVG file)
- ✅ Interactive tooltips with formatted currency
- ✅ Responsive sizing
- ✅ Data validation and error handling
- ✅ Radial gradient background (accent colors)
- ✅ Export functionality (save as image, data view)

**Layout & Navigation**:
- ✅ Header with logo and share button (`components/Header.tsx`)
- ✅ Footer with legal links (`components/Footer.tsx`)
- ✅ Tab navigation (`components/TabNavigation.tsx`)
- ✅ Tab content container (`components/TabContentContainer.tsx`)
- ✅ Root layout with fonts and analytics (`app/layout.tsx`)

**Design System**:
- ✅ Custom fonts (Inter, Space Grotesk, Roboto Mono)
- ✅ Color palette (primary, secondary, accent colors)
- ✅ Responsive breakpoints
- ✅ SVG decorative elements

### ⚠️ Partial/Placeholder Components

**Insights Page** (`app/insights/page.tsx`):
- ⚠️ Placeholder page with "coming soon" message
- ⚠️ Structure ready for future implementation

**Profile Page** (`app/profile/page.tsx`):
- ⚠️ Placeholder page with "coming soon" message
- ⚠️ Structure ready for future implementation

### ✅ Configured & Live (as of 2026-07)

**Authentication** (Clerk): live (Google OAuth). Convex validates the Clerk JWT
via `convex/auth.config.ts`; identity is derived server-side in every function.
Note: the deployed site still uses a **development** Clerk instance — migrating
to production Clerk keys is a pending launch task.

**Database** (Convex): live. Prod deployment `simplesavings-app-ae970`; schema in
`convex/schema.ts`.

**Payments** (Stripe): live keys configured; checkout via `app/api/checkout`,
webhook via the Convex httpAction `/stripe-webhook`. One-time Pro Sample ($2.99 →
AI credits) and Pro subscription ($6.99/mo).

---

## 4. Data Flow

### Request/Response Flow

**Page Load**:
1. User navigates to application
2. Next.js App Router loads `app/layout.tsx` (root layout)
3. Layout loads fonts, Google Analytics scripts, Vercel Analytics
4. `app/page.tsx` renders Calculator component
5. Calculator initializes state from:
   - Priority 1: URL parameters (if present)
   - Priority 2: LocalStorage (if available)
   - Priority 3: Default values

**User Interaction**:
1. User modifies calculator inputs
2. State updates trigger `useMemo` recalculation
3. Results computed (total value, principal, interest, chart data)
4. URL parameters updated (debounced, 500ms delay)
5. Chart re-renders with new data
6. Animated components update values

**Save Flow**:
1. User clicks "Save Calculation" button
2. State saved to LocalStorage with metadata (save count, timestamp)
3. Alert shown to user with save confirmation

**Share Flow**:
1. User clicks share button
2. URL built with all calculator parameters
3. Web Share API attempted (if available)
4. Fallback to clipboard copy
5. Final fallback to alert with URL

### State Management

**Local State** (React `useState`):
- Calculator inputs (starting amount, monthly contribution, timeframe, interest rate)
- Initialization status
- Animation flags

**Computed State** (React `useMemo`):
- Compound interest calculations
- Chart data points
- Formatted currency values

**Persistent State** (LocalStorage):
- Calculator state (with metadata)
- Save count and last save time

**URL State** (Next.js `useSearchParams`):
- Shareable calculation parameters
- URL synchronization (read on load, write on change)

### Build and Deployment Flow

**Build Process**:
1. `npm run build` executes Next.js build
2. TypeScript compilation
3. React components compiled
4. Static assets optimized
5. Output generated in `.next` directory

**Deployment Process** (Vercel):
1. Vercel CLI detects Next.js framework
2. Build command executed: `npm run build`
3. Output directory: `.next` (Next.js default)
4. Static assets deployed to Vercel Edge Network
5. Serverless functions prepared (if API routes exist)
6. SSL certificates automatically provisioned
7. Global CDN distribution activated

---

## 5. Current Capabilities

### What Works ✅

**Core Calculator**:
- ✅ Real-time compound interest calculations
- ✅ Input validation and sanitization
- ✅ Animated number inputs and currency displays
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ URL parameter sharing (shareable calculation links)
- ✅ LocalStorage persistence
- ✅ Save functionality with metadata

**Visualizations**:
- ✅ Interactive ECharts with stacked area visualization
- ✅ Principal vs. Interest breakdown
- ✅ Tooltips with formatted currency
- ✅ SVG decorative overlays (palm leaves)
- ✅ Export functionality (save as image, data view)
- ✅ Responsive chart sizing

**User Experience**:
- ✅ Mobile-first design
- ✅ Smooth animations and transitions
- ✅ Share functionality (Web Share API + fallbacks)
- ✅ Tab navigation structure
- ✅ Loading states and error handling

**Analytics**:
- ✅ Google Analytics integration (G-7SSJWHL9D0)
- ✅ Vercel Analytics integration
- ✅ Page view tracking

### What's Pending ⚠️

**Phase 2 Features** (Premium Features):
- ⚠️ Multiple scenarios management
- ⚠️ LLM-powered financial assistance
- ⚠️ Investment research integration
- ⚠️ Export to PDF/CSV
- ⚠️ User dashboard

**Phase 3 Features** (Authentication & Payments):
- ⚠️ Clerk authentication setup
- ⚠️ Convex database initialization
- ⚠️ Stripe payment integration
- ⚠️ User accounts and profiles

**Phase 4 Features** (Mobile Apps):
- ⚠️ Flutter native app development
- ⚠️ iOS App Store submission
- ⚠️ Google Play Store submission
- ⚠️ Native features (biometrics, push notifications, widgets)

---

## 6. Recent Changes

**Current Session**:
- Modified: `prep/palm-fronds-and-silhouettes.ai` (3.4MB Adobe Illustrator file)
  - Metadata timestamp updates
  - Instance ID changes
  - No functional changes to application

**Note**: The modified `.ai` file is a design asset in the `prep/` directory and does not affect application functionality.

---

## 7. Recommended Next Steps

### Immediate (Before Deployment)

1. **Review Large File**:
   - ⚠️ `prep/palm-fronds-and-silhouettes.ai` (3.4MB) is modified
   - Consider if this design file should be committed or added to `.gitignore`
   - If committing, ensure it's intentional (design assets may be large)

2. **Verify Environment Variables**:
   - Confirm `NEXT_PUBLIC_GA_ID` is set in Vercel Dashboard
   - Verify Google Analytics is tracking correctly

3. **Test Production Build**:
   - Run `npm run build` locally to verify build succeeds
   - Test production build with `npm start`
   - Verify all routes work correctly

### Short-term (Post-Deployment)

1. **Deploy to Vercel**:
   - Execute `vercel --prod` to deploy to production
   - Verify deployment at production URL
   - Test all calculator functionality in production
   - Verify analytics tracking

2. **Configure Custom Domain** (if applicable):
   - Add domain via `vercel domains add simplesavings.app`
   - Configure DNS records at Namecheap
   - Wait for DNS propagation (24-48 hours)
   - Verify SSL certificate activation

3. **Monitor Deployment**:
   - Check Vercel Dashboard for deployment status
   - Verify analytics data is flowing
   - Monitor error logs for any issues
   - Test share functionality with production URL

4. **Phase 2 Planning**:
   - Begin planning premium features (multiple scenarios, LLM integration)
   - Design user dashboard interface
   - Plan Stripe payment integration

### Long-term (Strategic Goals)

1. **Phase 2: Premium Features** (2-4 weeks):
   - Implement multiple scenarios management
   - Integrate LLM API (OpenAI/Anthropic) for financial assistance
   - Add investment research dropdown
   - Implement Stripe payment flows
   - Build user dashboard

2. **Phase 3: Authentication & Database** (1-2 weeks):
   - Configure Clerk authentication
   - Initialize Convex database (`npx convex dev`)
   - Migrate from LocalStorage to Convex
   - Implement user accounts and profiles

3. **Phase 4: Mobile Apps** (4-8 weeks, separate project):
   - Develop Flutter native apps
   - Implement native features (biometrics, push notifications, widgets)
   - Submit to iOS App Store
   - Submit to Google Play Store

4. **Phase 5: Growth & Optimization** (Months 2-6):
   - A/B testing for conversion optimization
   - SEO improvements
   - Social sharing optimization
   - Internationalization (i18n) - language and currency support
   - Performance optimization

---

## Technical Notes

### Design System
- **Primary Colors**: Teal/Green (#206A5D)
- **Secondary Colors**: Lime Green (#81B214)
- **Accent Colors**: Orange/Yellow gradient (#FFCC29, #F58634)
- **Fonts**: Inter (body), Space Grotesk (headings), Roboto Mono (code)

### Performance Considerations
- ECharts dynamically imported (no SSR) to reduce initial bundle size
- SVG assets loaded on-demand
- LocalStorage used for persistence (no backend required for MVP)
- Debounced URL updates to minimize history entries

### Security Considerations
- Input validation and sanitization in calculator
- No sensitive data stored in LocalStorage (only calculation state)
- Ready for Clerk authentication (when configured)
- Ready for Convex database (when initialized)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-08




