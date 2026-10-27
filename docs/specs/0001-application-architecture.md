# 0001. Application architecture

**Date**: 2026-08-21
**Status**: Accepted

## Summary

Build LLM Arena as one modular Next.js application with clear internal boundaries. One server request starts up to three isolated model calls, combines their events into one browser stream, measures each call, and allows one model to fail without stopping the others. Keep identity, storage, protection, and telemetry behind server side adapters so later features share one coherent path.

## Context

The private alpha must compare up to three free tier language models concurrently. Results need to appear independently as they stream, while latency, token usage, completion state, and zero dollar cost remain honest per call.

Later features depend on the same execution path for anonymous comparisons, authenticated votes, private history, rankings, and operational measurement. Provider credentials and private prompt content must never cross an unsafe boundary. Provider failures must become safe user states rather than raw exceptions.

The product is an early web application with a small invited audience. A distributed system would add deployment and failure complexity before scale requires it.

## Requirements

**User stories**:

* As a visitor, I want one prompt sent to up to three selected models so that I can compare their answers as they arrive.
* As a visitor, I want one failed model to leave the other results usable so that a partial provider outage does not waste the comparison.
* As a maintainer, I want consistent measurements and safe diagnostics so that I can understand reliability without collecting private content in telemetry.
* As a developer, I want providers, identity, persistence, and telemetry behind stable boundaries so that later features do not duplicate infrastructure logic.

**Acceptance criteria**:

* **AC-1**: One accepted comparison request can start one to three model calls concurrently and stream independently tagged events for every selected model through one response.
* **AC-2**: Every model call records server measured start time, first token latency when available, completion time, token counts when reported, status, and `$0.0000` cost.
* **AC-3**: A timeout, cancellation, rate limit, or provider failure affects only its model result and reaches the browser as a safe state with a retry action. No raw provider error is exposed.
* **AC-4**: Provider credentials, database credentials, authentication secrets, and private telemetry configuration are available only to server code through centralized environment access that fails fast when required values are missing.
* **AC-5**: Anonymous comparison creation and authenticated voting can use the same comparison identity without trusting browser supplied ownership or authorization claims.
* **AC-6**: Durable comparison state can preserve partial results and separate retry attempts without overwriting earlier attempts.
* **AC-7**: Product analytics and operational diagnostics exclude prompt text, response text, credentials, and raw provider payloads.

## Options considered

### Option 1: Modular monolith with one multiplexed stream

Keep the product in one Next.js deployment. Separate domain logic from provider and platform adapters, and carry independently tagged model events over one comparison stream.

**Pros**:

* One deployable application is simple to build and operate for a private alpha.
* A single stream gives the browser one comparison lifecycle while preserving independent progress and errors.
* Internal adapter boundaries allow provider and platform changes without distributed services.

**Cons**:

* Streaming duration and cancellation remain subject to the hosting runtime limits.
* The application must define and maintain its own multiplexed event contract.

### Option 2: Separate browser request for each model

Let the browser start and coordinate one server request per selected model.

**Pros**:

* Each HTTP stream is mechanically simple.
* A request failure is naturally isolated.

**Cons**:

* The browser becomes responsible for comparison orchestration and shared lifecycle rules.
* Authorization, rate limiting, persistence, and retries become harder to enforce as one atomic comparison.

### Option 3: Dedicated execution service and message broker

Move model execution and streaming into a separate service backed by asynchronous messaging.

**Pros**:

* Long running work can be isolated from the web application runtime.
* Independent scaling becomes possible if volume grows substantially.

**Cons**:

* It adds deployment, messaging, correlation, and operational failure modes before the alpha needs them.
* It slows delivery of the first complete product path.

## Decision

**Chosen option**: Option 1: Modular monolith with one multiplexed stream

Use the existing Next.js App Router application as the single deployable unit. Organize it by product feature, push side effects into infrastructure adapters, and use a server owned comparison orchestrator to fan out model calls and merge tagged events into one stream.

The architecture has these boundaries:

* `comparisons` owns request validation, orchestration, the stream event contract, response attempt lifecycle, and safe result states.
* `models` owns stable public model identifiers and provider neutral model metadata.
* `voting` owns authenticated vote rules and never trusts identity or ownership supplied by the browser.
* `identity` translates Clerk identity into application identity.
* `measurement` wraps each model call and emits content free measurements and telemetry.
* `infrastructure/ai` contains provider adapters. Provider SDK types and errors do not escape this boundary.
* `infrastructure/database` contains Prisma access. Domain code does not issue database calls directly.
* `infrastructure/env.ts` and `infrastructure/public-env.ts` are the only environment access points. Only explicitly public configuration may enter the client bundle.

The server accepts one validated command containing the prompt and one to three stable model IDs. It creates the comparison identity before execution, starts all calls concurrently, and emits tagged lifecycle, content, measurement, completion, and safe error events. One task failing does not cancel sibling tasks. A browser disconnect requests cancellation where the provider supports it and preserves measurements already observed.

Each response attempt is append only. Retrying a failed model creates a new attempt under the same comparison rather than replacing history. Feature 2 will define the exact records, fields, relationships, retention rules, and database constraints.

Errors cross the browser boundary only as a stable category such as unavailable, timed out, rate limited, cancelled, or interrupted, plus a human message and whether retry is allowed. Raw exceptions, provider payloads, and provider request identifiers remain server side.

## Rationale

The alpha needs real concurrency and partial failure handling, but it does not need distributed infrastructure. A modular monolith provides the shortest tracer bullet through the interface, execution, measurement, identity, and storage boundaries while keeping those boundaries explicit enough to extract later if measured constraints require it.

One multiplexed stream keeps comparison coordination on the trusted server. It also gives the client a single connection and a stable event identity for updating each result independently. Append only attempts preserve honest measurements and avoid hiding failures during retries.

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | Strict TypeScript | It matches the scaffold and makes adapter and stream contracts checkable without `any`. |
| Application pattern | Feature organized modular monolith with functional domain code | It keeps one deployment while isolating side effects and product boundaries. |
| Framework | Next.js App Router and React | It is the existing application foundation and supports server owned streaming routes. |
| Package manager | pnpm | The existing lockfile and workspace configuration already establish it. |
| Styling | Tailwind CSS with shared values in `app/globals.css` and shared components | It matches the scaffold while enforcing the project rule against copied repeated class patterns. |
| Model execution | Provider neutral adapters behind a comparison orchestrator | It prevents provider SDK types, credentials, and failures from leaking into product code. |
| Streaming | One server response with tagged events per response attempt | It preserves one comparison lifecycle and independent model progress. |
| Primary database | PostgreSQL through Prisma | Relational constraints fit comparisons, attempts, measurements, identities, and votes. Prisma is the recorded project integration choice. |
| Authentication | Clerk behind an identity adapter | A proven hosted identity boundary avoids custom session security and is the recorded project choice. |
| Request protection | Arcjet at the comparison route boundary | It centralizes abuse and rate limit enforcement before provider work begins. |
| Product analytics | PostHog with content free events | It supports alpha funnel measurement without sending prompts or responses. |
| Operational diagnostics | Structured server logs with redaction | It makes failures diagnosable while keeping private content and credentials out of logs. |
| Hosting | A managed Node.js runtime compatible with Next.js streaming | It keeps operations small while making streaming support and execution limits explicit deployment checks. |
| Cache and background jobs | None for the alpha | Direct request execution and PostgreSQL are sufficient until measured runtime or volume requires more infrastructure. |

## Consequences

**Positive**:

* Later slices share one execution and measurement path.
* Provider failures are isolated without introducing distributed services.
* Secrets, identity, persistence, and telemetry have explicit server boundaries.
* Provider adapters and stable event contracts can be verified independently with lightweight checks.

**Negative / tradeoffs**:

* The web request remains coupled to provider execution duration and hosting limits.
* The team owns the tagged streaming protocol and its compatibility.
* Direct execution cannot survive every process restart without later adding resumable background work.

**Neutral**:

* The exact provider set and model catalog belong to the comparison feature rather than this foundational boundary decision.
* The exact relational schema, retention behavior, and vote constraints belong to Feature 2.
* A queue or separate execution service should be considered only after measurements show the managed runtime is inadequate.

## Follow-up

* [ ] Confirm the selected managed host supports the required streaming duration and disconnect cancellation before implementing the three model path.
* [ ] Connect Prisma and PostHog tooling after their project accounts exist so implementation can verify real schema and telemetry state.
* [ ] Use Arcjet's current published guidance when implementing request protection.
* [ ] Use Clerk's current official Next.js guidance when implementing identity.
