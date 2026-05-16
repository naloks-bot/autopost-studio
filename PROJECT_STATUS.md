# Project Status

## Current State: Content Stock OS Production Baseline Frozen

AutoPost Studio is now frozen as a usable production baseline for real Facebook content operations. The current system is ready for real content work for Vance Nexus AI, with Content Stock OS workflow, approval-gated publish safety, and production scheduler routing in place.

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

Recent completed checkpoints:

* compact Review Queue cards shipped for faster scanning
* Review Detail Modal now uses a desktop two-column layout
* Review Detail Modal now supports inline hook/caption editing, clearer full-image preview, and in-modal image replacement
* image prompt is visible and copyable from Review Detail Modal
* Manage Pages UX cleanup shipped with Core Brief + Advanced Brief layout
* page brief fields now use visible labels/helper text, plus post length and example-style guidance
* Logs now show compact one-line summary rows with expandable details
* AI/manual checklist confusion was removed from Review Queue and modal emphasis
* post-now action was restored for approved posts
* approval undo was added for safe approved posts that are not yet scheduled/publishing/posted
* batch 5 / 10 / 20 generation now creates more meaningfully different drafts from broad topics
* batch generation is more quota-friendly and avoids rapid parallel Gemini spam
* Gemini 429 / rate-limit now shows clearer Thai messaging
* normal Create workflow remains single-draft-first, with batch intended for broad topics and article-series style content
* manual `โพสต์` now works for approved posts
* manual publish claim now supports `approved -> publishing` safely
* unapproved posts cannot publish
* scheduled / publishing / posted posts cannot publish again
* duplicate prevention remains preserved through publish claim locking
* scheduled live publish works through `cron-job.org -> Supabase Edge Function`
* app state now refreshes from Supabase truth instead of waiting for manual browser refresh
* repeated `post_due` / `publish_skipped` noise for already-posted items was fixed
* live Facebook publish runtime config trace/fix shipped for manual and scheduled publish paths
* active page settings are now the source of truth for page-specific `page_id` / page token routing in publish attempts
* sanitized Facebook publish diagnostics were added before live attempts without exposing raw tokens
* scheduler/claim/finalize and Mock / Live safety remain preserved
* Mock / Live safety remains preserved
* stable publish/scheduler/Supabase systems remain preserved during operator UX cleanup

Production connection path:

* Vercel hosts the frontend
* Supabase stores posts, settings, logs, and images
* Supabase Edge Function `process-scheduled-posts` handles server-side scheduled publishing
* `cron-job.org` is the production scheduler trigger every 5 minutes
* GitHub Actions is retained only as manual fallback/debug and is not the production scheduler

Freeze note:

* current baseline is now usable for real Facebook content production
* stop feature expansion temporarily
* do not start Clip OS / video features yet
* next priority is producing real content stock for Vance Nexus AI
* future app changes should be bug/blocker only unless they directly save time or cost

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
* keep Codex prompts concise but complete enough to solve complex issues in one pass
* every Codex task must clearly state what to change, what not to touch, expected result, required verification, and what summary to report back
* avoid repeated fixes to the same issue by checking the actual production root cause first

Operational lock:

* reduce phase count as much as safely possible
* each Codex task must choose exactly one model based on risk, not a mixed default
* production reliability, backend safety, scheduler logic, Supabase state, and approval-gated scheduling/publish workflow use `GPT-5.5 High`
* UI polish, small components, and operator UX use `GPT-5.4 Medium`
* docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`
* use a stronger model when state, publish, or safety risk justifies it
* production-affecting work must continue past local verification through local implementation, `npm run build`, meaningful commit, GitHub push, Vercel production deployment verification, and live production behavior verification when possible
* production-affecting verification must include the real deployed website and production path, not local-only behavior
* safe deployment and configuration steps should be completed automatically whenever possible
* if a manual platform/auth step is required, document where to go, what to click/run, what success looks like, and what failure output to report back
* preserve stable systems: scheduler V1, publish flow, storage flow, Supabase architecture, Create flow, and provider routing
* Codex task reports must include changed files, exact change points, build result, commit/push result, production deploy result, production QA result, cleanup result, and final git status

Locked model selection rules:

* choose exactly one model per task based on risk
* production reliability, scheduler logic, Edge Function work, Supabase state work, and approval workflow safety work use `GPT-5.5 High`
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
* Clip OS implementation work
* video feature implementation work

---

# Current Focus

The current direction is real content production on top of the frozen Content Stock OS baseline.

Current priority:

* produce real content stock for Vance Nexus AI
* use the current Create -> Review -> Approve -> Schedule / Publish workflow in production
* keep app changes limited to bug fixes, blockers, or direct time/cost savings

Not allowed right now:

* scheduler redesign
* publish processor rewrite
* Facebook service rewrite
* Supabase core flow rewrite
* Clip OS implementation work
* video workflow expansion
* speculative app expansion

Success condition:

* operators can create, review, approve, schedule, and publish real Facebook content reliably
* the app remains stable while real content stock is being produced

Production external cron setup:

* Provider: `cron-job.org`
* URL: `https://qydjsobtspoykhzcckht.supabase.co/functions/v1/process-scheduled-posts`
* Method: `POST`
* Interval: every 5 minutes
* Required header: `x-cron-secret: <CRON_SECRET>`
* Optional header: `Content-Type: application/json`
* Expected success response: HTTP `200` with either `{"message":"No due posts","count":0,...}` or `{"message":"Processing complete","count":<n>,...}`
* Recommended health check: enable cron-job.org run notifications/history and periodically confirm recent HTTP `200` responses plus matching Supabase post state transitions

---

# Guardrails

1. Preserve stable publish flow.
2. Preserve scheduler V1 behavior unless a reliability blocker is proven.
3. Preserve current backend/Supabase architecture.
4. Extend existing systems only.
5. Avoid speculative expansion until real content production needs prove a blocker.
