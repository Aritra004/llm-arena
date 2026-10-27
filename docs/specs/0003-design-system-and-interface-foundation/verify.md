# Verify: design system and interface foundation · spec 0003 · updated 2026-08-22

_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI and manual

- [ ] Open `/` in a light device theme, then a dark device theme. Confirm canvas, surfaces, text, controls, statuses, and all three response identifiers remain legible. Confirm there is no manual theme control. → AC-1, AC-8
- [ ] Navigate through Arena, Leaderboard, Models, and History at desktop width. Confirm the left sidebar marks the current route and keyboard focus remains visible. → AC-3, AC-8
- [ ] Repeat primary navigation at 320 pixels wide. Confirm the four item bottom navigation stays clear of content and each target is at least 44 pixels tall. → AC-3, AC-8, AC-9
- [ ] At 1024 pixels or wider, open `/` and confirm A, B, and C form equal columns. At a mobile width, confirm they stack and the sticky A, B, and C control moves focus to the labelled response. → AC-4, AC-9
- [ ] Compare Response A, B, and C before voting. Confirm their dimensions and emphasis are equal, the identifiers are blue, violet, and teal, and no model identity or provider cue is visible. → AC-5
- [ ] Inspect complete, live, and unavailable response cards. Confirm stable card geometry, a quiet live indicator, a plain failure sentence, retained sibling results, and a retry action with no raw exception. → AC-6, AC-7
- [ ] Enable reduced motion at the device level and revisit `/`. Confirm the live indicator and state transitions settle immediately. → AC-6
- [ ] Use only the keyboard to select model choices, enter a prompt, move through responses, activate retry and vote controls, and navigate every route. Confirm the skip link works and focus is always visible. → AC-2, AC-8
- [ ] Zoom the browser to 200 percent at 320, 768, 1024, and 1440 pixel viewport widths. Confirm controls remain usable, prose wraps, tables become cards on mobile, and there is no page level horizontal scroll. → AC-9
- [ ] Open `/leaderboard`, `/models`, `/models/qwen3-32b`, and `/history`. Confirm shared headers, cards, measurements, statuses, sparse data guidance, and private history empty state use the same visual system. → AC-2, AC-7, AC-10
- [ ] Inspect every call measurement and confirm cost is displayed as `$0.0000`. → AC-10

## Value sourcing

- [ ] Change the device color preference and confirm the rendered palette follows `prefers-color-scheme`, not stored account or browser state. → AC-1
- [ ] Navigate directly to each primary route and confirm the matching navigation item derives its current state from the route pathname. → AC-3
- [ ] Reload the Arena preview and confirm contestant display order consistently maps to A, B, and C with the documented identifier colors. → AC-5
- [ ] Compare the complete, streaming, and failed preview event states with their card status, measurement, and retry presentation. → AC-6, AC-7
- [ ] Confirm latency, tokens, and cost are rendered in one shared measurement component so later real response attempt measurements have one integration point. → AC-2, AC-10
- [ ] Confirm vote eligible, disabled, and future reveal treatments stay inside the response card component boundary. → AC-5, AC-7
- [ ] Confirm model identity, availability, capabilities, and aggregate measurements use shared model and metric patterns on catalog and detail pages. → AC-10
- [ ] Confirm History exposes no private prompt preview while signed out and shows an authenticated empty state instead. → AC-7, AC-10

## Commands

- [ ] `pnpm format:check` → all files match project formatting → AC-2
- [ ] `pnpm lint` → no lint errors → AC-2, AC-8
- [ ] `pnpm typecheck` → strict TypeScript passes → AC-2
- [ ] `pnpm test` → project checks and data model checks pass → AC-2
- [ ] `pnpm build` → every planned route compiles and prerenders successfully → AC-3, AC-4, AC-10

## Acceptance criteria coverage

AC-1 is covered by theme and preference checks. AC-2 is covered by shared component, keyboard, and command checks. AC-3 is covered by desktop and mobile navigation checks. AC-4 is covered by Arena responsive layout checks. AC-5 is covered by blind identity and stable order checks. AC-6 is covered by streaming and reduced motion checks. AC-7 is covered by state, failure, and privacy checks. AC-8 is covered by contrast, keyboard, focus, and touch target checks. AC-9 is covered by viewport and zoom checks. AC-10 is covered by planned route and measurement checks.
