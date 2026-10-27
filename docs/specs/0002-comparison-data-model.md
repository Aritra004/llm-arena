# 0002. Comparison data model

**Date**: 2026-08-22
**Status**: Accepted

## Summary

Use a relational PostgreSQL model that separates comparisons, blind contestants, append-only response attempts, measurements, and revisioned votes. Anonymous comparisons use short-lived hashed claim tokens and can be atomically claimed after sign-in. Private prompt and response content is encrypted at the application boundary and can be erased without corrupting anonymous ranking aggregates.

## Context

LLM Arena must let visitors compare up to three models before signing in, require authentication to vote, reveal model identities only after a valid vote, and later show authenticated users their private comparison history. The same durable records must support retries, partial provider failures, per-call measurements, model catalog changes, and public aggregate rankings.

Prompt and response content is private. Deleting retained history must erase that content and its user linkage while preserving valid anonymous measurements and vote totals. Model metadata also changes over time, so historical results cannot depend on a mutable catalog row.

## Requirements

### Acceptance criteria

* **AC-1**: A comparison contains one encrypted prompt and one to three blind contestants, each tied to the exact immutable model version used for execution.
* **AC-2**: A visitor can securely reclaim an anonymous comparison for 24 hours using an opaque server-issued credential whose hash, never raw value, is stored in the database.
* **AC-3**: Claiming a comparison atomically removes its anonymous credential and assigns one authenticated application user without trusting a browser-supplied user identifier.
* **AC-4**: Each contestant can have multiple append-only response attempts. A retry creates a new attempt and does not overwrite prior content, status, or measurements.
* **AC-5**: Prompt and response text is stored only as authenticated ciphertext with a key version. Private content can be erased independently of aggregate-safe records.
* **AC-6**: Each comparison has at most one logical vote. Replacing a vote appends an immutable revision and atomically changes which single revision counts toward rankings.
* **AC-7**: A vote revision can select only a successful response attempt belonging to the same comparison, and the initial vote is cast by an authenticated user.
* **AC-8**: Removing a comparison from private history erases prompt and response ciphertext and detaches user identity while retaining anonymized measurements and the current aggregate vote.
* **AC-9**: Model catalog changes do not rewrite historical identity, capability, or provider-version facts used by prior comparisons.
* **AC-10**: Model identity is not exposed to the client through contestant records before an authenticated vote authorizes reveal.

## Data model

All primary keys are UUIDs unless a stable public string identifier is explicitly named. All mutable records carry `createdAt` and `updatedAt`; immutable event-like records carry `createdAt` only. Database timestamps use UTC.

### `User`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `clerkSubject` | String | Required and unique; the only copied Clerk identity value |
| `createdAt` | DateTime | Required, database default |
| `updatedAt` | DateTime | Required, updated automatically |

Email addresses, display names, avatars, and authentication credentials are not copied into the application database.

### `Model`

| Field | Type | Rules |
|---|---|---|
| `id` | String | Stable public model ID and primary key |
| `name` | String | Provider-neutral display name |
| `description` | String | Catalog description |
| `availability` | Enum | `AVAILABLE`, `DEGRADED`, or `UNAVAILABLE` |
| `createdAt` | DateTime | Required, database default |
| `updatedAt` | DateTime | Required, updated automatically |

Availability is mutable catalog state and must not be used as a historical execution fact.

### `ModelVersion`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `modelId` | String | Foreign key to `Model` |
| `providerModelId` | String | Required server-side provider identifier |
| `versionLabel` | String | Required immutable display/version label |
| `capabilities` | JSON | Required immutable capability snapshot |
| `contextWindowTokens` | Integer | Nullable when the provider does not publish it |
| `effectiveFrom` | DateTime | Required |
| `effectiveTo` | DateTime | Nullable while current |
| `createdAt` | DateTime | Required, database default |

`modelId` and `versionLabel` are unique together. Published versions are immutable; catalog changes create another version.

### `Comparison`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key and public comparison correlation ID |
| `promptCiphertext` | Bytes | Nullable only after content erasure |
| `promptKeyVersion` | String | Nullable exactly when prompt ciphertext is absent |
| `ownerId` | UUID | Nullable foreign key to `User` |
| `claimTokenHash` | Bytes | Nullable, unique, never returned after issuance |
| `claimExpiresAt` | DateTime | Nullable; required with a claim-token hash |
| `revealedAt` | DateTime | Nullable until the first authenticated vote |
| `contentDeletedAt` | DateTime | Nullable until private content is erased |
| `createdAt` | DateTime | Required, database default |
| `updatedAt` | DateTime | Required, updated automatically |

A live comparison is either anonymously claimable or owned: `ownerId` and `claimTokenHash` cannot both be present. Claiming uses a transaction that matches the token hash, verifies expiry, writes `ownerId`, and clears both claim fields. An unclaimed comparison's private content becomes eligible for erasure 24 hours after creation.

The ciphertext value is one versioned authenticated-encryption envelope containing the nonce, ciphertext, and authentication tag. The associated key version selects server-only key material and supports rotation without storing secrets in the row.

### `Contestant`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `comparisonId` | UUID | Foreign key to `Comparison` |
| `modelVersionId` | UUID | Foreign key to `ModelVersion` |
| `displayPosition` | Small integer | Required; blind position 1 through 3 |
| `createdAt` | DateTime | Required, database default |

`comparisonId` with `displayPosition` is unique. `comparisonId` with `modelVersionId` is also unique, preventing duplicate models in one comparison. The server maps contestants to opaque client-safe stream identifiers and withholds the model-version relationship until reveal is authorized.

### `ResponseAttempt`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `contestantId` | UUID | Foreign key to `Contestant` |
| `attemptNumber` | Integer | Starts at 1 and increases per contestant |
| `responseCiphertext` | Bytes | Nullable before content arrives or after erasure |
| `responseKeyVersion` | String | Nullable exactly when response ciphertext is absent |
| `status` | Enum | `PENDING`, `STREAMING`, `SUCCEEDED`, `FAILED`, or `CANCELLED` |
| `errorCategory` | Enum | Nullable; `UNAVAILABLE`, `TIMED_OUT`, `RATE_LIMITED`, `CANCELLED`, or `INTERRUPTED` |
| `startedAt` | DateTime | Required server measurement |
| `firstTokenAt` | DateTime | Nullable when no token was observed |
| `completedAt` | DateTime | Nullable until terminal |
| `inputTokens` | Integer | Nullable when unavailable |
| `outputTokens` | Integer | Nullable when unavailable |
| `costUsdTenThousandths` | Integer | Required and zero for free-tier alpha calls |
| `createdAt` | DateTime | Required, database default |

`contestantId` with `attemptNumber` is unique. Attempts are append-only apart from lifecycle transitions that fill previously unknown output, measurement, and terminal-state fields. Durations are derived from timestamps. Unknown token counts remain null, not zero. A terminal status cannot transition again.

### `Vote`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `comparisonId` | UUID | Required and unique foreign key to `Comparison` |
| `userId` | UUID | Nullable foreign key to `User`; required when first cast |
| `currentRevisionId` | UUID | Required, unique foreign key to `VoteRevision` |
| `createdAt` | DateTime | Required, database default |
| `updatedAt` | DateTime | Required, updated automatically |

There is one logical vote per comparison. `userId` may become null only during privacy erasure; this preserves an anonymous aggregate record without retaining the voter identity.

### `VoteRevision`

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `voteId` | UUID | Foreign key to `Vote` |
| `selectedAttemptId` | UUID | Foreign key to `ResponseAttempt` |
| `sequence` | Integer | Starts at 1 and increases per vote |
| `createdAt` | DateTime | Required, database default |

`voteId` with `sequence` is unique. Revisions are immutable. Casting or replacing a vote occurs in one transaction that validates authentication, verifies the selected attempt succeeded and belongs to the vote's comparison, appends the revision, updates `currentRevisionId`, and sets `revealedAt` on the first vote. Only the current revision contributes to ranking queries.

## Relationships

| Parent | Child | Cardinality | Delete behavior |
|---|---|---|---|
| `User` | `Comparison` | One to many | Detach ownership before deleting the user |
| `User` | `Vote` | One to many | Detach voter identity before deleting the user |
| `Model` | `ModelVersion` | One to many | Restrict while referenced |
| `ModelVersion` | `Contestant` | One to many | Restrict while referenced |
| `Comparison` | `Contestant` | One to one-to-three | Cascade only for hard deletion of an invalid/unvoted record |
| `Contestant` | `ResponseAttempt` | One to many | Cascade only with its contestant |
| `Comparison` | `Vote` | One to zero-or-one | Preserve for normal privacy erasure |
| `Vote` | `VoteRevision` | One to many | Preserve with the aggregate vote |
| `ResponseAttempt` | `VoteRevision` | One to many | Restrict while referenced |

Cross-table vote eligibility and current-revision ownership require database-enforced constraints or triggers in the migration when ordinary foreign keys cannot express them. Application validation is defense in depth, not the sole integrity mechanism.

## Indexes and query paths

* Index `Comparison(ownerId, createdAt desc)` for private history.
* Index `Comparison(claimExpiresAt)` where anonymous claims are present for expiry cleanup.
* Index `Contestant(modelVersionId)` for historical model aggregates.
* Index `ResponseAttempt(contestantId, attemptNumber)` and terminal status for execution recovery.
* Index `Vote(userId, updatedAt desc)` for identity-scoped access and erasure.
* Index `VoteRevision(selectedAttemptId)` for winner aggregation joins.
* Rank only `Vote.currentRevisionId`, joining through the selected attempt, contestant, model version, and stable model.

No index, telemetry field, or diagnostic log contains prompt or response plaintext.

## Privacy and retention

* Raw anonymous claim credentials exist only in the secure browser session and are never logged or persisted server-side.
* Unclaimed content is erased after 24 hours. Expired claim fields are cleared in the same cleanup operation.
* Authenticated content is retained until the user deletes the comparison or account, subject to the later privacy-controls specification.
* History deletion nulls encrypted prompt and response envelopes and their key versions, clears ownership and claim fields, sets `contentDeletedAt`, and detaches `Vote.userId`.
* Measurements, model-version references, vote revisions, and the current vote pointer remain because they contain no prompt, response, or identity data after detachment.
* Encryption keys are read only through centralized server environment access. Key rotation and destruction are operational actions outside ordinary database writes.

## Build plan

* [x] **DM-1 (AC-1, AC-4, AC-9)**: Replace the starter Prisma models with model catalog, comparison, contestant, response-attempt, and enum definitions.
* [x] **DM-2 (AC-2, AC-3, AC-5, AC-8)**: Add ownership, hashed-claim, encrypted-content, expiry, and privacy-erasure fields and constraints.
* [x] **DM-3 (AC-6, AC-7)**: Add vote and immutable vote-revision records with database-enforced same-comparison and current-revision integrity.
* [x] **DM-4 (AC-1 through AC-9)**: Generate and review the PostgreSQL migration and regenerated Prisma client; remove starter data and update the database connectivity check.
* [x] **DM-5 (AC-2 through AC-8)**: Add lightweight scripted checks for claim, retry, vote replacement, invalid vote target, expiry, and content-erasure invariants.
* [x] **DM-6 (AC-10)**: Verify persistence adapters expose blind client-safe projections before reveal and model identity only after authorized reveal.

## Rationale

The normalized relational shape makes ownership and vote integrity explicit while retaining append-only evidence of retries and vote changes. Separating a stable model from immutable model versions keeps historical rankings meaningful when providers update aliases or capabilities. A current vote pointer avoids double-counting revisions without destroying their audit trail.

Application-level authenticated encryption reduces the impact of accidental database access and makes private-content erasure independent from aggregate records. Short-lived hashed claims support the anonymous-to-authenticated journey without storing bearer credentials. Detaching identity and removing ciphertext, instead of deleting aggregate rows, preserves honest rankings while honoring private-history deletion.

## Consequences

**Positive**:

* Anonymous creation, authenticated claiming, retries, vote replacement, private history, deletion, and ranking share one durable model.
* Historical measurements and winners remain tied to the exact model version used.
* Private content and identity can be erased without silently rewriting public aggregates.

**Negative / tradeoffs**:

* Application-level encryption requires versioned key management and explicit decrypt/encrypt boundaries.
* Cross-table vote integrity needs migration-level PostgreSQL constraints or triggers beyond Prisma's declarative relations.
* Revisioned voting adds a transactional write and an extra join to aggregate queries.

**Neutral**:

* This model permits vote replacement after retries; product UI rules will decide how that action is presented.
* Cleanup scheduling and account-deletion orchestration belong to later implementation and privacy-control features.
* Provider-specific request identifiers and raw payloads are deliberately absent.

## References

* [Application architecture](./0001-application-architecture.md)
* [Coding standards](../coding-standards.md)
* [Project scope](../scope/scope.md)
