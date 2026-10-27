# 0003. Design system and interface foundation

**Date**: 2026-08-22
**Status**: In Progress

## Summary

Give LLM Arena the feel of a calm technical workbench. The interface follows the device theme, uses restrained vermilion accents, and keeps model responses and honest measurements at the center. Shared tokens and components make the Arena, Leaderboard, Models, and History screens feel like one precise product.

## Requirements

**User stories**:

* As a visitor, I want to compare up to three responses without visual bias so that I can judge their content fairly.
* As a developer, I want measurements to be compact and legible so that I can weigh quality against operational performance.
* As a keyboard or assistive technology user, I want every workflow and state to remain perceivable and operable.
* As a returning user, I want every product screen to share predictable navigation, controls, and feedback.

**Acceptance criteria**:

* **AC-1**: Shared color, typography, spacing, radius, border, elevation, motion, and layout tokens define both light and dark appearances in `app/globals.css`. The active appearance follows `prefers-color-scheme` and there is no manual theme control.
* **AC-2**: Shared primitives cover buttons, text inputs, text areas, selects, badges, cards, measurement rows, tables, tabs, status messages, skeletons, empty states, error states, and retry actions without repeating styling across screens.
* **AC-3**: The application shell uses a persistent left sidebar on desktop and a four item bottom navigation on mobile for Arena, Leaderboard, Models, and History. The current destination is exposed visually and programmatically.
* **AC-4**: The Arena lays out one to three equal response columns on wide screens and stacked response cards on mobile. Mobile provides a sticky A, B, and C jump control that moves focus to the chosen response.
* **AC-5**: Before voting, Response A, B, and C have identical structure and visual weight. Blue, violet, and teal appear only as restrained identifiers on the badge, focus treatment, and thin card edge. Model identity, logo, provider color, and reputation cues remain hidden.
* **AC-6**: Streaming uses a quiet live indicator and stable containers. Content arrival does not trigger decorative motion or disruptive layout shifts, and all nonessential motion stops under `prefers-reduced-motion`.
* **AC-7**: Loading, streaming, success, empty, partial failure, complete failure, selected, voted, and identity revealed states are visually and programmatically distinct. Every failure uses a plain sentence and an available retry action, never a raw exception.
* **AC-8**: Text and interactive controls meet WCAG 2.2 AA contrast. Every control is keyboard operable, has a visible vermilion focus treatment, keeps a minimum 44 by 44 pixel touch target where practical, and has an accessible name.
* **AC-9**: At 200 percent browser zoom and viewport widths from 320 pixels upward, navigation and primary workflows remain usable with no clipped controls or page level horizontal scrolling. Long response content wraps, while code and data regions scroll within their own bounds.
* **AC-10**: Arena, Leaderboard, Models, Model detail, and History use the screen compositions and component patterns defined in this specification, including honest `$0.0000` cost display wherever call measurements appear.

## Decision

**Chosen option**: Option 1: Calm technical workbench

Build one responsive design system with the following visual direction.

### Brand and tone

* Use a typographic `LLM Arena` wordmark with a small code native arena mark made from simple geometric lines. No image asset or mascot is required.
* Keep language direct, specific, and calm. Prefer `Response B timed out. Try this response again.` over playful or provider specific copy.
* Use vermilion for primary actions, active state, focus, and the selected winner. Do not use gradients, glass effects, neon glow, or decorative AI imagery.

### Color

Color roles are semantic. Components consume the role, never a raw color value.

| Role | Light appearance | Dark appearance | Use |
|---|---|---|---|
| Canvas | `#F6F5F2` | `#11100F` | Application background |
| Surface | `#FFFFFF` | `#191817` | Cards, sidebar, inputs |
| Surface muted | `#EEECE8` | `#242220` | Secondary regions and hover |
| Text | `#1D1B19` | `#F4F1EC` | Primary text |
| Text muted | `#625E58` | `#B8B1A8` | Secondary copy and metadata |
| Border | `#D8D4CE` | `#3B3834` | Fine dividers and outlines |
| Accent | `#B83A22` | `#FF745C` | Primary actions and selection |
| Accent strong | `#8F2917` | `#FF9B88` | Hover and high contrast detail |
| Response A | `#2563EB` | `#78A7FF` | Identifier only |
| Response B | `#7C3AED` | `#B99AFF` | Identifier only |
| Response C | `#0F766E` | `#5ED5C9` | Identifier only |
| Success | `#26734D` | `#63D39A` | Completed and available states |
| Warning | `#8A5A00` | `#F3BE55` | Rate limits and caution |
| Danger | `#B42318` | `#FF8A80` | Failed and destructive states |

Never communicate state through color alone. Pair every color with text, an icon, a shape, or an ARIA state. Confirm final foreground and background combinations with automated and manual contrast checks during implementation.

### Typography

* Use Geist Sans for navigation, controls, headings, prose, and model responses.
* Use Geist Mono only for response labels, latency, token totals, cost, timestamps, and code.
* Use a compact type scale: 12 pixel metadata, 14 pixel supporting text, 16 pixel body, 20 and 24 pixel section headings, and a 32 pixel page heading on wide screens.
* Keep response prose at 16 pixels with a 1.65 line height and a readable line length. Do not reduce response text to fit three columns.
* Use tabular numerals for measurements so streaming values do not jump horizontally.

### Space, shape, and depth

* Use a 4 pixel base spacing scale, with common steps of 4, 8, 12, 16, 24, 32, and 48 pixels.
* Use 10 pixel corners for controls and 14 pixel corners for cards and panels. Pills are reserved for status and compact filters.
* Use one pixel borders for primary structure. Use shadows only for menus, dialogs, and other temporary layers.
* Keep content width fluid. General reading pages stop at 1440 pixels, while the Arena may use the available workspace width.

### Motion

* Use 120 to 180 millisecond transitions for hover, focus, selection, and disclosure.
* Stream text naturally into a stable response region. Show a small dot and `Live` label in the card header.
* Do not use shimmer, bouncing dots, animated gradients, or typing simulations.
* Under `prefers-reduced-motion`, remove nonessential transitions and use immediate state changes.

## Feature design

**Data model sketch**: None. This foundation introduces no persisted product data.

**State transitions**: Components support idle, hover, focus, active, loading or streaming, success, warning, error, disabled, selected, voted, and revealed states where relevant. Product features own the business transitions between those states.

**API surface**: None. This foundation consumes data supplied by later feature slices.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Render appearance | Light or dark palette | Browser `prefers-color-scheme` media query |
| Render navigation | Current destination | Next.js route pathname |
| Render response identity | A, B, or C label and identifier color | Stable contestant display order from the comparison projection |
| Render response state | Loading, streaming, success, or safe failure | Tagged response attempt events defined by spec 0001 |
| Render measurements | Latency, token count, and `$0.0000` cost | Persisted response attempt measurements defined by spec 0002 |
| Render vote state | Eligible, selected, voted, and revealed identity | Comparison and vote projection defined by spec 0002 |
| Render model summaries | Identity, availability, capability, and aggregate measurements | Model metadata and public aggregate projections defined by spec 0002 |
| Render private history | Prompt preview, completion state, and vote state | Authenticated user comparison projection defined by spec 0002 |

**Key invariants**:

* Blind response cards have equal structure, dimensions, and emphasis before a vote.
* Model identity and provider branding never appear before the reveal state.
* Color is never the only way to identify a response, status, selection, or error.
* A raw exception or provider message never enters a user facing component.
* Cost remains visible as `$0.0000` wherever call measurements are shown.

**Security model**: The design system owns presentation only. Public aggregate screens never render prompt or response content. History patterns render private content only after the owning feature supplies an authenticated, owner scoped projection.

**Critical test scenarios**:

* Happy path: submit a three model comparison, follow independent streams, inspect measurements, select a winner, and understand the identity reveal with keyboard only navigation, verifies **AC-2**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-10**.
* Failure case: one response fails while two complete, the failed card gives a safe retry action, successful cards remain readable, and no layout shifts or raw errors appear, verifies **AC-4**, **AC-6**, **AC-7**, **AC-9**.
* Responsive case: complete primary navigation and compare all responses at 320 pixels and 200 percent zoom without clipped controls or page level horizontal scrolling, verifies **AC-3**, **AC-4**, **AC-8**, **AC-9**.
* Preference case: switch the device between light and dark appearance and enable reduced motion, then confirm every state remains legible and motion settles immediately, verifies **AC-1**, **AC-6**, **AC-8**.

### Interface foundation

### Application shell

The desktop shell uses a 232 pixel left sidebar with the wordmark, primary navigation, and account area. It may collapse to a 72 pixel icon rail at intermediate widths if all items retain accessible names. The content region owns page scrolling.

Below 768 pixels, replace the sidebar with a fixed bottom navigation containing Arena, Leaderboard, Models, and History. Respect device safe areas and reserve enough page padding that the navigation never covers content. Keep account access in a compact top bar.

### Component inventory

| Component | Required behavior |
|---|---|
| App shell | Desktop sidebar, mobile bottom navigation, current destination, skip link |
| Button | Primary, secondary, quiet, destructive, loading, disabled, icon only |
| Field | Label, hint, error, required state, character or selection limit when relevant |
| Model selector | One to three choices, availability, keyboard selection, clear limit feedback |
| Response card | Blind label, stream region, status, measurements, retry, vote action, reveal state |
| Response jump control | Sticky mobile A, B, and C navigation, current response, focus transfer |
| Measurement row | Latency, tokens, and `$0.0000` cost with stable labels and tabular numerals |
| Status message | Info, success, warning, and error with icon, text, and optional action |
| Data table | Semantic headers, sortable state, compact mobile alternative, empty state |
| Tabs and filters | Arrow key behavior, selected state, visible focus, URL state where useful |
| Skeleton | Reserves final geometry, marked hidden from assistive technology |
| Dialog | Focus trap, labelled title, Escape handling, focus return |
| Toast | Supplemental confirmation only, never the sole location of important information |

### Arena composition

1. Page heading and one sentence explaining blind comparison.
2. Model selector showing the one to three model limit without revealing response position in advance.
3. Large prompt field with a clear submit action and concise privacy note.
4. Comparison toolbar with overall progress and a cancel action when available.
5. One to three equal response columns at 1024 pixels and wider. Each card keeps the same header, content, measurement, error, and voting regions.
6. Stacked response cards below 1024 pixels. On mobile, a sticky A, B, and C control jumps to and focuses each labelled card.
7. Vote controls appear in the same card position when a response is eligible. Selecting a response uses vermilion without changing the other cards into error or disabled colors.
8. After a valid vote, reveal model identity in place and preserve the A, B, and C label so the transition remains understandable.

Response A uses blue, Response B violet, and Response C teal. Apply these colors only to the letter badge, a two pixel leading edge, and that card's focus treatment. Neutral surfaces and identical dimensions preserve equal weight.

### Leaderboard composition

1. Page heading, plain explanation of ranking, and last updated context.
2. Eligibility and sparse data note before the ranking.
3. Ranking table with model, rank, win record, vote volume, median latency, token context, and cost.
4. On narrow screens, each row becomes a labelled summary card rather than a clipped table.
5. Rank is prominent, but sample size and measured context remain visible so rank never appears more certain than the data supports.

### Models and model detail composition

The Models page uses a calm list or grid of outlined cards with model name, provider, availability, capability summary, win record, latency, token context, and cost. Availability is text plus status, never a colored dot alone.

Model detail opens with identity and availability, then presents summary measurements, capabilities, and aggregate performance. Use the same measurement and status components as the Arena and Leaderboard.

### History composition

History uses a compact chronological list with date, prompt preview, compared response count, completion state, and vote state. Prompt previews remain visually subordinate and never appear outside authenticated private surfaces. Each item has a clear open action and destructive deletion uses confirmation.

### States and accessibility

* Use semantic landmarks, one page heading, logical heading order, and a skip link to main content.
* Focus order follows reading order. Sticky controls must not obscure the focused target.
* Response stream updates use a polite live region for status changes. Do not announce every token.
* Preserve partial successes. A failed card keeps the successful sibling cards readable and vote eligibility is explained in plain language.
* Skeletons reserve space but do not replace explicit loading labels for assistive technology.
* Empty states explain why the region is empty and give the next useful action.
* Disabled controls expose the reason in nearby text. Do not rely on a tooltip.
* Charts are not required for the foundation. Any later chart must include an equivalent text or table view.

## Build plan

1. Define both appearance palettes and the shared type, spacing, radius, border, elevation, motion, and layout tokens in `app/globals.css`, satisfies **AC-1**, **AC-8**, **AC-9**.
2. Build and document the shared primitive states, measurement pattern, feedback states, and code native brand mark, satisfies **AC-2**, **AC-7**, **AC-8**.
3. Build the responsive application shell with desktop sidebar, mobile bottom navigation, skip link, and focus behavior, satisfies **AC-3**, **AC-8**, **AC-9**.
4. Build a static Arena foundation that proves the wide response grid, mobile stack and jump control, blind color treatment, streaming state, failure state, voting state, and reveal state, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**.
5. Build reusable leaderboard, model, model detail, and history composition patterns with representative empty and sparse data states, satisfies **AC-2**, **AC-7**, **AC-9**, **AC-10**.
6. Run light and dark visual checks at 320, 768, 1024, and 1440 pixel widths, at 200 percent zoom, with keyboard only navigation, reduced motion, and contrast verification, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-6**, **AC-8**, **AC-9**, **AC-10**.

## Consequences

**Positive**:

* The product gets a recognizable identity without custom illustration work.
* Neutral response surfaces protect blind evaluation while restrained identifiers improve orientation.
* Shared measurement and state patterns reduce inconsistency across every planned screen.
* System theme support respects device preference without adding account settings or client persistence.

**Negative / tradeoffs**:

* Supporting two complete appearances from the first build doubles visual verification for every component.
* Three response identifier colors add contrast combinations that must be checked independently.
* A desktop sidebar gives response columns less width than a top bar would.
* System theme only gives users no way to override an inconvenient device setting inside the product.

**Neutral**:

* The design uses existing Geist fonts and requires no new font or icon dependency.
* The code native arena mark may be refined later without changing the interface system.
* The foundation defines representative screen compositions, while each product slice still owns its real data and behavior.

## Rationale

Decision history and references live in [rationale.md](rationale.md).
