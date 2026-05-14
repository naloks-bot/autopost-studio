# Architecture

## Operating Principle

AutoPost Studio is now locked as an AI Editorial Operating System with a stable production baseline. The architecture must support cinematic editorial content operations while keeping system churn low and preserving the already-stable publish pipeline.

Core architecture priorities:

* stable publishing behavior
* stable scheduler V1 behavior
* stable Create flow behavior
* stable storage persistence
* low token usage
* minimal architecture churn
* rollback-friendly milestones

Brand/content direction:

* Vance Nexus AI cinematic editorial direction
* invisible systems narrative direction
* Thai-first cinematic editorial strategy
* global aesthetic with Thai emotional storytelling
* content consistency over redesign

---

# Locked System Boundary

Stable systems that must be preserved:

* publish flow
* scheduler V1
* Create flow
* storage layer
* storage flow
* Supabase architecture
* current provider routing architecture
* current production deployment path

Not part of the current architecture direction:

* scheduler rewrite
* queue rewrite
* backend rewrite
* auth/billing expansion
* mobile app expansion
* speculative provider framework expansion

---

# Architecture Layers

## 1. AI Generation Layer

Responsible for:

* text generation
* image prompt generation
* image generation
* provider routing
* runtime validation

Rule:
Extend the existing provider system only. Do not redesign provider architecture.

## 2. Editorial Workflow Layer

Responsible for:

* Create flow
* draft stock workflow
* save/reload/edit behavior
* batch content operations
* cinematic consistency workflow

Rule:
Preserve the current stable Create flow and optimize operator efficiency without unnecessary UI redesign.

Current operator UX boundary inside this layer:

* sticky operator actions are allowed if they do not change Create flow behavior
* desktop queue density can be improved without changing queue architecture
* posted/completed visibility can be collapsed by default to prioritize active work
* advanced runtime diagnostics should be hidden behind explicit operator intent when possible
* quick schedule presets, duplicate/reuse actions, queue filters, and fast reschedule controls are allowed when they only orchestrate the existing draft/save/schedule handlers
* targeted operator UI cleanup may replace queue-card actions, schedule presentation, and non-functional navigation when backend behavior stays unchanged
* additive approval workflow, review checklist UI, stock counts, and batch draft generation are allowed when they reuse the stable draft/save/schedule/publish path

## 3. Publishing + Automation Layer

Responsible for:

* manual publish
* scheduled publish
* failed publish handling
* duplicate prevention
* cron trigger + Edge Function execution reliability

Rule:
Reliability hardening is allowed. Redesign is not.

Current reliability boundary inside this layer:

* Supabase DB is the authoritative publish state
* manual and scheduled publish both claim `publishing` before Facebook API execution
* successful publish finalization clears `scheduled_at`, persists `facebook_post_id`, and re-reads DB truth
* failed publishes transition to `failed` instead of silently remaining in queue
* scheduler observability must log execution truth, not optimistic intent
* image posts must publish as attached Facebook photos, while text-only posts continue to publish through the stable feed path
* production cron delivery comes from an external cron provider hitting the stable Supabase Edge Function endpoint with `x-cron-secret`
* GitHub Actions is retained only for manual `workflow_dispatch` fallback/debug execution and is not the production scheduler trigger

## 4. Storage + Persistence Layer

Responsible for:

* Supabase draft persistence
* settings persistence
* generated image persistence
* public HTTPS image URL safety

Rule:
Preserve the current stable Supabase/storage architecture.

---

# Development Strategy

Permanent workflow rules:

1. Minimize token usage.
2. Use the fewest phases possible to reduce tokens and time.
3. Prefer large safe batches.
4. Avoid rewrites and architecture churn.
5. Avoid speculative systems.
6. Preserve rollback safety.
7. Commit only meaningful checkpoints.
8. Update docs only after meaningful milestones.
9. Keep Codex instructions concise, specific, and outcome-based.
10. Every Codex task must clearly state what to change, what not to touch, expected result, required verification, and what summary to report back.
11. Check the actual production root cause before attempting another fix for the same issue.

Operational workflow rules:

1. Production reliability, backend safety, scheduler logic, and state synchronization default to High reasoning.
2. Architecture planning and large safe refactors use High reasoning.
3. UI polish, small components, and styling default to Medium.
4. Docs and cleanup default to Low or Medium.
5. Prompt intelligence and cinematic content quality default to High.
6. Production-affecting work must continue through local implementation, `npm run build`, meaningful checkpoint commit, GitHub push, Vercel production deployment verification, and live production behavior verification when possible.
7. Codex must connect changes to the real deployed website and production path, not local-only behavior.
8. Safe deployment/configuration steps should be completed automatically whenever possible.
9. If a manual platform step is required, provide exact navigation, actions, expected success result, and failure details to report back.

Locked model selection rules:

1. Production reliability, scheduler logic, Edge Function work, and Supabase state work use `GPT-5.4 High` or `GPT-5.5 High`.
2. UI, layout, and operator UX work use `GPT-5.4 Medium`.
3. Docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`.
4. Use `Extra High` only when High has already failed after 2 serious attempts or production data risk is high.

---

# Locked Roadmap

## Phase 1 — Automation Reliability Lock

Focus:

* scheduler QA
* overnight scheduling tests
* scheduled image publish QA
* duplicate prevention QA
* failed publish handling QA
* cron + Edge Function reliability verification

Architecture rule:
No scheduler redesign, queue redesign, or backend rewrite.

## Phase 2 — Content Factory Workflow

Focus:

* batch content workflow
* draft stock workflow
* reusable content structures
* save/schedule workflow optimization
* cinematic consistency workflow

Architecture rule:
Improve workflow efficiency using the current system boundary.

Phase 2A UI direction:

* simplify operator scanning
* reduce oversized cards and spacing
* keep primary actions visible
* treat logs as an operational timeline, not a permanent failure console
* hide diagnostics behind advanced disclosure instead of making them always-on

Phase 2B workflow direction:

* accelerate draft stockpiling with one-click schedule presets
* support draft/post reuse through safe draft duplication
* improve queue scanning with compact filters and summary counts
* allow fast reschedule adjustments without changing scheduler logic

Phase 2B.1 operator fix direction:

* keep Create and Status controls compact, sticky, and desktop-friendly
* image prompt generation should derive from the current post context before falling back
* non-functional UI surfaces should be hidden until they have real persistence behind them

Phase 1A content stock direction:

* add stock visibility before adding new automation
* treat `approved` as the safe state between draft review and scheduling
* keep scheduler ownership on `scheduled` only
* keep review metadata additive to the current post model
* prefer local-first page memory expansion over risky architecture changes

## Phase 3 — Prompt Intelligence Layer

Focus:

* topic → cinematic image prompt translation
* visual metaphor mapping
* narrative-aware prompt generation
* cinematic image consistency refinement
* brand-aware prompt structure

Architecture rule:
Refine prompt intelligence inside the existing AI layer. No provider rewrite.

## Phase 4 — Brand Memory + Lightweight Analytics

Focus:

* engagement tracking
* hook/topic performance tracking
* image performance tracking
* reusable winning pattern memory
* lightweight brand memory refinement

Architecture rule:
Keep analytics operational and lightweight. Avoid enterprise-style overengineering.

---

# Current Architecture Status

The stable production boundary now includes:

* Gemini generation working
* caption/imagePrompt separation
* upload-first image flow
* Supabase storage persistence
* public HTTPS image URLs
* save draft
* reload/edit draft
* mock publish
* real Facebook publish
* production deployment synchronization
* stale-state overwrite protection for manual and scheduled publish
* duplicate prevention claim lock for due scheduled posts
* execution-truth operation logging
* 5-minute production cron cadence for scheduler triggering via external cron
* migration-safe Supabase `posts` schema alignment for the full current publish lifecycle contract
* Phase 1B production Edge Function deployment
* browser-closed server automation path verification through the Edge Function and manual cron invocation
* production-safe due-post evaluation diagnostics
* attached-photo publish behavior for posts with `image_url`
* additive content stock workflow metadata for `hook`, `content_pillar`, `approved_at`, and manual quality checklist state

External cron setup contract:

* provider: `cron-job.org`
* endpoint: `https://qydjsobtspoykhzcckht.supabase.co/functions/v1/process-scheduled-posts`
* method: `POST`
* cadence: every 5 minutes
* auth header: `x-cron-secret: <CRON_SECRET>`
* success response: HTTP `200` with either `No due posts` or `Processing complete`

Future work should build on this boundary, not reopen it without a proven blocker.
