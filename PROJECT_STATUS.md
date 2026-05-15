# Project Status

## Current State: Locked Stable Production Baseline + Phase 1A Implemented

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
* production Supabase SQL apply for the Phase 1A schema update completed successfully
* `supabase-setup.sql` is now rerun-safe with `DROP POLICY IF EXISTS` before every `CREATE POLICY`
* Phase 1B Edge Function deploy completed after commit `c3a7ecd`
* server automation recovery verified with browser closed via production GitHub Actions -> Supabase Edge Function publish
* production due-post query now has live diagnostics and production-safe timestamp evaluation
* Facebook image publish path now targets attached photo publishing instead of visible link-card fallback when `image_url` exists
* GitHub Actions `workflow_dispatch` remains available as a manual scheduler fallback/debug tool
* production cron triggering is now locked to an external cron provider instead of GitHub `event=schedule`
* Phase 2A operator UI simplification shipped with denser queue scanning, calmer logs styling, and collapsed advanced diagnostics
* Phase 2B content factory workflow upgrade shipped with quick schedule presets, draft duplication/reuse, queue filters, queue summary counts, and fast reschedule actions
* Phase 2B.1 targeted operator UI fixes shipped with a cleaned quick-schedule layout, content-derived image prompt generation, compact Status controls, delete-with-confirm queue cleanup, and modal scheduling
* Phase 1A additive Facebook Content Stock OS is now implemented with stock dashboard counts, batch review draft generation, approval-gated scheduling, and page memory foundation fields
* current active work is Phase 1A stabilization, QA, and small production-safe fixes only
* Clip OS remains future planning only and is not active implementation work

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

* reduce phase count as much as safely possible
* each Codex task must choose exactly one model based on risk, not a mixed default
* production reliability, backend safety, scheduler logic, Supabase state, and approval-gated scheduling/publish workflow use `GPT-5.5 High`
* architecture planning and large safe refactors use High reasoning only when the task risk justifies it
* UI polish, small components, and operator UX use `GPT-5.4 Medium`
* docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`
* prompt intelligence, content quality, and cinematic generation use High when the task is genuinely quality-critical
* production-affecting work must continue past local verification through local implementation, `npm run build`, meaningful commit, GitHub push, Vercel production deployment verification, and live production behavior verification when possible
* production-affecting verification must include the real deployed website and production path, not local-only behavior
* safe deployment and configuration steps should be completed automatically whenever possible
* if a manual platform/auth step is required, document where to go, what to click/run, what success looks like, and what failure output to report back
* preserve stable systems: scheduler V1, publish flow, storage flow, Supabase architecture, Create flow, and provider routing
* Codex task reports must include changed files, exact change points, build result, commit/push result, production deploy result, production QA result, cleanup result, and final git status

Locked Model Selection Rules:

* choose exactly one model per task based on risk
* Production reliability, scheduler logic, Edge Function work, Supabase state work, and approval workflow safety work use `GPT-5.5 High`
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

The current direction is Phase 1A Facebook Content Stock OS stabilization after the successful production Supabase SQL apply.

## Phase 1A Stabilization

Goal:
Keep the additive Facebook Content Stock OS stable without changing the locked scheduler, publish processor, Facebook service, or Supabase core flow.

In scope:

* batch draft generation QA for 5 / 10 / 20 drafts
* review queue approval/edit/keep-draft/send-to-schedule QA
* approval-gated scheduling and publish safety verification
* stock dashboard count verification by status and page
* low-stock warning tuning
* local fallback behavior checks when Supabase data is incomplete
* small production-safe fixes only

Not allowed:

* scheduler redesign
* publish processor rewrite
* Facebook service rewrite
* Supabase core flow rewrite
* Clip OS implementation work

Success condition:
The additive Facebook Content Stock OS remains stable while the existing single create/save/schedule/status flow and publish lifecycle keep working.

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

## Phase 2 - Content Factory Workflow

Goal:
Efficient batch content creation and scheduling.

In scope:

* batch content workflow
* draft stock workflow
* reusable content structures
* save/schedule workflow optimization
* cinematic consistency workflow

Success condition:
Can stockpile and schedule 30-100 posts consistently.

Current Phase 2A checkpoint:

* Create flow now keeps primary operator actions visible while scrolling
* Status queue is denser and faster to scan on desktop
* posted items are collapsed by default to keep active queue items visible first
* logs page now uses neutral/cyan operational styling, with red reserved for actual failures
* advanced diagnostics are moving behind collapsible sections instead of staying always visible

Current Phase 2B checkpoint:

* Create flow now exposes one-click schedule presets that reuse the existing save + schedule handlers
* Status now supports compact filters for `All`, `Draft`, `Scheduled`, `Posted`, and `Failed`
* operators now get lightweight queue summary counts for drafts, scheduled items, posted today, and failed items
* draft and posted content can be duplicated into a new reusable draft without overwriting the original
* scheduled items now have fast reschedule actions for `+1 Hour`, `+1 Day`, and `Next Prime Time`

Current Phase 2B.1 checkpoint:

* Create quick-schedule presets are now laid out in a cleaner two-row operator block
* image prompt generation now derives from the current topic/caption context instead of returning canned template text
* Status keeps operator summary and filters compact without pinning them while scrolling the queue
* active queue cards now use delete-with-confirm instead of duplicate, without changing publish or scheduler behavior
* schedule editing now opens in a modal instead of expanding inline
* AI Library navigation is hidden until a functional persistence-backed version exists

Current Phase 1A checkpoint:

* Status now doubles as a content stock dashboard with counts for `draft`, `review`, `approved`, `scheduled`, `posted`, and `failed`
* low-stock warnings now highlight pages where available stock (`approved + scheduled`) falls below a small threshold
* Create now supports additive batch draft generation for 5, 10, or 20 Facebook drafts at once
* batch-generated content is saved as separate review items without changing the stable publish processor or scheduler engine
* Review Queue now supports AI-assisted quality scoring, optional manual checklist guidance, approve, keep-as-draft, edit, and send-to-schedule actions
* scheduling and manual publish now require approval-gated drafts, while explicit Create quick-schedule still works by approving before scheduling
* page memory foundation now includes page purpose, target audience, writing tone, content pillars, avoid list, and default CTA in the existing page settings structure

## Phase 3 - Prompt Intelligence Layer

Goal:
Improve cinematic image consistency and reduce abstract prompt failures.

In scope:

* topic -> cinematic image prompt translation
* visual metaphor mapping
* narrative-aware image prompt generation
* cinematic image consistency refinement
* brand-aware prompt structure

Success condition:
Short topics reliably generate cinematic editorial visuals.

## Phase 4 - Brand Memory + Lightweight Analytics

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
