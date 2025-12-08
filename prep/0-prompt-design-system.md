# Design System Establishment Prompt

## Context
You are establishing a foundational design system for a new web application. This design system will define the color palette and typography that serves as the single source of truth for all visual design throughout the application lifecycle.

## Initial Setup: Gathering Visual Direction

Before creating the design system, determine the starting point for colors and visual direction:

### Option 1: User Has Figma Prototypes
If the user has attached Figma designs, screenshots, or exports:
- **Extract the design system elements from Figma**:
  - Identify colors used (backgrounds, text, buttons, accents)
  - Note typography choices (font families, sizes, weights)
  - Observe spacing patterns and layout structures
  - Identify component styles and interaction patterns
- **Create alignment strategy**:
  - Generate a design system that matches the Figma designs
  - Provide exact color codes, font specifications, and spacing values
  - Note any Figma-specific elements that need code equivalents
  - Flag any accessibility issues found in the Figma design
- **Ask for confirmation**: "I've extracted these design tokens from your Figma prototype: [list key colors, fonts, spacing]. Should I use these as the foundation, or would you like to adjust anything?"
- **Provide Figma integration guidance**: Include notes on how to sync the design system back to Figma (color styles, text styles, component library structure)

### Option 2: User Has Other Visual Assets
If the user has attached an image (logo, brand graphic, design inspiration, screenshot, etc.):
- Extract the primary colors from the image
- Identify 1-3 dominant colors that could serve as brand colors
- Note the visual style, mood, and aesthetic of the image
- Ask for confirmation: "I've identified these colors from your image: [list colors with hex codes]. Should I use these as the foundation for the design system, or would you like to adjust them?"

### Option 3: User Needs Guidance
If no image is provided, conduct a brief interview:

1. **Starting Color Preference**: 
   - "Do you have any specific colors in mind for this application? You can provide hex codes, color names, or describe the feeling you're going for."
   - If they're unsure: "Based on your business model, I'm thinking [suggest 2-3 color directions]. Which resonates with you?"

2. **Color Temperature**:
   - "Should the primary color be warm (reds, oranges, yellows) or cool (blues, greens, purples)?"

3. **Accent Direction** (optional):
   - "Would you like the accent color to complement the primary color or provide strong contrast?"

4. **Figma Workflow**:
   - "Will you be creating Figma prototypes? If so, I'll structure the design system to be easily imported into Figma as color and text styles."

Keep the interview brief—3-4 questions maximum. Use the business context to make informed suggestions rather than asking too many open-ended questions.

### Option 4: Full Inference
If the user says "just create something" or "you decide," infer everything from the business model and target audience without further questions.

## Your Task
Based on the business model, target audience, application goals, and initial color direction provided, create a design system that:
1. Reflects the brand personality and business context
2. Provides a cohesive, professional user experience
3. Ensures consistency across all features and pages
4. Supports both light and dark modes
5. Meets WCAG AA accessibility standards
6. Uses named design tokens that can be referenced throughout development

## Design System Structure

### 1. Brand & Personality Assessment
Analyze the business context and define:
- **Brand personality**: 3-5 adjectives (e.g., trustworthy, innovative, approachable, bold)
- **Visual tone**: Professional level, energy level, formality
- **Target audience**: Primary user demographics and expectations
- **Competitive positioning**: How should this feel compared to competitors?

### 2. Color System

Define a complete color palette with the following structure:

#### Core Brand Colors
- `primary-base`: Main brand color
- `primary-dark`: Darker shade for hover states, emphasis
- `primary-light`: Lighter shade for backgrounds, subtle elements

- `secondary-base`: Supporting brand color
- `secondary-dark`
- `secondary-light`

- `accent-base`: Accent color for CTAs, highlights
- `accent-dark`
- `accent-light`

#### Neutral Colors
- `neutral-900`: Darkest - for primary text in light mode
- `neutral-800`: Dark text
- `neutral-700`: Secondary text
- `neutral-600`: Tertiary text
- `neutral-500`: Mid-tone - borders, dividers
- `neutral-400`: Light borders
- `neutral-300`: Subtle borders, disabled text
- `neutral-200`: Background accents
- `neutral-100`: Light backgrounds
- `neutral-50`: Lightest backgrounds

#### Semantic State Colors
- `success-base`: Success states, confirmations
- `warning-base`: Warning states, cautions
- `error-base`: Error states, destructive actions
- `info-base`: Informational states, neutral alerts

#### Theme-Specific Colors
**Light Mode:**
- `background-base`: Primary background color
- `background-elevated`: Cards, modals, elevated surfaces
- `background-overlay`: Semi-transparent overlays for modals/drawers

**Dark Mode:**
- `background-base`: Primary background color (dark)
- `background-elevated`: Cards, modals, elevated surfaces (dark)
- `background-overlay`: Semi-transparent overlays for modals/drawers (dark)

#### Text Colors (derived from primary palette)
Use the primary, secondary, accent, and neutral colors for text. Specify which colors from the palette above should be used for:
- Primary text (main content)
- Secondary text (supporting content, labels)
- Tertiary text (captions, metadata)
- Interactive text (links, buttons)
- Text on colored backgrounds (ensure WCAG AA compliance)

**Accessibility Requirements:**
- All text/background combinations must meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text/UI elements)
- Test all color combinations in both light and dark modes
- Provide specific guidance on which text colors work with which background colors

### 3. Typography System

Define font families, sizes, weights, and usage:

#### Font Families
**All fonts must be from Google Fonts (https://fonts.google.com)**

- `font-primary`: Main content font
  - Select a Google Font that provides: readability, character, brand alignment
  - Specify: exact Google Font name and fallback stack
  - Example: `'Inter', system-ui, -apple-system, sans-serif`
  - Include Google Fonts import URL

- `font-heading`: Headings font (can be same as primary or distinct)
  - Select a Google Font that provides: impact, hierarchy, brand personality
  - Specify: exact Google Font name and fallback stack
  - Example: `'Playfair Display', Georgia, serif`
  - Include Google Fonts import URL

- `font-mono`: Code, technical content (if applicable)
  - Select a monospace Google Font or use system monospace
  - Example: `'Roboto Mono', 'Consolas', 'Monaco', monospace`
  - Include Google Fonts import URL if using a Google Font

#### Type Scale
Define the complete type scale with pixel values:
- `text-xs`: XXpx - Use case
- `text-sm`: XXpx - Use case
- `text-base`: 16px - Body text (base size)
- `text-lg`: XXpx - Use case
- `text-xl`: XXpx - Use case
- `text-2xl`: XXpx - Use case
- `text-3xl`: XXpx - Use case
- `text-4xl`: XXpx - Use case
- `text-5xl`: XXpx - Use case
- `text-6xl`: XXpx - Use case (if needed)
- `text-7xl`: XXpx - Use case (if needed)

Consider the business context when defining the scale. Some applications need dramatic size variations (marketing sites), others need subtle hierarchy (dashboards).

#### Font Weights
**Only specify weights that are actually available in the selected Google Fonts**

Check the selected fonts on Google Fonts and only include available weights:
- `font-normal`: 400 - Body text, general content
- `font-medium`: 500 - Subtle emphasis, labels (only if font supports it)
- `font-semibold`: 600 - Headings, strong emphasis (only if font supports it)
- `font-bold`: 700 - Extra strong emphasis, calls to action

When specifying the Google Fonts import URL, include only the weights that will be used in the design system.

#### Line Heights
- `leading-tight`: 1.25 - Large headings, display text
- `leading-snug`: 1.375 - Small headings
- `leading-normal`: 1.5 - Standard body text
- `leading-relaxed`: 1.625 - Long-form reading content
- `leading-loose`: 2.0 - Very relaxed spacing (use sparingly)

#### Letter Spacing
- `tracking-tight`: -0.025em - Large headings, tight compositions
- `tracking-normal`: 0 - Default for body text
- `tracking-wide`: 0.025em - Small text, uppercase text, buttons

#### Typography Pairing Guidelines
- Define which font-weight + font-size + line-height combinations work best together
- Provide hierarchy examples (H1 through H6, body, caption, label, etc.)
- Specify when to use `font-primary` vs `font-heading`

### 4. Animation Principles

Define the philosophy and approach to animation and motion:

- Animations should feel purposeful and professional
- Use animation to guide attention and provide feedback
- Avoid gratuitous animation that distracts from content
- Consider reduced motion preferences (accessibility)
- Micro-interactions should be subtle but noticeable
- Page transitions should feel smooth and intentional

Provide guidance on:
- Which interactions should be animated (button hovers, page transitions, loading states, etc.)
- The overall "energy level" of animations based on brand personality
- Timing preferences (quick and snappy vs smooth and flowing)
- Whether animations should be minimal/subtle or more pronounced/expressive

### 5. Implementation Notes

#### CSS Custom Properties Structure
The design system should be implementable using CSS custom properties:

```css
:root {
  /* Colors */
  --color-primary-base: #...;
  --color-primary-dark: #...;
  --color-primary-light: #...;
  
  --color-secondary-base: #...;
  --color-secondary-dark: #...;
  --color-secondary-light: #...;
  
  --color-accent-base: #...;
  --color-accent-dark: #...;
  --color-accent-light: #...;
  
  --color-neutral-900: #...;
  --color-neutral-800: #...;
  /* ... etc ... */
  
  --color-success-base: #...;
  --color-warning-base: #...;
  --color-error-base: #...;
  --color-info-base: #...;
  
  /* Light mode theme */
  --background-base: #...;
  --background-elevated: #...;
  --background-overlay: rgba(...);
  
  /* Typography */
  --font-primary: '...', system-ui, sans-serif;
  --font-heading: '...', system-ui, sans-serif;
  --font-mono: 'Consolas', 'Monaco', monospace;
  
  --text-xs: XXpx;
  --text-sm: XXpx;
  --text-base: 16px;
  /* ... etc ... */
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  /* ... etc ... */
}

[data-theme="dark"] {
  /* Dark mode color overrides */
  --color-primary-base: #...;
  /* ... adjusted colors for dark mode ... */
  
  --background-base: #...;
  --background-elevated: #...;
  --background-overlay: rgba(...);
}
```

#### Framework Integration Notes
- For Tailwind CSS: Map these tokens to `tailwind.config.js`
- For plain CSS: Use the custom properties directly
- For CSS-in-JS: Export as JavaScript constants
- Framework-agnostic: All frameworks can consume CSS custom properties

## Output Format

Present the design system as a structured markdown document with:

1. **Executive Summary**: Brief overview of brand personality and design direction
2. **Color Palette**: Complete color specifications with hex codes for both themes
3. **Typography Scale**: Font families, sizes, weights with usage guidance
4. **Spacing & Layout**: Spacing scale, container widths, breakpoints
5. **Component Library**: Detailed specs for all standard components
6. **Interaction Patterns**: Animation timing, hover states, transitions
7. **Accessibility Checklist**: Key WCAG AA requirements and how they're met
8. **Implementation Guide**: Quick reference for developers
9. **Figma Integration Guide**: 
   - How to structure color styles in Figma matching the design system
   - How to create text styles in Figma using the Google Fonts specified
   - Naming conventions for Figma styles that match code tokens
   - Export settings for maintaining consistency between Figma and code

## Evolution & Maintenance

As new features are added:
- Extend the design system consistently with established patterns
- Add new component specs following the same structure
- Introduce new colors or styles only when necessary
- Document any new patterns in the design system
- Maintain the named token system for easy reference
- Update both light and dark mode specifications together

## Quality Standards

The design system should:
- Feel cohesive across all components
- Inspire confidence and professionalism
- Be intuitive for developers to implement
- Scale gracefully from mobile to wide displays
- Maintain consistency even as it evolves
- Support rapid feature development without design drift