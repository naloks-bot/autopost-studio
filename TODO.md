# TODO

## Current Status

UI foundation is stable. No backend, publishing, or scheduler execution changes were introduced during the UI phase. Mock mode remains the default. The next work should follow the consolidated low-churn roadmap below.

MVP core is currently locked as stable after the controlled QA pass and latest checkpoint commit:

* `9802c7b` `controlled production qa fixes`
* `94ea0a6` `lock mvp core stable`

---

# Development Rules

1. Prefer large safe batches over micro-phases.
2. Preserve stable publish flow and scheduler stability.
3. Never weaken mock-mode safety.
4. Prefer extension over replacement.
5. Avoid unnecessary rewrites, abstractions, and file churn.
6. Commit only at meaningful milestones.
7. Update docs only after meaningful milestones, and keep all three project docs synchronized.
8. Do not expand backend/database architecture before the controlled expansion phase unless required for production safety.

---

# Roadmap

## Phase A - MVP Production Activation

Goal:
Production-safe real AI generation MVP with minimal architecture changes.

### In Scope

* Connect text provider routing to existing real generation services
* Add runtime validation for provider readiness
* Ensure provider badges/status reflect actual routing state
* Connect image provider selection to the current image generation flow
* Run end-to-end generation QA across generate, preview, draft, schedule, and publish flows

### Completed In This Milestone

* Real text provider routing through the existing `ai-generation.js` service
* Gemini API routing
* OpenAI API routing
* Safe Mock fallback for unavailable or failing text providers
* Runtime text provider status updates in the current UI

### Constraints

* Use existing stable services where possible
* No major refactor
* No scheduler redesign
* No database expansion unless absolutely necessary for MVP safety

## Phase B - Production Safety + Stabilization

Goal:
Stable low-cost production operation.

### In Scope

* Improve error handling
* Harden validation paths
* Perform scheduler QA
* Perform publish QA
* Harden settings behavior
* Stabilize build/release behavior

### Completed In This Milestone

* Clearer provider validation safeguards for missing keys and fallback cases
* Safer runtime provider and publish-mode visibility
* Compact user-safe notices for generation and draft save flows
* Defensive handler hardening to reduce UI crash risk
* Stability review of generate, save, preview, scheduler compatibility, and publish compatibility without backend changes
* Controlled QA fixes for persisted draft reload/edit and preview-side provider visibility

### Constraints

* Focus on reliability, not feature expansion
* Preserve current stable backend behavior

## Phase C - Controlled Backend Expansion

Goal:
Expand backend capabilities only after MVP stability is proven.

### In Scope

* Multi-page database architecture
* Queue processor V2
* Logs persistence
* Analytics foundation

### Planning-Only Starting Scope

* Minimal multi-page schema only
* Page-aware settings/token routing only
* Queue processor V2 only after routing is stable
* Logs persistence only after queue behavior is stable

### Fewest Meaningful Milestones

* Milestone 1: multi-page schema + page-aware routing
* Milestone 2: queue processor V2
* Milestone 3: logs persistence foundation

### Completed In This Milestone

* Added a minimal multi-page foundation with safe default fallback pages
* Added page-aware workspace context loading without changing stable publish behavior
* Preserved single-page compatibility for existing settings and drafts
* Added `page_id` persistence for newly saved drafts
* Added a shared page-context resolver for future scheduled-post routing without activating per-page live publish tokens

### Risk Areas

* Supabase schema expansion
* Multi-page routing safety
* Scheduler queue V2 stability
* Logs persistence write-path complexity
* Facebook publish safety under page-aware routing

### Constraints

* No premature optimization
* No unnecessary schema growth
* No scheduler redesign before proven need
* Do not start implementation without a dedicated controlled checkpoint

---

# Deferred Until Phase C or Later

* Supabase `pages` table and per-page token routing
* Queue processor redesign
* Persistent logs storage
* Analytics implementation
* Auth / SaaS / billing
* Codex CLI execution
* Advanced provider failover

---

# Milestone Tracking

## Ready Now

* MVP core maintenance only
* Phase C Milestone 2 planning only

## After Phase A Is Stable

* Phase B stabilization batch

## After Phase B Is Stable

* Phase C controlled backend expansion
