# TODO

## Current Status

AutoPost Studio now has a frozen Content Stock OS production baseline that is usable for real Facebook content work.

Completed and locked:

* Phase 1 image storage leak protection shipped: safe unpublished draft/post delete now attempts Supabase Storage image cleanup without blocking delete UX
* published post images are retained by delete safety guards
* Review Queue / queue card images now use lazy loading to reduce avoidable image egress
* publish flow stable
* scheduler V1 stable
* Create flow stable
* storage layer stable
* Supabase architecture stable
* real publish stabilization complete
* production deployment sync verified
* cinematic editorial direction locked
* compact Review Queue cards shipped
* Review Detail Modal shipped with desktop two-column layout
* Review Detail Modal now supports inline hook/caption editing, clearer full-image preview, and image replacement from the modal
* image prompt is visible and copyable from the modal
* Manage Pages UX cleanup shipped with Core Brief + Advanced Brief layout
* page brief fields now have explicit labels/helper text, plus post length and example-style guidance
* Logs compact one-line summary UI shipped with expandable detail
* AI/manual checklist confusion removed from the primary review workflow
* post-now action restored
* approval undo added for safe approved posts
* batch 5 / 10 / 20 generation now produces more meaningfully different drafts
* batch generation is more quota-friendly and avoids rapid parallel Gemini spam
* Gemini 429 / rate-limit now has clearer Thai messaging
* manual `โพสต์` works for approved posts
* manual publish claim now safely supports `approved -> publishing`
* unapproved posts cannot publish
* scheduled / publishing / posted posts cannot publish again
* duplicate prevention is preserved
* scheduled live publish works through `cron-job.org -> Supabase Edge Function`
* app state now refreshes from Supabase truth without waiting for manual browser refresh in the normal workflow
* repeated `post_due` / `publish_skipped` noise for already-posted items was fixed
* live Facebook publish runtime config trace/fix shipped
* active page settings are now the publish-path source of truth for page-specific `page_id` and page token
* sanitized publish diagnostics were added for manual and scheduled live attempts
* scheduler/claim/finalize and mock-live safety were preserved
* Mock / Live safety preserved
* stable publish/scheduler/Supabase systems preserved during Manage Pages and Logs cleanup

Current development direction:

* AI Editorial Operating System
* Thai-first cinematic editorial strategy
* invisible systems narrative direction
* global aesthetic + Thai emotional storytelling
* operational reliability and content workflow over architecture expansion
* next priority is producing real content stock for Vance Nexus AI
* Clip OS remains future planning only

Production connection path:

* Vercel hosts the frontend
* Supabase stores posts, settings, logs, and images
* Supabase Edge Function `process-scheduled-posts` handles server-side scheduled publishing
* `cron-job.org` is the production scheduler trigger every 5 minutes
* GitHub Actions is retained only as manual fallback/debug, not as the production scheduler

---

# Permanent Rules

1. Minimize token usage.
2. Use the fewest phases possible to reduce tokens and time.
3. Preserve rollback safety.
4. Avoid rewrites.
5. Avoid architecture churn.
6. Avoid speculative systems.
7. Prefer large safe batches.
8. Commit only meaningful checkpoints.
9. Update docs only after meaningful milestones.
10. Keep Codex prompts concise but complete enough to solve complex issues in one pass.
11. Every Codex task must clearly state what to change, what not to touch, expected result, required verification, and what summary to report back.
12. Check the actual production root cause before attempting another fix for the same issue.

Operational workflow lock:

* reduce phase count as much as safely possible
* choose exactly one model per task based on risk
* production-affecting tasks do not stop at local verification only
* required path: implement locally -> run `npm run build` -> verify no critical errors -> commit meaningful checkpoint -> push to GitHub -> verify Vercel production deployment -> verify live production behavior when possible
* production-affecting verification must include the real deployed website and production path, not local-only behavior
* complete safe deployment/configuration steps automatically whenever possible
* if a manual/auth-required step blocks progress, provide exact manual instructions with where to go, what to click/run, expected success result, and the result/error to report back
* preserve stable systems: scheduler V1, publish flow, storage flow, Supabase architecture, Create flow, and provider routing
* future app changes should be bug/blocker only unless they directly save time or cost

Remaining future work for image egress/storage:

* thumbnail system
* cleanup scheduler / orphan scanner

Locked model selection rules:

* choose exactly one model per task based on risk
* production reliability, scheduler logic, Edge Function work, Supabase state work, and approval workflow safety work use `GPT-5.5 High`
* UI, layout, and operator UX work use `GPT-5.4 Medium`
* docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`
* use a stronger model when state, publish, or safety risk justifies it

---

# Current Next Focus

Goal:
Produce real content stock for Vance Nexus AI using the current frozen baseline.

Immediate next work:

* create real broad-topic content batches where batch mode is helpful
* use single-draft Create flow for normal everyday production
* review, approve, schedule, and publish real content through the current production workflow
* confirm content quality and operator speed during real use

Not the next focus:

* Clip OS
* video features
* app redesign
* speculative feature expansion
* architecture change without a proven blocker

---

# Deferred / Removed

* SaaS expansion
* auth/billing
* mobile app
* queue redesign
* backend rewrite
* advanced analytics expansion
* speculative provider frameworks
* Clip OS implementation
* video feature implementation
