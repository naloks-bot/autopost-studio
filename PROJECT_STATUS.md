# Project Status

## Current State: Locked Stable Production Baseline

AutoPost Studio is now locked as an AI Editorial Operating System focused on cinematic editorial AI content workflow, AI-assisted narrative generation, scalable content stock operations, automated publishing, and brand-consistent AI media generation.

Current brand/product direction:

* Vance Nexus AI cinematic editorial direction
* invisible systems narrative direction
* Thai-first cinematic editorial strategy
* global aesthetic with Thai emotional storytelling
* content consistency prioritized over redesign

Current stable systems now locked:

* publish flow stable
* scheduler V1 stable
* Create flow stable
* storage layer stable
* Supabase architecture stable
* real publish stabilization complete
* production deployment sync verified
* cinematic editorial brand direction locked

Recent stable checkpoints:

* Create flow runtime wiring fixed and QA-passed
* local Gemini env aligned to `gemini-2.5-flash`
* preview receives caption only
* image prompt flows into Image Studio prompt
* upload-first image flow works
* Supabase storage persistence stabilized
* real Facebook publish works with public HTTPS image URLs
* publish lifecycle now hardens `draft/scheduled -> publishing -> posted/failed`
* manual and scheduled publish now finalize from DB truth instead of stale local state
* duplicate prevention now claims due posts before publish
* execution logs now reflect actual publish completion/failure states
* production scheduler cadence is now aligned for near-time posting every 5 minutes
* Supabase setup script now aligns the full current `posts` schema contract for production recovery
* Phase 1B Edge Function deploy completed after commit `c3a7ecd`
* server automation recovery verified with browser closed via production GitHub Actions -> Supabase Edge Function publish
* production due-post query now has live diagnostics and production-safe timestamp evaluation
* Facebook image publish path now targets attached photo publishing instead of visible link-card fallback when `image_url` exists
* GitHub Actions `workflow_dispatch` remains available as a manual scheduler fallback/debug tool
* production cron triggering is now locked to an external cron provider instead of GitHub `event=schedule`
* Phase 2A operator UI simplification is now in progress with sticky actions, denser queue scanning, calmer logs styling, and collapsed advanced diagnostics

Permanent operating rules:

* minimize token usage
* use the fewest phases possible to reduce tokens and time
* minimize phase fragmentation
* preserve rollback safety
* avoid rewrites
* avoid architecture churn
* avoid speculative systems
* prefer large safe batches
* commit only meaningful checkpoints
* update docs only after meaningful milestones
* keep Codex instructions concise, specific, and outcome-based
* every Codex task must clearly state what to change, what not to touch, expected result, required verification, and what summary to report back
* avoid repeated fixes to the same issue by checking the actual production root cause first

Operational lock:

* production reliability, backend safety, scheduler logic, and state synchronization use High reasoning by default
* architecture planning and large safe refactors use High reasoning
* UI polish, small components, and styling use Medium
* docs and cleanup use Low or Medium
* prompt intelligence, content quality, and cinematic generation use High
* production-affecting work must continue past local verification through local implementation, `npm run build`, meaningful commit, GitHub push, Vercel production deployment verification, and live production behavior verification when possible
* Codex must connect changes to the real deployed website and production path, not local-only behavior
* safe deployment and configuration steps should be completed automatically whenever possible
* if a manual platform/auth step is required, document where to go, what to click/run, what success looks like, and what failure output to report back
* preserve stable systems: scheduler V1, publish flow, storage flow, Supabase architecture, Create flow, and provider routing

Locked Model Selection Rules:

* Production reliability, scheduler logic, Edge Function work, and Supabase state work use `GPT-5.4 High` or `GPT-5.5 High`
* UI, layout, and operator UX work use `GPT-5.4 Medium`
* docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`
* `Extra High` is reserved for cases where High has already failed after 2 serious attempts or production data risk is high

Removed or deferred:

* SaaS expansion
* auth/billing
* mobile app
* queue redesign
* backend rewrite
* advanced analytics expansion
* speculative provider frameworks

---

# Current Focus

The current direction has shifted from architecture expansion to operational reliability and content workflow efficiency.

## Phase 1 — Automation Reliability Lock

Goal:
Production-safe scheduling reliability.

In scope:

* scheduler QA
* overnight scheduling tests
* scheduled image publish QA
* duplicate prevention QA
* failed publish handling QA
* cron + Edge Function reliability verification

Not allowed:

* scheduler redesign
* queue redesign
* backend rewrite

Success condition:
System can reliably auto-post with the app/browser/computer closed.

Current Phase 1 checkpoint:

* scheduling bridge complete
* operation log persistence path present
* publish mode persistence hardened
* final reliability hardening applied for claim locking, atomic finalization, DB-truth refresh, and execution-truth logging
* production schema alignment now covers every current `posts` column used by save, fetch, schedule, claim, finalize, and status flows
* Phase 1B deployed to production
* browser-closed server automation path is verified through the Supabase Edge Function and manual cron invocation
* GitHub scheduled Actions are retired from the production trigger role due to unreliable schedule delivery on this repo
* production trigger ownership now moves to an external cron service using the same Edge Function and `x-cron-secret` auth
* remaining Phase 1 work should stay focused on QA and observability, not scheduler redesign

Production external cron setup:

* Provider: `cron-job.org`
* URL: `https://qydjsobtspoykhzcckht.supabase.co/functions/v1/process-scheduled-posts`
* Method: `POST`
* Interval: every 5 minutes
* Required header: `x-cron-secret: <CRON_SECRET>`
* Optional header: `Content-Type: application/json`
* Expected success response: HTTP `200` with either `{"message":"No due posts","count":0,...}` or `{"message":"Processing complete","count":<n>,...}`
* Recommended health check: enable cron-job.org run notifications/history and periodically confirm recent HTTP `200` responses plus matching Supabase post state transitions

## Phase 2 — Content Factory Workflow

Goal:
Efficient batch content creation and scheduling.

In scope:

* batch content workflow
* draft stock workflow
* reusable content structures
* save/schedule workflow optimization
* cinematic consistency workflow

Success condition:
Can stockpile and schedule 30–100 posts consistently.

Current Phase 2A checkpoint:

* Create flow now keeps primary operator actions visible while scrolling
* Status queue is denser and faster to scan on desktop
* posted items are collapsed by default to keep active queue items visible first
* logs page now uses neutral/cyan operational styling, with red reserved for actual failures
* advanced diagnostics are moving behind collapsible sections instead of staying always visible

## Phase 3 — Prompt Intelligence Layer

Goal:
Improve cinematic image consistency and reduce abstract prompt failures.

In scope:

* topic → cinematic image prompt translation
* visual metaphor mapping
* narrative-aware image prompt generation
* cinematic image consistency refinement
* brand-aware prompt structure

Success condition:
Short topics reliably generate cinematic editorial visuals.

## Phase 4 — Brand Memory + Lightweight Analytics

Goal:
Long-term optimization and AI-assisted content refinement.

In scope:

* engagement tracking
* hook/topic performance tracking
* image performance tracking
* reusable winning pattern memory
* lightweight brand memory refinement

Success condition:
System can learn and reinforce high-performing content patterns.

---

# Guardrails

1. Preserve stable publish flow.
2. Preserve scheduler V1 behavior unless a reliability blocker is proven.
3. Preserve current backend/Supabase architecture.
4. Extend existing systems only.
5. Avoid speculative expansion until reliability and workflow milestones are complete.
