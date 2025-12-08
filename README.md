# Simple Savings App

A modern, responsive savings calculator built with Next.js 14, featuring compound interest calculations and beautiful visualizations.

## Features

- **Responsive Design**: Mobile-first layout that adapts to all screen sizes
  - Mobile: Stacked layout (form → results → chart)
  - Desktop/Tablet: Split layout (form left 50%, chart right 50%)
- **Compound Interest Calculator**: Calculate future savings with monthly contributions
- **Interactive Charts**: Visualize growth over time using ECharts
- **Google Analytics**: Integrated tracking (G-7SSJWHL9D0)
- **Vercel Analytics**: Built-in performance monitoring

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: ECharts (echarts-for-react)
- **Authentication**: Clerk (ready for configuration)
- **Database**: Convex (ready for configuration)
- **Payments**: Stripe (ready for configuration)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Project Structure

```
simplesavings-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with fonts and analytics
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Calculator.tsx     # Main calculator component
│   ├── Chart.tsx          # Chart visualization
│   ├── Header.tsx         # Header with navigation
│   └── Footer.tsx         # Footer
├── lib/                   # Utility functions
│   └── utils.ts           # Helper functions
├── convex/                # Convex database (Phase 3)
├── vercel.json            # Vercel configuration
└── prep/                  # Documentation
    └── CONFIGURATION-AND-CLI.md
```

## Deployment

See [DEPLOYMENT-README.md](./DEPLOYMENT-README.md) for detailed deployment instructions.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Configuration

All configuration values are documented in `prep/CONFIGURATION-AND-CLI.md`.

### Environment Variables

See `.env.example` for required environment variables:
- `NEXT_PUBLIC_GA_ID`: Google Analytics ID (G-7SSJWHL9D0)
- Clerk, Convex, and Stripe variables (to be configured in Phase 3)

## Design System

The application follows the design system defined in `DESIGN_SYSTEM.md`:
- **Primary Colors**: Teal/Green (#206A5D)
- **Secondary Colors**: Lime Green (#81B214)
- **Fonts**: Inter (body), Space Grotesk (headings), Roboto Mono (code)

## License

© 2025 vangalder.com. All rights reserved.
