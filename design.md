---
name: calm-technical-workbench
source: spec-0003
character: "A precise developer workbench with warm neutral surfaces, restrained vermilion action color, and compact measurement detail. Response content stays visually dominant while crisp outlines and stable geometry make the product feel trustworthy."
tokens: "Real values live in app/globals.css. Read them there and never duplicate them here."
contrast: "Body 8.06:1 light and 12.41:1 dark. Accent text 6.64:1 light and 6.87:1 dark. Control borders 3.65:1 light and 3.62:1 dark."
---

## Build mandate

Every page should feel like part of a complete evaluation product. Use the wordmark, product specific copy, clear hierarchy, complete states, and purposeful supporting context. Never ship a lone form, naked table, or generic chat surface.

## Character and direction

The product is a calm technical workbench. Warm neutrals soften the analytical layout. Vermilion marks primary action, active focus, and a chosen winner. Blue, violet, and teal distinguish blind responses only through small identifiers and thin edges.

## Composition patterns

Use a persistent left sidebar on wide screens and a fixed four item bottom navigation on mobile. Pages open with a compact eyebrow, one clear heading, and a short explanation. The Arena may use the full workspace width. Reading and detail pages use a narrower content measure.

Response cards are equal columns on wide screens and a vertical stack on small screens. Leaderboards reflow from a semantic table into summary cards. Model and history pages use outlined card lists with measurements aligned in compact rows.

## Component and usage rules

Use shared components from `app/design-system`. Prefer one pixel borders and neutral surfaces. Shadows belong only to temporary overlays. Use medium corners for controls and cards, pills only for statuses, and Geist Mono only for labels, code, timestamps, and measurements.

Use the accent for primary action, focus, and selection, never as decoration. Never use gradients, glass effects, neon glow, decorative AI imagery, or color as the only state signal. Keep raw token values out of component files.

## Responsive and accessibility direction

Start at 320 pixels. Keep controls at least 44 pixels tall, let long prose wrap, and contain code overflow within its own region. Respect system color preference and reduced motion. Keep focus visible, announce status changes without announcing each streamed token, and preserve successful responses when a sibling fails.
