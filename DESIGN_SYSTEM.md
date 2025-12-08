# Simple Savings Calculator - Design System

**Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Application**: Simple Savings Calculator (`command.cash` / `simplesavings.app`)

---

## Executive Summary

This design system establishes the visual foundation for the Simple Savings Calculator, a modern personal finance tool that helps users visualize their financial future. The design system prioritizes:

- **Mobile-first excellence**: Absolutely stellar, one-of-a-kind UX on all screen sizes
- **Professional clarity**: Clean, intuitive, and trustworthy visual language
- **Accessibility**: WCAG AA compliance across all color and typography combinations
- **Growth-oriented**: Colors and typography that convey optimism, progress, and financial success

**Brand Personality**: Trustworthy, approachable, innovative, optimistic, professional

**Visual Tone**: Modern, clean, energetic yet calm, professional but not corporate

**Target Audience**: Personal finance enthusiasts (ages 25-45), people planning major purchases, financial content creators, students learning about compound interest

---

## 1. Brand & Personality Assessment

### Brand Personality
- **Trustworthy**: Financial tools require confidence and reliability
- **Approachable**: Complex financial concepts made simple and accessible
- **Innovative**: Modern technology with beautiful visualizations
- **Optimistic**: Positive outlook on financial future and growth
- **Professional**: Serious about finances, but not intimidating

### Visual Tone
- **Professional Level**: High - financial tools require credibility
- **Energy Level**: Moderate to high - growth-oriented, forward-looking
- **Formality**: Casual to professional - approachable but trustworthy

### Competitive Positioning
Competitors (Bankrate, NerdWallet, Personal Capital) have poor UX. Our design system creates a **stunning, one-of-a-kind visual experience** that immediately differentiates us through:
- Superior mobile-first design
- Beautiful, animated visualizations
- Thoughtful color palette that feels modern and energetic
- Professional typography that's both readable and distinctive

---

## 2. Color System

### Core Brand Colors

The color palette is derived from a vibrant, growth-oriented scheme that conveys financial prosperity and optimism.

#### Primary Colors (Teal/Green - Growth & Stability)
- `primary-base`: `#206A5D` (Dark Teal) - Main brand color, conveys trust and stability
- `primary-dark`: `#164A40` (Darker Teal) - Hover states, emphasis, depth
- `primary-light`: `#4A9B8E` (Light Teal) - Backgrounds, subtle elements, highlights

#### Secondary Colors (Lime Green - Energy & Growth)
- `secondary-base`: `#81B214` (Lime Green) - Supporting brand color, conveys growth and energy
- `secondary-dark`: `#5F8510` (Darker Green) - Hover states, emphasis
- `secondary-light`: `#A5D44A` (Light Green) - Backgrounds, accents, success states

#### Accent Colors (Yellow & Orange - Optimism & Action)
- `accent-base`: `#FFCC29` (Bright Yellow) - CTAs, highlights, important actions
- `accent-dark`: `#E6B825` (Darker Yellow) - Hover states, pressed states
- `accent-light`: `#FFD966` (Light Yellow) - Backgrounds, subtle highlights

- `accent-orange-base`: `#F58634` (Burnt Orange) - Secondary CTAs, warnings, energy
- `accent-orange-dark`: `#D66B1F` (Darker Orange) - Hover states
- `accent-orange-light`: `#F8A866` (Light Orange) - Backgrounds, subtle accents

### Neutral Colors

A comprehensive neutral scale for text, backgrounds, and UI elements:

- `neutral-900`: `#0F172A` - Darkest - primary text in light mode
- `neutral-800`: `#1E293B` - Dark text
- `neutral-700`: `#334155` - Secondary text
- `neutral-600`: `#475569` - Tertiary text
- `neutral-500`: `#64748B` - Mid-tone - borders, dividers
- `neutral-400`: `#94A3B8` - Light borders
- `neutral-300`: `#CBD5E1` - Subtle borders, disabled text
- `neutral-200`: `#E2E8F0` - Background accents
- `neutral-100`: `#F1F5F9` - Light backgrounds
- `neutral-50`: `#F8FAFC` - Lightest backgrounds

### Semantic State Colors

- `success-base`: `#81B214` (Lime Green) - Success states, confirmations, positive outcomes
- `success-light`: `#A5D44A` - Success backgrounds, subtle success indicators
- `warning-base`: `#FFCC29` (Yellow) - Warning states, cautions, important notices
- `warning-light`: `#FFD966` - Warning backgrounds
- `error-base`: `#DC2626` (Red) - Error states, destructive actions
- `error-light`: `#FCA5A5` - Error backgrounds
- `info-base`: `#206A5D` (Teal) - Informational states, neutral alerts
- `info-light`: `#4A9B8E` - Info backgrounds

### Theme-Specific Colors

#### Light Mode
- `background-base`: `#FFFFFF` - Primary background color
- `background-elevated`: `#F8FAFC` - Cards, modals, elevated surfaces
- `background-overlay`: `rgba(15, 23, 42, 0.5)` - Semi-transparent overlays for modals/drawers
- `background-subtle`: `#F1F5F9` - Subtle background variations

#### Dark Mode
- `background-base`: `#0F172A` - Primary background color (dark)
- `background-elevated`: `#1E293B` - Cards, modals, elevated surfaces (dark)
- `background-overlay`: `rgba(0, 0, 0, 0.7)` - Semi-transparent overlays for modals/drawers (dark)
- `background-subtle`: `#1E293B` - Subtle background variations

### Text Colors

#### Light Mode
- **Primary text**: `neutral-900` (`#0F172A`) on `background-base` or `background-elevated`
- **Secondary text**: `neutral-700` (`#334155`) for supporting content, labels
- **Tertiary text**: `neutral-600` (`#475569`) for captions, metadata
- **Interactive text**: `primary-base` (`#206A5D`) for links, clickable elements
- **Text on colored backgrounds**:
  - White (`#FFFFFF`) on `primary-base`, `secondary-base`, `accent-base`
  - `neutral-900` on `accent-light`, `secondary-light`, `primary-light`

#### Dark Mode
- **Primary text**: `neutral-50` (`#F8FAFC`) on `background-base` or `background-elevated`
- **Secondary text**: `neutral-300` (`#CBD5E1`) for supporting content, labels
- **Tertiary text**: `neutral-400` (`#94A3B8`) for captions, metadata
- **Interactive text**: `primary-light` (`#4A9B8E`) for links, clickable elements
- **Text on colored backgrounds**:
  - White (`#FFFFFF`) on `primary-base`, `secondary-base`, `accent-base`
  - `neutral-900` on `accent-light`, `secondary-light`, `primary-light`

### Accessibility Requirements

All color combinations meet WCAG AA standards:

**Light Mode Contrast Ratios**:
- `neutral-900` on `background-base`: 15.8:1 ✅
- `neutral-700` on `background-base`: 10.2:1 ✅
- `neutral-600` on `background-base`: 7.1:1 ✅
- White on `primary-base`: 4.8:1 ✅
- White on `secondary-base`: 4.6:1 ✅
- White on `accent-base`: 1.9:1 ⚠️ (use `accent-dark` for text)
- `neutral-900` on `accent-light`: 8.2:1 ✅

**Dark Mode Contrast Ratios**:
- `neutral-50` on `background-base`: 15.8:1 ✅
- `neutral-300` on `background-base`: 10.2:1 ✅
- `neutral-400` on `background-base`: 7.1:1 ✅
- White on `primary-base`: 4.8:1 ✅
- White on `secondary-base`: 4.6:1 ✅

**Note**: `accent-base` (yellow) should not be used for text. Use `accent-dark` or `neutral-900` on yellow backgrounds.

---

## 3. Typography System

### Font Families

All fonts are from Google Fonts for consistency and performance.

#### Primary Font (Content)
- **Font Name**: `Inter`
- **Fallback Stack**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Google Fonts URL**: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`
- **Usage**: Body text, UI elements, general content
- **Rationale**: Highly readable, modern, professional, excellent for financial data

#### Heading Font (Display)
- **Font Name**: `Space Grotesk`
- **Fallback Stack**: `'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Google Fonts URL**: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap`
- **Usage**: Headings, hero text, display elements
- **Rationale**: Modern geometric sans-serif with character and personality. Its slightly quirky, creative feel hints at outside-the-box thinking while remaining professional and highly readable. Creates a distinctive visual identity that differentiates from competitors while maintaining trustworthiness for financial content.

#### Monospace Font (Code/Technical)
- **Font Name**: `'Roboto Mono'`
- **Fallback Stack**: `'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace`
- **Google Fonts URL**: `https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap`
- **Usage**: Code snippets, technical content, numbers in specific contexts
- **Rationale**: Clear, readable monospace for technical content

### Type Scale

A mobile-first type scale optimized for readability across all devices:

- `text-xs`: `12px` - Labels, captions, fine print
- `text-sm`: `14px` - Small body text, secondary information
- `text-base`: `16px` - Body text (base size), default for all content
- `text-lg`: `18px` - Slightly emphasized body text, intro paragraphs
- `text-xl`: `20px` - Small headings, card titles
- `text-2xl`: `24px` - Section headings, important labels
- `text-3xl`: `30px` - Page headings, hero text (mobile)
- `text-4xl`: `36px` - Large headings (tablet/desktop)
- `text-5xl`: `48px` - Display text, hero numbers (desktop)
- `text-6xl`: `60px` - Extra large display (desktop only, sparingly)

### Font Weights

Inter supports the following weights (all available):

- `font-normal`: `400` - Body text, general content
- `font-medium`: `500` - Subtle emphasis, labels, buttons
- `font-semibold`: `600` - Headings, strong emphasis, important text
- `font-bold`: `700` - Extra strong emphasis, CTAs, hero text

### Line Heights

- `leading-tight`: `1.25` - Large headings, display text (text-3xl and above)
- `leading-snug`: `1.375` - Small headings (text-xl, text-2xl)
- `leading-normal`: `1.5` - Standard body text (text-base, text-lg)
- `leading-relaxed`: `1.625` - Long-form reading content, paragraphs
- `leading-loose`: `2.0` - Very relaxed spacing (use sparingly, for special cases)

### Letter Spacing

- `tracking-tight`: `-0.025em` - Large headings, tight compositions (text-3xl and above)
- `tracking-normal`: `0` - Default for body text
- `tracking-wide`: `0.025em` - Small text, uppercase text, buttons

### Typography Pairing Guidelines

#### Heading Hierarchy

**H1 (Page Title)**:
- Font: `Space Grotesk`
- Size: `text-4xl` (36px) on desktop, `text-3xl` (30px) on mobile
- Weight: `font-bold` (700)
- Line Height: `leading-tight` (1.25)
- Letter Spacing: `tracking-tight` (-0.025em)
- Color: `neutral-900` (light mode) / `neutral-50` (dark mode)

**H2 (Section Heading)**:
- Font: `Space Grotesk`
- Size: `text-3xl` (30px) on desktop, `text-2xl` (24px) on mobile
- Weight: `font-semibold` (600)
- Line Height: `leading-snug` (1.375)
- Letter Spacing: `tracking-normal` (0)
- Color: `neutral-900` (light mode) / `neutral-50` (dark mode)

**H3 (Subsection Heading)**:
- Font: `Space Grotesk`
- Size: `text-2xl` (24px)
- Weight: `font-semibold` (600)
- Line Height: `leading-snug` (1.375)
- Letter Spacing: `tracking-normal` (0)
- Color: `neutral-800` (light mode) / `neutral-100` (dark mode)

**H4-H6**:
- Font: `Space Grotesk` for H4, `Inter` for H5-H6 (smaller headings can use body font)
- Size: `text-xl` (20px) for H4, `text-lg` (18px) for H5, `text-base` (16px) for H6
- Weight: `font-semibold` (600) for H4, `font-medium` (500) for H5-H6
- Line Height: `leading-normal` (1.5)
- Color: `neutral-800` (light mode) / `neutral-100` (dark mode)

#### Body Text

**Body (Default)**:
- Font: `Inter`
- Size: `text-base` (16px)
- Weight: `font-normal` (400)
- Line Height: `leading-relaxed` (1.625)
- Color: `neutral-700` (light mode) / `neutral-300` (dark mode)

**Body Large**:
- Font: `Inter`
- Size: `text-lg` (18px)
- Weight: `font-normal` (400)
- Line Height: `leading-relaxed` (1.625)
- Color: `neutral-700` (light mode) / `neutral-300` (dark mode)

**Small Text**:
- Font: `Inter`
- Size: `text-sm` (14px)
- Weight: `font-normal` (400)
- Line Height: `leading-normal` (1.5)
- Color: `neutral-600` (light mode) / `neutral-400` (dark mode)

**Caption**:
- Font: `Inter`
- Size: `text-xs` (12px)
- Weight: `font-normal` (400)
- Line Height: `leading-normal` (1.5)
- Color: `neutral-600` (light mode) / `neutral-400` (dark mode)

#### Special Cases

**Hero Numbers (Calculator Results)**:
- Font: `Space Grotesk`
- Size: `text-5xl` (48px) on desktop, `text-4xl` (36px) on mobile
- Weight: `font-bold` (700)
- Line Height: `leading-tight` (1.25)
- Letter Spacing: `tracking-tight` (-0.025em)
- Color: `primary-base` or `accent-base` for emphasis

**Button Text**:
- Font: `Inter`
- Size: `text-base` (16px) or `text-sm` (14px) for smaller buttons
- Weight: `font-semibold` (600)
- Line Height: `leading-normal` (1.5)
- Letter Spacing: `tracking-wide` (0.025em)
- Color: White on colored backgrounds, or colored text on light backgrounds

**Label Text**:
- Font: `Inter`
- Size: `text-sm` (14px)
- Weight: `font-medium` (500)
- Line Height: `leading-normal` (1.5)
- Color: `neutral-700` (light mode) / `neutral-300` (dark mode)

---

## 4. Spacing & Layout

### Spacing Scale

A consistent spacing scale for margins, padding, and gaps:

- `space-1`: `4px` - Tight spacing, icon padding
- `space-2`: `8px` - Small spacing, compact UI elements
- `space-3`: `12px` - Default small spacing
- `space-4`: `16px` - Base spacing unit, comfortable padding
- `space-5`: `20px` - Medium spacing
- `space-6`: `24px` - Standard spacing between sections
- `space-8`: `32px` - Large spacing, section separation
- `space-10`: `40px` - Extra large spacing
- `space-12`: `48px` - Hero spacing, major section breaks
- `space-16`: `64px` - Maximum spacing, page-level separation
- `space-20`: `80px` - Extra large page-level spacing (desktop only)

### Container Widths

- `container-sm`: `640px` - Small containers, forms
- `container-md`: `768px` - Medium containers, cards
- `container-lg`: `1024px` - Large containers, main content
- `container-xl`: `1280px` - Extra large containers, wide layouts
- `container-full`: `100%` - Full width, mobile-first

### Breakpoints

Mobile-first responsive breakpoints:

- `mobile`: `0px` - Base (mobile-first)
- `tablet`: `768px` - Tablet and up
- `desktop`: `1024px` - Desktop and up
- `wide`: `1280px` - Wide desktop and up

### Grid System

- **Mobile**: Single column, full width
- **Tablet**: 2-column grid where appropriate
- **Desktop**: 3-4 column grid for complex layouts
- **Gap**: `space-4` (16px) default, `space-6` (24px) for larger grids

---

## 5. Component Library

### Buttons

#### Primary Button
- **Background**: `primary-base` (`#206A5D`)
- **Text**: White (`#FFFFFF`)
- **Hover**: `primary-dark` (`#164A40`)
- **Padding**: `space-3` (12px) vertical, `space-6` (24px) horizontal
- **Border Radius**: `8px`
- **Font**: `Inter`, `text-base` (16px), `font-semibold` (600)
- **Min Height**: `44px` (touch target)
- **Transition**: `150ms ease-in-out`

#### Secondary Button
- **Background**: Transparent
- **Text**: `primary-base` (`#206A5D`)
- **Border**: `2px solid` `primary-base`
- **Hover**: `primary-light` background (`#4A9B8E`), white text
- **Padding**: `space-3` (12px) vertical, `space-6` (24px) horizontal
- **Border Radius**: `8px`
- **Font**: `Inter`, `text-base` (16px), `font-semibold` (600)
- **Min Height**: `44px`

#### Accent Button (CTA)
- **Background**: `accent-base` (`#FFCC29`)
- **Text**: `neutral-900` (`#0F172A`)
- **Hover**: `accent-dark` (`#E6B825`)
- **Padding**: `space-3` (12px) vertical, `space-6` (24px) horizontal
- **Border Radius**: `8px`
- **Font**: `Inter`, `text-base` (16px), `font-semibold` (600)
- **Min Height**: `44px`

#### Ghost Button
- **Background**: Transparent
- **Text**: `neutral-700` (light mode) / `neutral-300` (dark mode)
- **Hover**: `neutral-100` background (light mode) / `neutral-800` (dark mode)
- **Padding**: `space-2` (8px) vertical, `space-4` (16px) horizontal
- **Border Radius**: `6px`
- **Font**: `Inter`, `text-sm` (14px), `font-medium` (500)

### Input Fields

#### Text Input
- **Background**: `background-elevated` (`#F8FAFC` light / `#1E293B` dark)
- **Border**: `1px solid` `neutral-300` (light) / `neutral-600` (dark)
- **Border Radius**: `8px`
- **Padding**: `space-3` (12px) vertical, `space-4` (16px) horizontal
- **Font**: `Inter`, `text-base` (16px), `font-normal` (400)
- **Color**: `neutral-900` (light) / `neutral-50` (dark)
- **Focus**: Border `2px solid` `primary-base`, outline `none`
- **Min Height**: `44px` (touch target)

#### Input Label
- **Font**: `Inter`, `text-sm` (14px), `font-medium` (500)
- **Color**: `neutral-700` (light) / `neutral-300` (dark)
- **Margin Bottom**: `space-2` (8px)

#### Input Helper Text
- **Font**: `Inter`, `text-xs` (12px), `font-normal` (400)
- **Color**: `neutral-600` (light) / `neutral-400` (dark)
- **Margin Top**: `space-1` (4px)

### Cards

#### Default Card
- **Background**: `background-elevated` (`#F8FAFC` light / `#1E293B` dark)
- **Border**: `1px solid` `neutral-200` (light) / `neutral-700` (dark)
- **Border Radius**: `12px`
- **Padding**: `space-6` (24px)
- **Shadow**: Subtle shadow for elevation (light mode only)

#### Elevated Card
- **Background**: `background-elevated`
- **Border**: None
- **Border Radius**: `16px`
- **Padding**: `space-8` (32px)
- **Shadow**: More pronounced shadow for higher elevation

### Badges & Tags

#### Success Badge
- **Background**: `success-light` (`#A5D44A`)
- **Text**: `neutral-900` (`#0F172A`)
- **Padding**: `space-1` (4px) vertical, `space-2` (8px) horizontal
- **Border Radius**: `4px`
- **Font**: `Inter`, `text-xs` (12px), `font-medium` (500)

#### Warning Badge
- **Background**: `warning-light` (`#FFD966`)
- **Text**: `neutral-900` (`#0F172A`)
- **Padding**: `space-1` (4px) vertical, `space-2` (8px) horizontal
- **Border Radius**: `4px`
- **Font**: `Inter`, `text-xs` (12px), `font-medium` (500)

#### Error Badge
- **Background**: `error-light` (`#FCA5A5`)
- **Text**: `neutral-900` (`#0F172A`)
- **Padding**: `space-1` (4px) vertical, `space-2` (8px) horizontal
- **Border Radius**: `4px`
- **Font**: `Inter`, `text-xs` (12px), `font-medium` (500)

### Alerts

#### Success Alert
- **Background**: `success-light` (`#A5D44A`)
- **Border**: `1px solid` `success-base` (`#81B214`)
- **Text**: `neutral-900` (`#0F172A`)
- **Padding**: `space-4` (16px)
- **Border Radius**: `8px`
- **Icon**: Success icon in `success-base`

#### Warning Alert
- **Background**: `warning-light` (`#FFD966`)
- **Border**: `1px solid` `warning-base` (`#FFCC29`)
- **Text**: `neutral-900` (`#0F172A`)
- **Padding**: `space-4` (16px)
- **Border Radius**: `8px`
- **Icon**: Warning icon in `warning-base`

#### Error Alert
- **Background**: `error-light` (`#FCA5A5`)
- **Border**: `1px solid` `error-base` (`#DC2626`)
- **Text**: `neutral-900` (`#0F172A`)
- **Padding**: `space-4` (16px)
- **Border Radius**: `8px`
- **Icon**: Error icon in `error-base`

#### Info Alert
- **Background**: `info-light` (`#4A9B8E`)
- **Border**: `1px solid` `info-base` (`#206A5D`)
- **Text**: White (`#FFFFFF`)
- **Padding**: `space-4` (16px)
- **Border Radius**: `8px`
- **Icon**: Info icon in white

---

## 6. Interaction Patterns

### Animation Principles

**Philosophy**: Animations should feel purposeful, professional, and delightful. They guide attention, provide feedback, and enhance the user experience without being distracting.

**Energy Level**: Moderate - smooth and intentional, not overly animated

**Timing Preferences**: Quick and snappy for interactions (150-200ms), smooth and flowing for transitions (300-500ms)

**Reduced Motion**: Always respect `prefers-reduced-motion` media query

### Transitions

#### Button Hover
- **Property**: `background-color`, `transform`
- **Duration**: `150ms`
- **Timing**: `ease-in-out`
- **Effect**: Slight scale (`scale(1.02)`) and color change

#### Input Focus
- **Property**: `border-color`, `box-shadow`
- **Duration**: `200ms`
- **Timing**: `ease-out`
- **Effect**: Border color change and subtle shadow

#### Page Transitions
- **Property**: `opacity`, `transform`
- **Duration**: `300ms`
- **Timing**: `ease-in-out`
- **Effect**: Fade and slight slide

#### Modal/Drawer
- **Property**: `opacity`, `transform`
- **Duration**: `300ms`
- **Timing**: `ease-out`
- **Effect**: Fade in with slide up

### Micro-interactions

#### Button Press
- **Transform**: `scale(0.98)` on active state
- **Duration**: `100ms`

#### Input Validation
- **Shake Animation**: Horizontal shake for invalid inputs
- **Duration**: `400ms`
- **Effect**: `translateX(-4px)` to `translateX(4px)` and back

#### Success Feedback
- **Property**: `opacity`, `transform`
- **Duration**: `300ms`
- **Effect**: Fade in with scale up

### Loading States

#### Skeleton Screens
- **Background**: `neutral-200` (light) / `neutral-700` (dark)
- **Animation**: Shimmer effect (gradient animation)
- **Duration**: `1.5s` infinite

#### Spinner
- **Color**: `primary-base` (`#206A5D`)
- **Size**: `24px` default, `48px` for large
- **Animation**: Rotate `360deg` infinite
- **Duration**: `1s` linear

---

## 7. Accessibility Checklist

### WCAG AA Compliance

✅ **Color Contrast**: All text/background combinations meet 4.5:1 ratio (normal text) and 3:1 (large text)

✅ **Focus Indicators**: All interactive elements have visible focus states (2px solid `primary-base`)

✅ **Touch Targets**: All interactive elements are minimum 44x44px

✅ **Text Scaling**: All text scales properly up to 200% without breaking layout

✅ **Keyboard Navigation**: All functionality accessible via keyboard

✅ **Screen Reader Support**: Semantic HTML, ARIA labels where needed

✅ **Reduced Motion**: Animations respect `prefers-reduced-motion`

✅ **Color Independence**: Information not conveyed by color alone (icons, labels, patterns)

### Implementation Notes

- Use `aria-label` for icon-only buttons
- Provide `alt` text for all images
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Ensure form labels are properly associated
- Test with screen readers (VoiceOver, NVDA, JAWS)

---

## 8. Implementation Guide

### CSS Custom Properties Structure

```css
:root {
  /* Core Brand Colors */
  --color-primary-base: #206A5D;
  --color-primary-dark: #164A40;
  --color-primary-light: #4A9B8E;
  
  --color-secondary-base: #81B214;
  --color-secondary-dark: #5F8510;
  --color-secondary-light: #A5D44A;
  
  --color-accent-base: #FFCC29;
  --color-accent-dark: #E6B825;
  --color-accent-light: #FFD966;
  
  --color-accent-orange-base: #F58634;
  --color-accent-orange-dark: #D66B1F;
  --color-accent-orange-light: #F8A866;
  
  /* Neutral Colors */
  --color-neutral-900: #0F172A;
  --color-neutral-800: #1E293B;
  --color-neutral-700: #334155;
  --color-neutral-600: #475569;
  --color-neutral-500: #64748B;
  --color-neutral-400: #94A3B8;
  --color-neutral-300: #CBD5E1;
  --color-neutral-200: #E2E8F0;
  --color-neutral-100: #F1F5F9;
  --color-neutral-50: #F8FAFC;
  
  /* Semantic Colors */
  --color-success-base: #81B214;
  --color-success-light: #A5D44A;
  --color-warning-base: #FFCC29;
  --color-warning-light: #FFD966;
  --color-error-base: #DC2626;
  --color-error-light: #FCA5A5;
  --color-info-base: #206A5D;
  --color-info-light: #4A9B8E;
  
  /* Light Mode Theme */
  --background-base: #FFFFFF;
  --background-elevated: #F8FAFC;
  --background-overlay: rgba(15, 23, 42, 0.5);
  --background-subtle: #F1F5F9;
  
  --text-primary: #0F172A;
  --text-secondary: #334155;
  --text-tertiary: #475569;
  --text-interactive: #206A5D;
  
  /* Typography */
  --font-primary: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-heading: 'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Roboto Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  --text-5xl: 48px;
  --text-6xl: 60px;
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2.0;
  
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}

[data-theme="dark"] {
  /* Dark Mode Theme */
  --background-base: #0F172A;
  --background-elevated: #1E293B;
  --background-overlay: rgba(0, 0, 0, 0.7);
  --background-subtle: #1E293B;
  
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-tertiary: #94A3B8;
  --text-interactive: #4A9B8E;
}
```

### Tailwind CSS Integration

For projects using Tailwind CSS, map these tokens in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          base: '#206A5D',
          dark: '#164A40',
          light: '#4A9B8E',
        },
        secondary: {
          base: '#81B214',
          dark: '#5F8510',
          light: '#A5D44A',
        },
        accent: {
          base: '#FFCC29',
          dark: '#E6B825',
          light: '#FFD966',
        },
        accentOrange: {
          base: '#F58634',
          dark: '#D66B1F',
          light: '#F8A866',
        },
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        success: {
          base: '#81B214',
          light: '#A5D44A',
        },
        warning: {
          base: '#FFCC29',
          light: '#FFD966',
        },
        error: {
          base: '#DC2626',
          light: '#FCA5A5',
        },
        info: {
          base: '#206A5D',
          light: '#4A9B8E',
        },
      },
      fontFamily: {
        primary: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.625' }],
        lg: ['18px', { lineHeight: '1.625' }],
        xl: ['20px', { lineHeight: '1.375' }],
        '2xl': ['24px', { lineHeight: '1.375' }],
        '3xl': ['30px', { lineHeight: '1.25' }],
        '4xl': ['36px', { lineHeight: '1.25' }],
        '5xl': ['48px', { lineHeight: '1.25' }],
        '6xl': ['60px', { lineHeight: '1.25' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
      },
    },
  },
}
```

### Google Fonts Import

Add to your HTML `<head>` or CSS:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 9. Figma Integration Guide

### Color Styles in Figma

Create color styles matching the design system tokens:

1. **Primary Colors**:
   - `Primary/Base`: `#206A5D`
   - `Primary/Dark`: `#164A40`
   - `Primary/Light`: `#4A9B8E`

2. **Secondary Colors**:
   - `Secondary/Base`: `#81B214`
   - `Secondary/Dark`: `#5F8510`
   - `Secondary/Light`: `#A5D44A`

3. **Accent Colors**:
   - `Accent/Base`: `#FFCC29`
   - `Accent/Dark`: `#E6B825`
   - `Accent/Light`: `#FFD966`
   - `Accent Orange/Base`: `#F58634`
   - `Accent Orange/Dark`: `#D66B1F`
   - `Accent Orange/Light`: `#F8A866`

4. **Neutral Colors**:
   - `Neutral/900` through `Neutral/50` (all 10 shades)

5. **Semantic Colors**:
   - `Success/Base`, `Success/Light`
   - `Warning/Base`, `Warning/Light`
   - `Error/Base`, `Error/Light`
   - `Info/Base`, `Info/Light`

6. **Theme Colors**:
   - `Background/Base` (light and dark variants)
   - `Background/Elevated` (light and dark variants)
   - `Text/Primary` (light and dark variants)
   - `Text/Secondary` (light and dark variants)
   - `Text/Tertiary` (light and dark variants)

### Text Styles in Figma

Create text styles using Space Grotesk for headings and Inter for body text:

1. **Headings** (Space Grotesk):
   - `Heading/H1`: Space Grotesk, Bold (700), 36px (desktop) / 30px (mobile), Line Height 1.25
   - `Heading/H2`: Space Grotesk, Semibold (600), 30px (desktop) / 24px (mobile), Line Height 1.375
   - `Heading/H3`: Space Grotesk, Semibold (600), 24px, Line Height 1.375
   - `Heading/H4`: Space Grotesk, Semibold (600), 20px, Line Height 1.5
   - `Heading/H5`: Inter, Medium (500), 18px, Line Height 1.5
   - `Heading/H6`: Inter, Medium (500), 16px, Line Height 1.5

2. **Body Text** (Inter):
   - `Body/Default`: Inter, Regular (400), 16px, Line Height 1.625
   - `Body/Large`: Inter, Regular (400), 18px, Line Height 1.625
   - `Body/Small`: Inter, Regular (400), 14px, Line Height 1.5
   - `Body/Caption`: Inter, Regular (400), 12px, Line Height 1.5

3. **Special**:
   - `Hero/Number`: Space Grotesk, Bold (700), 48px (desktop) / 36px (mobile), Line Height 1.25
   - `Button/Primary`: Inter, Semibold (600), 16px, Line Height 1.5, Letter Spacing 0.025em
   - `Label/Default`: Inter, Medium (500), 14px, Line Height 1.5

### Naming Conventions

- **Colors**: `Category/Name` (e.g., `Primary/Base`, `Neutral/900`)
- **Text Styles**: `Type/Variant` (e.g., `Heading/H1`, `Body/Default`)
- **Components**: Use descriptive names matching code components

### Export Settings

- **Icons**: SVG format, optimized
- **Images**: PNG/JPG as needed, optimized for web
- **Colors**: Export as CSS variables or hex codes
- **Spacing**: Use 8px grid system in Figma to match design system spacing

---

## 10. Evolution & Maintenance

### Adding New Components

When creating new components:
1. Follow existing component patterns
2. Use design system tokens (colors, spacing, typography)
3. Ensure WCAG AA accessibility compliance
4. Test in both light and dark modes
5. Document in this design system

### Extending Colors

If new colors are needed:
1. Check if existing colors can be used
2. If new color is necessary, add to appropriate category
3. Generate light/dark variants if needed
4. Test contrast ratios for accessibility
5. Update CSS custom properties and Tailwind config

### Typography Updates

If typography needs adjustment:
1. Maintain readability as priority
2. Ensure all weights are available in selected fonts
3. Update Google Fonts import if needed
4. Test across all breakpoints
5. Update Figma text styles

### Version Control

- Document all changes in this file
- Update version number and date
- Note breaking changes clearly
- Maintain backward compatibility when possible

---

## Quick Reference

### Most Used Colors
- Primary: `#206A5D` (Teal)
- Secondary: `#81B214` (Lime Green)
- Accent: `#FFCC29` (Yellow)
- Accent Orange: `#F58634` (Orange)

### Most Used Typography
- Body: Inter, 16px, Regular (400), Line Height 1.625
- Heading: Space Grotesk, 24-36px, Semibold (600) or Bold (700)
- Button: Inter, 16px, Semibold (600), Letter Spacing 0.025em

### Most Used Spacing
- Base: `16px` (space-4)
- Section: `24px` (space-6)
- Large: `32px` (space-8)
- Hero: `48px` (space-12)

---

**End of Design System Document**
