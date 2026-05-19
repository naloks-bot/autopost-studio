# Architecture

## Operating Principle

AutoPost Studio is now locked as a stable production baseline for real Facebook content work. The architecture should preserve the current Content Stock OS workflow, keep publish safety intact, and avoid reopening systems that are already usable in production.

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
* Clip OS implementation
* video feature implementation

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

Current content-generation baseline:

* normal workflow remains single-draft creation
* batch generation for 5 / 10 / 20 drafts is intended for broad topics and article-series style content
* batch generation now creates meaningfully different drafts more safely
* Gemini usage should remain quota-friendly and should not spam rapid parallel requests
* Gemini 429 / rate-limit messaging should remain clear in Thai

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

* compact Review Queue cards are the baseline for high-volume scanning
* Review Detail Modal uses a desktop two-column layout and stacked mobile layout
* Review Detail Modal now supports inline hook/caption editing, clearer full-image preview, and in-modal image replacement while reusing existing draft save and storage flows
* image prompt is visible and copyable from the modal
* Manage Pages now separates page brief editing into Core Brief and Advanced Brief sections without changing storage architecture
* page brief fields now use explicit labels/helper text, with post length and example-style guidance stored in the existing page settings structure
* Logs now render compact one-line summary rows with expandable detail while preserving the existing logging pipeline
* AI/manual checklist confusion should remain removed from the primary review workflow
* post-now action is available only through the existing safe publish path
* approval undo is allowed only for safe approved posts that are not yet scheduled, publishing, or posted
* quick schedule presets, queue filters, fast reschedule controls, and review actions must continue to orchestrate existing handlers rather than creating new workflow logic

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
* manual publish now safely claims `approved -> publishing`
* scheduled publish claims `scheduled -> publishing`
* successful publish finalization clears `scheduled_at`, persists `facebook_post_id`, and re-reads DB truth
* failed publishes transition to `failed` instead of silently remaining in queue
* scheduled, publishing, and posted rows must not be manually published again
* unapproved rows must not publish
* duplicate prevention claim locking remains required for both manual and scheduled paths
* app state now refreshes from Supabase truth instead of relying on stale browser state
* repeated `post_due` / `publish_skipped` noise for already-posted items should remain suppressed
* scheduler observability must log execution truth, not optimistic intent
* active page settings are the source of truth for page-specific Facebook `page_id` and page access token routing
* live Facebook publish validates the page token target before the final Graph request and records sanitized diagnostics only
* image posts must publish as attached Facebook photos, while text-only posts continue to publish through the stable feed path
* production cron delivery comes from `cron-job.org` hitting the stable Supabase Edge Function endpoint with `x-cron-secret`
* GitHub Actions is retained only for manual `workflow_dispatch` fallback/debug execution and is not the production scheduler trigger
* Mock / Live safety must remain unchanged

## 4. Storage + Persistence Layer

Responsible for:

* Supabase draft persistence
* settings persistence
* operation log persistence
* generated image persistence
* public HTTPS image URL safety

Rule:
Preserve the current stable Supabase/storage architecture.

Current storage safety rule:

* `supabase-setup.sql` must remain rerun-safe in Supabase SQL Editor with `DROP POLICY IF EXISTS` immediately before each `CREATE POLICY`
* additive Content Stock OS metadata such as `hook`, `content_pillar`, `approved_at`, and `quality_checklist` remains part of the safe schema contract
* Phase 1 storage leak protection keeps a pre-delete post snapshot and uses `image_storage_path` as the primary cleanup target when deleting safe unpublished drafts/posts
* thumbnail metadata now uses `thumbnail_url` and `thumbnail_storage_path`, with queue/list rendering preferring thumbnails while modal/full preview continues to use `image_url`
* if `image_storage_path` or `thumbnail_storage_path` is missing, cleanup may only parse the same-project public URL prefix for `generated-images`; published/scheduled/publishing posts remain excluded from cleanup
* draft cleanup now prefers a dedicated Supabase Edge Function with service-role delete and server-side status/path validation
* draft cleanup now removes both full image objects and thumbnail objects when safe unpublished posts are deleted
* direct anon `storage.objects` delete access for `generated-images` stays removed; cleanup runs through the Edge Function path
* orphan cleanup remains future work

---

# Production Path

Current production connection path:

* Vercel hosts the frontend
* Supabase stores posts, settings, logs, and images
* Supabase Edge Function `process-scheduled-posts` handles server-side scheduled publishing
* `cron-job.org` triggers the Edge Function every 5 minutes in production
* GitHub Actions is retained only as a manual fallback/debug tool

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
9. Keep Codex prompts concise but complete enough to solve complex issues in one pass.
10. Every Codex task must clearly state what to change, what not to touch, expected result, required verification, and what summary to report back.
11. Check the actual production root cause before attempting another fix for the same issue.

Operational workflow rules:

1. Choose exactly one model per task based on risk.
2. Production reliability, backend safety, scheduler logic, Supabase state, and approval-gated scheduling/publish workflow use `GPT-5.5 High`.
3. UI polish, small components, and operator UX use `GPT-5.4 Medium`.
4. Docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`.
5. Use a stronger model when state, publish, or safety risk justifies it.
6. Production-affecting work must continue through local implementation, `npm run build`, meaningful checkpoint commit, GitHub push, Vercel production deployment verification, and live production behavior verification when possible.
7. Production-affecting verification must include the real deployed website and production path, not local-only behavior.
8. Safe deployment/configuration steps should be completed automatically whenever possible.
9. If a manual platform step is required, provide exact navigation, actions, expected success result, and failure details to report back.
10. Codex task reports must include changed files, exact change points, build result, commit/push result, production deploy result, production QA result, cleanup result, and final git status.

---

# Locked Roadmap

## Current Next Focus

The next priority is not app expansion. The next priority is producing real content stock for Vance Nexus AI using the current frozen baseline.

Allowed changes from here:

* bug fixes
* blocker fixes
* fixes that directly save time or cost in real content work

Not allowed from here without a proven production need:

* Clip OS work
* video workflow expansion
* speculative feature expansion
* architecture reopening

## Future Layers, Deferred

These remain future planning only and are not active implementation work:

* Prompt Intelligence Layer refinement
* Brand Memory + Lightweight Analytics
* Clip OS
* video features

---

# Current Architecture Status

The stable production boundary now includes:

* single-draft Create flow
* batch 5 / 10 / 20 content generation with safer diversity
* compact Review Queue workflow
* Phase 1 image storage leak protection for safe unpublished delete paths, plus lazy-loaded queue/card images to reduce avoidable storage egress
* Review Detail Modal with image prompt access and copy
* approval-gated review, schedule, and publish flow
* manual `โพสต์` for approved posts
* scheduled live publish through `cron-job.org -> Supabase Edge Function`
* duplicate-prevention claim locking
* execution-truth operation logging
* sanitized live Facebook publish diagnostics for page/token/endpoint/image routing without raw token exposure
* app-state refresh from Supabase truth without requiring manual browser refresh for normal publish/schedule sync
* attached-photo publish behavior for posts with `image_url`
* additive content stock workflow metadata for `hook`, `content_pillar`, `approved_at`, and `quality_checklist`
* stable publish flow, scheduler V1, Supabase/storage architecture, and provider routing remain unchanged by Manage Pages and Logs UX cleanup

Future work should build on this boundary, not reopen it without a proven blocker.
