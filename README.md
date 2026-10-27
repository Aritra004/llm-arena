<div align="center">

<img src="./public/llmarena-logo.png" alt="LLM Arena" width="320" />

# LLM Arena

**One prompt. Multiple models. Your verdict.**

Compare free-tier language models side by side, watch responses stream in, and reveal model identities after casting your vote.

[Features](#features) · [Architecture](#architecture) · [Local setup](#local-setup) · [Development](#development)

</div>

LLM Arena is a full-stack evaluation app built with Next.js and TypeScript. It brings model selection, concurrent inference, authenticated voting, public rankings, and private comparison history into one workspace.

The project focuses on the engineering behind a reliable comparison experience: independent streaming states, current model availability, transactional voting, and encrypted storage for retained content.

## Features

- **Live comparisons** — Send one prompt to up to three models. Each response streams independently, with its own completion state and measurements.
- **Vote, then reveal** — Start a comparison as a guest. Sign in to choose a successful response and reveal the model names.
- **Community leaderboard** — Explore win rates, rated appearances, median first-token latency, and measured calls. Models need 25 rated appearances to qualify for a rank.
- **Current free-tier catalog** — Browse supported models, provider information, context windows, and availability. Selection is checked against the live OpenRouter catalog before execution.
- **Private history** — Revisit saved prompts, responses, votes, and measurements. Remove retained content while preserving aggregate voting evidence.
- **Responsive interface** — A shared green palette, compact metrics, accessible controls, and layouts that adapt across desktop and mobile.

### Explore the app

| Route                     | Experience                                                    |
| ------------------------- | ------------------------------------------------------------- |
| `/`                       | Model selection, prompt entry, streamed responses, and voting |
| `/leaderboard`            | Public rankings and ranking methodology                       |
| `/models`                 | Free-tier model catalog                                       |
| `/models/[slug]`          | Individual model capabilities and performance evidence        |
| `/history`                | Account-scoped comparison history                             |
| `/history/[comparisonId]` | Saved prompt, responses, and measurements                     |

## Architecture

The app is a modular monolith: route handlers manage HTTP and authentication, feature modules coordinate product behavior, and infrastructure modules handle provider and database access.

```mermaid
flowchart LR
    UI["Next.js + React interface"]
    API["Route handlers + feature services"]
    Models["OpenRouter free-tier models"]
    DB[("PostgreSQL")]
    Auth["Clerk"]

    UI -->|"Prompt + model selection"| API
    API -->|"Concurrent requests"| Models
    Models -->|"Response deltas"| API
    API -->|"Tagged NDJSON stream"| UI
    API -->|"Prisma transactions"| DB
    Auth -->|"Session verification"| API
```

### Engineering decisions

**One connection, independent responses.** The comparison endpoint multiplexes model output into a single NDJSON stream. Events carry contestant and attempt identifiers, so each response can update independently. A provider failure does not discard successful sibling responses.

**Free-tier eligibility is enforced on the server.** Catalog filtering requires explicitly zero-priced text models. Selection is revalidated before a comparison, and inference requests set zero-price provider caps.

**Votes have a durable integrity boundary.** An anonymous comparison receives a 24-hour HTTP-only claim cookie; the database stores its hash. An authenticated vote checks ownership and the selected response, then claims and reveals the comparison within a transaction. Database constraints and triggers protect vote consistency.

**Private content and ranking evidence are separate.** Prompts and responses are encrypted with AES-256-GCM before storage. History access is scoped to the authenticated account. Removing a history record clears its retained content and account association without erasing the aggregate vote.

**Provider failures are explicit.** The stream adapter handles fragmented UTF-8, SSE framing, provider errors, empty responses, and truncated streams. The browser receives safe error messages instead of raw provider payloads.

### Technology

| Area               | Stack                                                    |
| ------------------ | -------------------------------------------------------- |
| Application        | Next.js 15 App Router, React 19, strict TypeScript       |
| Interface          | Tailwind CSS 4, CSS Modules, shared design tokens, Geist |
| Persistence        | PostgreSQL, Prisma 7, PostgreSQL driver adapter          |
| Model inference    | OpenRouter streaming API                                 |
| Identity           | Clerk                                                    |
| Request protection | Arcjet Shield and comparison rate limiting               |
| Analytics          | Optional PostHog client analytics and exception tracking |
| Tooling            | pnpm, ESLint, Prettier, Node.js test runner via `tsx`    |

## Local setup

### 1. Prerequisites

- **Node.js 24.5 or later**, compatible with the current dependency set.
- **pnpm**.
- A PostgreSQL database.
- Clerk, OpenRouter, and Arcjet credentials.
- A PostHog project token if you want analytics.

Clone the repository and install the locked dependencies:

```sh
git clone https://github.com/JasonDebnath001/llm-arena.git
cd llm-arena
pnpm install --frozen-lockfile
```

### 2. Configure the environment

Create a `.env` file in the project root:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"

OPENROUTER_API_KEY="your-openrouter-api-key"
ARCJET_KEY="your-arcjet-key"
CONTENT_ENCRYPTION_KEY="your-base64-encoded-32-byte-key"

# Optional: leave empty to skip analytics initialization.
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=""
```

Generate the encryption key locally, then paste it into `CONTENT_ENCRYPTION_KEY`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep this key stable for an existing database; changing it prevents previously stored content from being decrypted. Environment files are excluded from version control.

Use `.env` for the database connection because the Prisma CLI reads it through `dotenv/config`. If you also use `.env.local`, keep the database values consistent: Next.js and the catalog sync script give that file precedence.

### 3. Initialize the database and catalog

```sh
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm models:sync
```

Use the checked-in migrations to initialize the database. They include custom constraints and vote-integrity triggers that `prisma db push` alone does not create.

The catalog sync fetches and validates the current OpenRouter free-tier catalog, then updates model records and versions in a database transaction. Run it again when you want to refresh the stored catalog.

### 4. Start the app

```sh
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Select models, submit a prompt, and sign in when you are ready to vote. A successful vote makes the comparison available in your history.

## Development

| Command             | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`          | Start the development server                                           |
| `pnpm build`        | Create the production build                                            |
| `pnpm start`        | Serve the production build                                             |
| `pnpm lint`         | Check application code with ESLint                                     |
| `pnpm typecheck`    | Run TypeScript checks                                                  |
| `pnpm format:check` | Check formatting                                                       |
| `pnpm test`         | Run workflow checks, data-model invariants, and provider/catalog tests |
| `pnpm test:models`  | Run catalog, selection, and provider-stream tests                      |
| `pnpm verify`       | Run formatting, lint, types, tests, and the production build           |
| `pnpm models:sync`  | Refresh stored free-tier model records                                 |

The tests cover free-model eligibility, stale selections, price enforcement, streamed text and usage, malformed events, truncated responses, and safe provider errors.

For database integration verification, `pnpm test:data-model:database` creates and removes a temporary schema. Use a development or test database with schema-creation privileges.

Stop the development server before running a production build in the same checkout: both use `.next`.

### Project structure

```text
app/                 Routes, API handlers, application shell, and arena UI
features/            Comparison, leaderboard, model, and history logic
infrastructure/      Provider adapters, database access, and environment config
lib/                 Shared Prisma and request-protection integrations
prisma/              Schema, SQL migrations, and model catalog seeding
generated/prisma/    Generated Prisma client
tests/               Catalog, selection, and provider-stream tests
public/              Brand assets
docs/                Architecture decisions and development documentation
scripts/             Verification and maintenance utilities
skills/              Included engineering workflow toolkit
```

## Deployment

Use a Node.js host that supports streamed HTTP responses and PostgreSQL connectivity. Configure the same environment variables, generate the Prisma client, apply migrations, and synchronize the catalog before serving the app.

```sh
pnpm build
pnpm start
```

Allow enough request execution time for model responses and disable response buffering at any reverse proxy. The comparison endpoint uses the Node.js runtime; a static export cannot run the application.

## Scope and limitations

- **Rankings reflect community preference.** They are based on wins divided by successful rated appearances, not a controlled benchmark or an Elo score.
- **Response names are hidden until voting.** Contestant order currently follows model selection order; assignments are not randomized.
- **Free-tier capacity can change.** Providers may remove models, throttle requests, or return failures. The app validates availability and reports these states.
- **Encryption protects stored content.** Prompts still pass through the server and OpenRouter to the selected model providers.
- **Execution is request-bound.** Background jobs, resumable comparisons, and per-response retry are not implemented.

## Documentation and attribution

See the [architecture decision](docs/specs/0001-application-architecture.md), [data-model design](docs/specs/0002-comparison-data-model.md), and [coding standards](docs/coding-standards.md) for implementation context. Planning documents may describe intended behavior beyond the current implementation.

This repository also includes an engineering workflow toolkit from JavaScript Mastery, documented in the [Workflow Guide](docs/workflow-guide.md).

Licensed under the [MIT License](LICENSE). The original copyright notice is retained.
