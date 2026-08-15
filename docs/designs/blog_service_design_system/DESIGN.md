---
name: Blog Service Design System
colors:
  surface: '#faf9f9'
  surface-dim: '#dadada'
  surface-bright: '#faf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f3'
  surface-container: '#efeeed'
  surface-container-high: '#e9e8e8'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3f4a3d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f0f0'
  outline: '#6f7a6b'
  outline-variant: '#bfcab9'
  surface-tint: '#016e1c'
  primary: '#016e1c'
  on-primary: '#ffffff'
  primary-container: '#5cb85c'
  on-primary-container: '#00450e'
  inverse-primary: '#7edb7b'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e1e3e5'
  on-secondary-container: '#626567'
  tertiary: '#a23663'
  on-tertiary: '#ffffff'
  tertiary-container: '#f97baa'
  on-tertiary-container: '#730d3f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#99f894'
  primary-fixed-dim: '#7edb7b'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005312'
  secondary-fixed: '#e1e3e5'
  secondary-fixed-dim: '#c5c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#ffd9e3'
  tertiary-fixed-dim: '#ffb0c9'
  on-tertiary-fixed: '#3e001e'
  on-tertiary-fixed-variant: '#831d4b'
  background: '#faf9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 42px
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  ui-label:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  ui-button:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '500'
    lineHeight: '1'
  ui-meta:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1200px
  reading-column-max: 720px
  gutter: 24px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  stack-xl: 64px
---

## Brand & Style

The brand personality of this design system is intellectual, serene, and editorial. It prioritizes the "reading state" over the "interaction state," ensuring that the interface recedes into the background to allow written content to take center stage.

The design style follows a **Minimalist Editorial** approach. It leverages high-contrast typography and a vast amount of whitespace to create a sense of premium quality and focus. By avoiding heavy containers and unnecessary decorative elements, the system achieves a "paper-like" digital experience that feels both traditional and modern. The emotional response should be one of quiet focus and professional credibility.

## Colors

The palette is intentionally restrained to maintain a calm atmosphere.
- **Primary:** A professional green used sparingly for calls to action, active states, and successful feedback.
- **Headings:** A deep charcoal that provides high legibility without the harshness of pure black.
- **Body Text:** A medium gray designed to reduce eye strain during long-form reading while maintaining sufficient contrast.
- **Surface:** A pure white background provides the "canvas" for the content.
- **Dividers:** A very light gray used for subtle structural separation, replacing the need for heavy borders or shadows.

## Typography

This design system employs a dual-font strategy to balance editorial elegance with functional clarity.

- **Editorial Serif:** **Source Serif 4** is used for all narrative content. It features a high x-height and classic proportions that excel in long-form readability. Use larger sizes for titles to establish a strong visual hierarchy.
- **Functional Sans-Serif:** **Manrope** is used for the "machinery" of the site—navigation, buttons, metadata, and form labels. Its geometric yet friendly nature provides a clean contrast to the serif body text.

Maintain generous line-heights (1.5x to 1.6x) for body text to ensure a comfortable reading rhythm.

## Layout & Spacing

The layout philosophy follows a **Fixed Central Column** model for reading, while using a wider grid for discovery pages.

- **Reading Experience:** For article pages, the main text column is constrained to a maximum of 720px to maintain optimal line lengths (50-75 characters). This column is centered with massive horizontal margins to eliminate distractions.
- **Discovery Experience:** Feed pages use a standard 12-column grid.
- **Spacing Rhythm:** Use a base-8 scale for vertical spacing. Elements should feel "airy." Between sections of an article, use `stack-xl` to signal a clear shift in thought.
- **Responsive Behavior:** On mobile, margins reduce to 20px, and the layout collapses to a single column. Serif font sizes scale down slightly to prevent awkward line breaks.

## Elevation & Depth

This design system avoids physical metaphors like heavy shadows or stacked layers. Hierarchy is created through **Flat Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Strategy:** Everything exists on a single #FFFFFF plane. Depth is suggested through the use of the #EEEEEE divider line rather than a drop shadow.
- **Interactive States:** Subtle depth is only permitted on primary buttons, using a very soft, low-opacity green shadow to indicate "pressability."
- **Overlays:** Modals or dropdowns should use a simple 1px #EEEEEE border with a very large, soft blur (20-40px) and 5% black opacity to lift them slightly from the page without feeling "heavy."

## Shapes

The shape language is **Restrained and Functional**.

- **General Elements:** Buttons and input fields use a subtle 0.25rem (4px) corner radius to feel modern but professional.
- **Identity Elements:** Tags, category pills, and user avatars use a full "pill" or circular radius (rounded-xl) to contrast against the sharp, structured lines of the text columns.
- **Images:** Article header images and thumbnails should remain sharp (0px radius) to maintain the editorial, "newspaper" aesthetic.

## Components

- **Buttons:** Primary buttons use the #5CB85C background with white text. Secondary buttons use a #373A3C outline with no fill. All buttons use the `ui-button` typography and 4px rounded corners.
- **Tags/Pills:** Used for article topics. These should be fully rounded (pill-shaped) with a #EEEEEE background and `ui-meta` text color. On hover, the background shifts to a very pale green.
- **Dividers:** A simple 1px solid #EEEEEE line. Use these to separate articles in a feed instead of cards.
- **Input Fields:** Minimalist design with a 1px #EEEEEE bottom border only in default state. On focus, the border transitions to 1px #5CB85C across all four sides with a 4px radius.
- **Cards:** Do not use traditional boxed cards. Instead, use "Invisible Cards"—groups of elements (image, title, meta) separated by whitespace and a single horizontal divider at the bottom.
- **Navigation:** The top navigation bar should be sticky but highly minimal, using a #FFFFFF background with a 1px #EEEEEE bottom border only.
