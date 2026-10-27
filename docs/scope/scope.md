# Scope: LLM Arena

LLM Arena helps developers compare up to three free tier language models on the same prompt, vote on blind responses, and learn which model is genuinely useful from real measurements and votes. The first release is a private alpha for a small invited group.

**Build approach:** Tracer Bullet (each feature becomes a narrow working path through every real layer before the next feature begins).
**Workflow:** Prototype (each feature normally ends after `/develop` and its build time checks). Features that handle identity, private content, or vote integrity use a stricter tier.

_These steps are recommendations for keeping the build orderly. You may skip a step when the decision is already clear. You decide when a feature is done._

## At a glance

| #   | Feature                                | Phase           | Status      |
| --- | -------------------------------------- | --------------- | ----------- |
| A   | Application scaffold                   | Existing        | existing    |
| 1   | Application architecture               | Foundation      | done        |
| 2   | Coding standards and tooling           | Foundation      | done        |
| 3   | Comparison data model                  | Foundation      | done        |
| 4   | Design system and interface foundation | Foundation      | in-progress |
| 5   | Blind comparison and voting loop       | Slice 1         | planned     |
| 6   | Public leaderboard                     | Slice 2         | planned     |
| 7   | Model catalog and details              | Slice 3         | planned     |
| 8   | Private comparison history             | Slice 4         | planned     |
| 9   | Product measurement and reliability    | Alpha readiness | planned     |
| 10  | Privacy controls and alpha readiness   | Alpha readiness | planned     |

## Existing

### A. Application scaffold · existing

A runnable App Router starter exists, with strict TypeScript and initial global styling. It does not yet contain LLM Arena product behavior. code in `app/`

## Foundations

### 1. Application architecture · done · Alpha

Decide the boundaries for model execution, parallel streaming, measurement, identity, storage, environment configuration, and safe provider failures. This creates one coherent path for every later slice.
**Done when:** the architecture records how one prompt reaches up to three models concurrently, streams independent results, measures each call, protects secrets, and turns provider failures into safe user states. (basis: the existing scaffold and the project rules in `CLAUDE.md`)
spec in [0001](../specs/0001-application-architecture.md)

- [x] Design it (spec): `/architect application architecture`

### 2. Coding standards and tooling · done · Alpha

Establish consistent coding conventions and shared development tooling so every product slice is implemented, reviewed, and verified the same way.
**Done when:** formatting, linting, type checking, testing, naming, file organization, dependency management, and local verification expectations are documented, configured, and runnable through standard project commands. (basis: consistent automated checks reduce avoidable defects and keep later tracer bullet slices maintainable)
standards in [coding standards](../coding-standards.md)

- [x] Document formatting, linting, typechecking, naming, organization, dependencies, and verification expectations
- [x] Configure standard commands, staged-file checks, and centralized environment access enforcement
- [x] Verify formatting, linting, typechecking, scripted checks, and the production build

### 3. Comparison data model · done · Beta

Define the durable records for users, comparisons, selected models, responses, measurements, votes, and model metadata without exposing private prompt content.
**Done when:** the model supports anonymous comparisons, authenticated voting, one valid vote per comparison, blind identity reveal, private history, and aggregate rankings without a breaking redesign. (basis: private content and vote integrity are costly to correct after data exists)
spec in [0002](../specs/0002-comparison-data-model.md)

- [x] Design it (spec): `/architect comparison data model`
- [x] Implement the Prisma schema, migration, generated client, and persistence invariants: `/develop comparison data model`
- [x] Verify the real schema and privacy/integrity paths: `/check verify`
- [x] Exercise the dedicated data-model test pass: `/test`

### 4. Design system and interface foundation · in-progress · Alpha

Set the visual language and reusable interface patterns for the arena, leaderboard, and model pages before screen work begins.
**Done when:** the visual direction, color, type, spacing, responsive layout, streaming states, errors, focus states, and keyboard behavior are documented and reusable across all planned screens. (basis: `CLAUDE.md` and WCAG 2.2)
spec in [0003](../specs/0003-design-system-and-interface-foundation/index.md)
code in `design.md`, `app/globals.css`, `app/design-system/`, `app/arena/`, and the planned route previews in `app/`

- [x] Design it (spec): `/architect design system and interface foundation`
- [x] Build it: `/develop design system and interface foundation`
  - [x] Establish the visual tokens, brand mark, and shared component states (AC-1, AC-2, AC-7, AC-8)
  - [x] Build the responsive application shell and navigation (AC-3, AC-8, AC-9)
  - [x] Prove the Arena response layout, blind identifiers, streaming, voting, and reveal states (AC-4, AC-5, AC-6, AC-7, AC-9)
  - [x] Add reusable composition patterns for Leaderboard, Models, Model detail, and History (AC-2, AC-7, AC-10)
- [ ] Verify it: `/check verify design system and interface foundation`

## Slice 1: Core comparison loop

### 5. Blind comparison and voting loop · needs a decision · Beta

Let anyone submit one prompt to as many as three models and watch their responses arrive independently. Require users to sign in only when they vote, then reveal model identities.
**Done when:** a developer can choose models, submit a prompt, see live response and per-call latency, token, and zero-dollar cost measurements, recover from one model failing, require users to sign in only when they vote, and see identities only after that vote. (basis: completed comparison votes are the primary success metric, and identity masking reduces label-induced evaluation bias)

**Decision:** Use a POST route that creates the durable blind comparison before execution, then returns one NDJSON stream carrying independently tagged attempt events. OpenRouter is the first provider adapter because the seeded free-tier catalog already uses its stable model IDs. Anonymous ownership is a 24-hour hashed claim credential in an HTTP-only cookie. Voting is a separate Clerk-authenticated transaction; only its successful response may reveal model identities. Retries append attempts instead of replacing them.

- [x] Decide the prompt, multiplexed stream, retry, claim, vote, and reveal path
- [x] Build comparison creation, encrypted persistence, and the OpenRouter stream adapter
- [ ] Connect independent live response states and per-response retry
- [x] Build authenticated voting, anonymous claiming, and authorized reveal
- [ ] Verify partial failure, retry, vote integrity, and identity masking

## Slice 2: Rankings

### 6. Public leaderboard · needs a decision · Alpha

Turn authenticated votes and real call measurements into an honest ranking that developers can inspect without signing in.
**Done when:** the leaderboard ranks eligible models from recorded votes, shows vote volume and measured performance context, explains sparse data, and never leaks private prompts or responses. (basis: aggregate rankings are useful only when their sample size and measurement context are visible)

- [ ] Design it (spec): `/architect public leaderboard`

## Slice 3: Model exploration

### 7. Model catalog and details · needs a decision

Help developers understand which free tier models are available and how each performs beyond a single rank.
**Done when:** users can browse supported models and open a model detail view with its capabilities, availability, aggregate win record, latency, token usage, and zero dollar cost measurements. (basis: developers choosing an LLM need both quality and operational context)

- [ ] Design it (spec): `/architect model catalog and details`

## Slice 4: Personal records

### 8. Private comparison history · needs a decision · Beta

Give signed in users access to their own retained prompts, responses, measurements, and votes while keeping every record private by default.
**Done when:** a user can browse and reopen only their comparisons, distinguish voted and unfinished runs, and delete a retained comparison without affecting valid aggregate vote counts incorrectly. (basis: the chosen private by default policy and privacy risk management across the data lifecycle)

- [ ] Design it (spec): `/architect private comparison history`

## Alpha readiness

### 9. Product measurement and reliability · needs a decision · Alpha

Measure the core loop and make failures diagnosable during the private alpha without exposing prompt or response content in telemetry.
**Done when:** completed comparison votes, comparison completion, model failures, and essential performance signals are measurable, operational errors are visible to maintainers, and telemetry excludes private content. (basis: completed comparison votes are the chosen success metric)

- [ ] Design it (spec): `/architect product measurement and reliability`

### 10. Privacy controls and alpha readiness · needs a decision · Beta

Give invited testers clear expectations and control over retained private content before the alpha is treated as ready.
**Done when:** users can understand what is stored and why, request or perform deletion of their retained content and account, use every core screen with keyboard and visible focus, and complete the core loop without a raw provider or application error appearing. (basis: NIST privacy lifecycle guidance, WCAG 2.2, and `CLAUDE.md`)

- [ ] Design it (spec): `/architect privacy controls and alpha readiness`

## Deferred

These capabilities stay outside the private alpha so the first build can validate completed comparison votes.

- **Public launch and search discovery:** marketing pages, search metadata, social cards, sitemap, public terms, and consent needs
- **Payments and plans:** subscriptions, billing, and paid usage
- **Public comparison sharing:** an explicit way to publish a redacted comparison
- **Team evaluation:** shared workspaces, evaluation sets, and team reports
- **Advanced discovery:** search, filters, tags, and saved model shortlists
- **Administration:** an interface for model availability, moderation, and operational controls
- **Internationalization:** locales beyond the initial English interface

## Legend

**Next step:** the first unticked box in a feature is the recommended next action.

**Needs a decision:** `/architect` records a load bearing choice before implementation. Once the design is captured, it replaces the single box with the build milestones and any verification steps.

**Status:** `planned` means it has not started. `in-progress` means design or implementation has begun. `done` means this workflow built and verified it. `existing` means it predates this scope. `dropped` preserves something removed from the active plan.

**Workflow:** Prototype normally ends after `/develop`. Alpha adds real app verification. Beta adds verification and a dedicated test pass. The project rules still require the app to run, typecheck, lint, build, and receive real manual verification after every change.

## References

### Project sources

- `CLAUDE.md`, product intent, engineering rules, accessibility baseline, measurement requirements, safe errors, and verification expectations
- `AGENTS.md`, current framework guidance for the existing scaffold
- Existing code in `app/`, current scaffold status

### Practices and standards

- Tracer Bullet sequencing, prove a narrow real path through every layer before adding breadth
- Privacy across the data lifecycle, minimize exposure of retained prompts and responses from collection through deletion
- Blind evaluation, hide model identity until voting to reduce label induced bias

### Verified links

- [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/), the accessibility baseline for perceivable, operable, understandable, and robust interfaces
- [NIST Privacy Framework, Getting Started](https://www.nist.gov/privacy-framework/getting-started-0), guidance for managing privacy risk throughout the data lifecycle
- [Quantifying Label Induced Bias in Large Language Model Self and Cross Evaluations](https://arxiv.org/abs/2508.21164), evidence that identity labels can distort model evaluation
- [Next.js App Router documentation](https://nextjs.org/docs/app), the official reference for the scaffold already present in this repository
