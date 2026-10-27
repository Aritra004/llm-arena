# Coding standards and tooling

These standards apply to product code, infrastructure adapters, scripts, and schema work in LLM Arena. Automated checks enforce mechanical rules; review covers architecture, behavior, privacy, and accessibility.

## Standard commands

Use pnpm and commit `pnpm-lock.yaml` whenever dependencies change. Do not mix npm, Yarn, or Bun lockfiles into the repository.

| Command             | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Run the application for local manual verification.        |
| `pnpm format`       | Format supported files with Prettier.                     |
| `pnpm format:check` | Check formatting without changing files.                  |
| `pnpm lint`         | Run Next.js, React, TypeScript, and project ESLint rules. |
| `pnpm typecheck`    | Run strict TypeScript checking without emitting files.    |
| `pnpm test`         | Run the repository's lightweight scripted checks.         |
| `pnpm build`        | Produce the deployable Next.js build.                     |
| `pnpm verify`       | Run every required automated check in release order.      |

Run `pnpm verify` after every product change and before review. Also exercise the changed path through `pnpm dev` in a real browser, or use `curl` for an HTTP-only path. Record what was exercised when handing work off. The private alpha deliberately has no test runner or browser automation framework; add neither without a new architecture decision.

The pre-commit hook runs Prettier and ESLint only on staged files. It intentionally omits typechecking, tests, and builds because those whole-project checks are too slow and cannot reliably operate on only staged files. A hook passing does not replace `pnpm verify`.

## TypeScript and functional code

- Write TypeScript for application code and keep `strict` enabled. Do not use `any`, `@ts-ignore`, or unchecked type assertions to silence an error. Narrow `unknown` at an input boundary.
- Prefer pure functions, immutable values, `const`, `readonly` inputs, and returned copies. Keep mutation local when an API or measured performance constraint requires it.
- Push I/O, time, randomness, logging, telemetry, database calls, and provider SDK calls to adapters at the edge. Pass their results into domain functions.
- Model meaningful states with discriminated unions. Do not use booleans or nullable field combinations that permit impossible states.
- Validate all untrusted data at the server boundary. Types describe trusted code; they do not validate requests, provider payloads, database data, or environment input.
- Handle expected failures as typed results or stable error categories. Throw only for invariant violations or failures that the current boundary cannot recover from.

## Naming

- Use `kebab-case` for ordinary file and directory names, `PascalCase` for React component names and exported types, and `camelCase` for functions, variables, and object fields.
- Name hooks with `use`, event handlers with `handle`, and boolean values with a question-answering prefix such as `is`, `has`, `can`, or `should`.
- Name operations for the product action they perform. Avoid vague containers such as `utils`, `helpers`, `common`, `manager`, or `service` when a domain name is available.
- Use stable public model IDs and domain vocabulary from the architecture. Provider-specific names stay inside provider adapters.

## Files and boundaries

Organize product code by feature. A feature owns its components, domain functions, validation, and feature-local types. Keep framework route files in `app/` thin: parse the request, call the feature entry point, and translate the result to a response.

```text
app/                         Next.js routes, layouts, and route handlers
features/<feature>/          feature-owned UI and domain/application logic
infrastructure/ai/           provider adapters
infrastructure/database/     persistence adapters
infrastructure/env.ts        private and server-only environment access
infrastructure/public-env.ts explicitly public environment access
generated/                   generated code; never edit or lint by hand
```

Import across features only through a feature's intentional public entry point. Promote code to a shared component or shared domain module only after real reuse appears; do not create speculative shared layers. Provider SDK and Prisma types must not escape infrastructure adapters.

React Server Components are the default. Add `"use client"` only at the smallest boundary that needs browser APIs, state, or event handlers. Keep secrets, authorization decisions, and private records on the server.

## Environment, errors, and telemetry

- Read `process.env` only in `infrastructure/env.ts` or `infrastructure/public-env.ts`; ESLint enforces this. Never place a secret or private setting in the public module or a `NEXT_PUBLIC_` variable.
- Fail during startup when required configuration is absent. Optional integrations may be disabled explicitly and visibly.
- Never return raw exceptions, stack traces, provider errors, provider payloads, or provider request identifiers to users. Return a stable category, a plain-language message, and retryability.
- Never log or send prompt text, response text, credentials, authorization tokens, or raw provider payloads to analytics or diagnostics. Prefer structured events with allow-listed fields.

## UI and accessibility

- Use semantic HTML before ARIA. Every interactive control must work with a keyboard, expose an accessible name, show visible focus, and meet the WCAG 2.2 contrast baseline.
- Announce streaming progress and recoverable failures without stealing focus. Do not rely on color alone to communicate model state.
- Put shared color, spacing, and repeated patterns in `app/globals.css` or a shared component. Repeated Tailwind class groups in three places require extraction.
- Preserve blind evaluation: model identity must not reach the client before an authorized reveal, including in markup, accessibility text, telemetry, or error messages.

## Dependencies and generated files

Prefer the platform, React, and existing dependencies. Before adding a runtime package, confirm that it is maintained, compatible with the installed Next.js and React versions, and worth its bundle, security, and operational cost. Pin changes through pnpm and review install scripts and lockfile changes.

Generated Prisma files under `generated/` are outputs, not source. Change the schema or generator, regenerate, and commit the resulting output when the project workflow requires it.

## Review responsibilities

Automation checks formatting, framework rules, common TypeScript errors, and banned environment access. Reviewers must still verify feature boundaries, immutable domain behavior, safe failure copy, privacy-safe telemetry, authorization on the server, accessibility, streaming and partial-failure behavior, migration safety, and actual browser behavior.
