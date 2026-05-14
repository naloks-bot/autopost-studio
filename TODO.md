# TODO

## Current Status

AutoPost Studio now has a locked stable production baseline.

Completed and locked:

* publish flow stable
* scheduler V1 stable
* Create flow stable
* storage layer stable
* Supabase architecture stable
* real publish stabilization complete
* production deployment sync verified
* cinematic editorial direction locked

Current development direction:

* AI Editorial Operating System
* Thai-first cinematic editorial strategy
* invisible systems narrative direction
* global aesthetic + Thai emotional storytelling
* operational reliability and content workflow over architecture expansion

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
10. Keep Codex instructions concise, specific, and outcome-based.
11. Every Codex task must clearly state what to change, what not to touch, expected result, required verification, and what summary to report back.
12. Check the actual production root cause before attempting another fix for the same issue.

Operational workflow lock:

* production-affecting tasks do not stop at local verification only
* required path: implement locally -> run `npm run build` -> verify no critical errors -> commit meaningful checkpoint -> push to GitHub -> verify Vercel production deployment -> verify live production behavior when possible
* connect every production-affecting change to the real deployed website and production path, not local-only behavior
* complete safe deployment/configuration steps automatically whenever possible
* if a manual/auth-required step blocks progress, provide exact manual instructions with where to go, what to click/run, expected success result, and the result/error to report back
* preserve stable systems: scheduler V1, publish flow, storage flow, Supabase architecture, Create flow, and provider routing

Locked Model Selection Rules:

* Production reliability, scheduler logic, Edge Function work, and Supabase state work use `GPT-5.4 High` or `GPT-5.5 High`
* UI, layout, and operator UX work use `GPT-5.4 Medium`
* docs and cleanup use `GPT-5.4 Low` or `GPT-5.4 Medium`
* `Extra High` is used only if High fails after 2 serious attempts or production data risk is high

---

# Locked Roadmap

## Phase 1 — Automation Reliability Lock

Goal:
Production-safe scheduling reliability.

TODO:

* scheduler QA
* overnight scheduling tests
* scheduled image publish QA
* duplicate prevention QA
* failed publish handling QA
* cron + Edge Function reliability verification

Current checkpoint:

* final reliability hardening batch is now in code
* migration-safe `posts` schema alignment is now included in `supabase-setup.sql` for production recovery
* Phase 1B Edge Function deploy is complete in production
* browser-closed server automation path is verified through the Edge Function and manual cron invocation
* image publish path is now locked to attached Facebook photo publishing when `image_url` exists
* GitHub Actions scheduled cron is retired from production use; `workflow_dispatch` remains as manual fallback/debug only
* production automation should now be triggered by external cron calling the same Edge Function with `x-cron-secret`
* remaining Phase 1 work should focus on external cron production confirmation and overnight QA, not architecture changes

Not allowed:

* scheduler redesign
* queue redesign
* backend rewrite

Success condition:
System can reliably auto-post with the app/browser/computer closed.

External cron setup to apply:

* Provider: `cron-job.org`
* URL: `https://qydjsobtspoykhzcckht.supabase.co/functions/v1/process-scheduled-posts`
* Method: `POST`
* Interval: every 5 minutes
* Required header: `x-cron-secret: <CRON_SECRET>`
* Optional header: `Content-Type: application/json`
* Expected success response: HTTP `200`

Recommended visibility:

* keep cron-job.org execution history enabled
* spot-check Supabase post rows for `scheduled -> posted` transitions and cleared `scheduled_at`

## Phase 2 — Content Factory Workflow

Goal:
Efficient batch content creation and scheduling.

TODO:

* batch content workflow
* draft stock workflow
* reusable content structures
* save/schedule workflow optimization
* cinematic consistency workflow

Phase 2A checkpoint:

* sticky Create actions implemented for faster operator access
* queue density improved for faster desktop scanning
* posted items collapsed by default
* logs styling softened to operational cyan/neutral tone
* advanced diagnostics moved behind collapsible sections

Important:
Focus on operator efficiency and low token usage. Avoid unnecessary UI redesign.

Success condition:
Can stockpile and schedule 30–100 posts consistently.

## Phase 3 — Prompt Intelligence Layer

Goal:
Improve cinematic image consistency and reduce abstract prompt failures.

TODO:

* topic → cinematic image prompt translation
* visual metaphor mapping
* narrative-aware image prompt generation
* cinematic image consistency refinement
* brand-aware prompt structure

Important:
Extend existing systems only. Do not rewrite provider architecture.

Success condition:
Short topics reliably generate cinematic editorial visuals.

## Phase 4 — Brand Memory + Lightweight Analytics

Goal:
Long-term optimization and AI-assisted content refinement.

TODO:

* engagement tracking
* hook/topic performance tracking
* image performance tracking
* reusable winning pattern memory
* lightweight brand memory refinement

Important:
Keep analytics lightweight and operational.

Success condition:
System can learn and reinforce high-performing content patterns.

---

# Deferred / Removed

* SaaS expansion
* auth/billing
* mobile app
* queue redesign
* backend rewrite
* advanced analytics expansion
* speculative provider frameworks
