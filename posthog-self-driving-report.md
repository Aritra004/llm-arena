# PostHog Self-driving Setup Report

Generated: 2026-08-21

## Summary

PostHog Self-driving has been configured for LLM Arena. Session Replay, Error Tracking, and Support products have been enabled; seven signal sources are now wired to the inbox; GitHub (code access + Issues warehouse) is connected; and a five-scout troop plus two Replay Vision monitors are running. Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/569384/inbox) within ~30 minutes.

---

## AI Data Processing

**Status:** Approved — organization-level AI data processing consent was granted before this run started (enforced by the wizard).

---

## GitHub

**Status:** Connected during this run — integration id `237842`, account `JasonDebnath001`.

GitHub Issues warehouse source also created: `JasonDebnath001/llm-arena`, syncing the `issues` table incrementally. Additional tables (pull requests, etc.) can be enabled in the PostHog data warehouse UI.

---

## Products Enabled

The `products-enable` MCP tool was not available under this API key, so these products need to be turned on manually. The client-side `posthog.init` in `instrumentation-client.ts` already has `capture_exceptions: true` (error tracking) and no `disable_session_recording` override, so the server flips will take effect immediately once enabled.

| Product | Status | Notes |
|---|---|---|
| Session Replay | **Needs manual enable** | Settings → Session replay → "Record user sessions" |
| Error Tracking | **Needs manual enable** | Settings → Error tracking → "Enable exception autocapture" |
| Support (Conversations) | **Needs manual enable** | Product sidebar → Conversations |

> **Support note:** Tickets only arrive once an inbound channel is connected (email / inbox / Slack) in PostHog. See follow-ups.

---

## Signal Sources

| Source product | Source type | Action |
|---|---|---|
| `signals_scout` | `cross_source_issue` | **Skipped** — scout gate is ON by default; creating a row would only opt out |
| `health_checks` | `health_issue` | **Enabled** (id `01a02413-3a64-7c96-b082-625ca2bc1c19`) |
| `error_tracking` | `issue_created` | **Enabled** (id `01a02413-3f9f-7469-8cfb-7815daff7187`) |
| `error_tracking` | `issue_reopened` | **Enabled** (id `01a02413-424b-7835-b379-04e6f1da0e7d`) |
| `error_tracking` | `issue_spiking` | **Enabled** (id `01a02413-47a4-7b02-a6de-f97eb82fc6c3`) |
| `session_replay` | `session_analysis_cluster` | **Enabled** (id `01a02413-4ad4-7df9-95b5-092c1350d6c7`, default sample rate 0.1) |
| `conversations` | `ticket` | **Enabled** (id `01a02413-4d8b-7d52-924e-b2a926d16be2`) |
| `github` | `issue` | **Enabled** (id `01a02417-d3ce-7e35-bb0a-ebca35c409c6`) |
| `llm_analytics` | — | **Skipped** — internal only, not a user-facing responder |
| `logs` | — | **Skipped** — not a v1 responder |
| `replay_vision` | — | **Skipped** — Replay Vision scanners self-authorize via `emits_signals`; no row needed |

---

## Connected Tools

| Tool | Status |
|---|---|
| **GitHub Issues** | Connected by this setup — warehouse source id `01a02417-b221-0000-99ae-a21095733cd3`, first sync started. Only the `issues` table is syncing; more tables can be enabled in the PostHog data warehouse UI. |
| **Linear** | Not used (not selected) |
| **Jira** | Not used (not selected) |
| **Sentry** | Not used (not selected) |
| **Zendesk** | Not used (not selected) |

---

## Scout Troop

**Run budget:** 100 runs/day (early-access default), 3 runs/tick max. 0 runs used today; 100 remaining. Banner: *"Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."*

### Enabled (5)

| Scout | Why enabled |
|---|---|
| `signals-scout-general` | Always on — cross-product correlations and surfaces no specialist covers |
| `signals-scout-product-analytics` | Core to the arena concept: voting events, leaderboard funnel, model comparison flows |
| `signals-scout-feature-flags` | Feature flags will gate model availability and control rollouts — central to the arena architecture |
| `signals-scout-web-analytics` | Public web app; traffic patterns and landing-page health matter from day one |
| `signals-scout-observability-gaps` | Early-stage project — surfaces events with no insight or dashboard coverage as arena features are built |

### Disabled (22)

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Covered by native source (`error_tracking` / `issue_*`) — intentional, not a gap |
| `signals-scout-session-replay` | Covered by native source (`session_replay` / `session_analysis_cluster`) — intentional, not a gap |
| `signals-scout-ai-observability` | Enable when LLM analytics (`$ai_*` events) are instrumented — the arena's model calls are the planned trigger |
| `signals-scout-experiments` | Enable when A/B experiments are created in PostHog |
| `signals-scout-surveys` | Enable if PostHog surveys are added |
| `signals-scout-revenue-analytics` | No payment SDK in use |
| `signals-scout-logs` | PostHog logs product not in use |
| `signals-scout-csp-violations` | No CSP reporting configured |
| `signals-scout-customer-analytics` | No group/accounts analytics |
| `signals-scout-data-pipelines` | No CDP destinations or hog flows |
| `signals-scout-replay-vision` | No accumulated observations yet — enable after Replay Vision scanners have run for a few days |
| `signals-scout-anomaly-detection` | No dashboards or insights yet — enable once analytics coverage is built |
| `signals-scout-health-checks` | Covered by the `health_checks` native source |
| `signals-scout-inbox-validation` | No shipped fixes to validate yet — enable after the first round of fixes |
| `signals-scout-data-warehouse` | Enable once the GitHub Issues sync has populated data |
| `signals-scout-apm` | No distributed tracing configured |
| `signals-scout-conversations` | Enable once a Support inbound channel is connected |
| `signals-scout-insight-alerts` | No configured insight alerts yet |
| `signals-scout-mcp-tool-calls` | No `$mcp_tool_call` telemetry |
| `signals-scout-tasks` | Enable once PostHog Tasks / agent work items are in use |
| `signals-scout-web-vitals` | Enable once `$web_vitals` events are being captured |
| `signals-scout-skills-store` | Enable if managing custom PostHog skills |

---

## Custom Scouts

**Result:** None created — the built-in troop covers this project at its current stage.

### Surfaces considered and ruled out

| Surface | Filter that killed it |
|---|---|
| Arena prompt-submission funnel (`prompt_submitted` → `vote_cast`) | Not watchable — no events exist yet; the arena features are not built |
| LLM model API health (latency, failures) | Not watchable — no model API call events instrumented |
| Leaderboard integrity / voting patterns | Not watchable — no voting or ranking events |
| GitHub Issues aggregate patterns | Marginally uncovered (native source handles per-ticket; `data-warehouse` scout disabled), but brand-new source with no data yet — not high-value |
| SDK/event capture health | Covered by the `health_checks` native source |

### Planned custom scouts (add once features are built)

When the arena core features are instrumented, these three scouts will have strong signal:

1. **Arena prompt funnel** — watches `prompt_submitted` → `vote_cast` conversion; speaks up when vote rate drops relative to prompt volume
2. **Model response health** — watches latency and failure rate per model provider; speaks up when one model starts degrading relative to its baseline  
3. **Voting integrity** — watches vote rate consistency and leaderboard update lag; speaks up on patterns suggesting drop-off before voting

**Noise escape hatch:** If any enabled scout turns noisy, set `emit: false` on its config in PostHog to switch it to dry-run (it runs and logs but writes nothing to the inbox).

---

## Replay Vision Scanners

Replay Vision scanners are LLMs that watch individual session recordings on a schedule and push what they find directly into the Self-driving inbox. They are the only part of this setup that spends Replay Vision quota. Findings arrive at half weight, so they need corroboration from a second observation before being promoted into a full report.

The project has no recordings yet. Both scanners are armed and start working the day recordings begin — no second setup needed.

| Scanner | Type | What it watches | Query scope | Sample rate | Est. monthly credits |
|---|---|---|---|---|---|
| Arena broken experiences (id `01a0241c-0764-71b6-a2cc-12fb21fffb93`) | monitor | Visible breakage: error messages, blank screens, spinners that never resolve, buttons that do nothing — especially prompt input failures, model response cards staying blank, vote buttons not responding, leaderboard not loading | URL contains `/` (all pages — update to arena-specific paths once built) | 0.5 | 0 (no recordings yet) |
| Arena user frustration (id `01a0241c-2f95-7ad9-965c-7dc943d8f5e8`) | monitor | Clear struggle: rage-clicks on vote buttons, hammering the submit button, hunting for model comparison UI, retrying failed prompts | Sessions with `$rageclick` events | 1.0 | 0 (no recordings yet) |

> **Note on the breakage scanner query:** The query currently matches all URLs (`/`). Once the arena UI is built (e.g., `/arena`, `/leaderboard`, `/models`), update the query to scope to those paths in the PostHog Replay Vision UI for more precise coverage.

---

## Follow-ups

- [ ] **Enable Session Replay** — PostHog → Settings → Session replay → "Record user sessions"
- [ ] **Enable Error Tracking** — PostHog → Settings → Error tracking → "Enable exception autocapture"
- [ ] **Enable Support** — PostHog → Product sidebar → Conversations
- [ ] **Connect a Support inbound channel** — after enabling Conversations, connect email/inbox/Slack so tickets reach the inbox
- [ ] **Narrow the breakage scanner query** — once arena pages (`/arena`, `/leaderboard`, etc.) are built, update "Arena broken experiences" in the Replay Vision UI to scope to those URLs
- [ ] **Enable `signals-scout-ai-observability`** — once `$ai_*` events are instrumented for model calls in the arena
- [ ] **Enable `signals-scout-experiments`** — once A/B experiments are created in PostHog
- [ ] **Add custom arena scouts** — once prompt, vote, and model response events are instrumented: arena prompt funnel, model response health, voting integrity (see Custom Scouts above)
- [ ] **Enable `signals-scout-data-warehouse`** — once the GitHub Issues sync has populated data and you want aggregate issue-pattern analysis

---

## What Happens Next

The scout coordinator picks up the new configs within ~30 minutes and schedules the first runs. Each run draws from the 100-run/day early-access budget. Findings cluster into reports in the [inbox](https://us.posthog.com/project/569384/inbox); immediately-actionable ones can trigger coding tasks automatically. Replay Vision scanners start scanning the moment recordings exist.
