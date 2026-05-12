# TODO

## Current Status

UI foundation is stable. No backend, publishing, or scheduler execution changes were introduced during the UI phase. Mock mode remains the default. The next work should follow the consolidated low-churn roadmap below.

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

### Constraints

* No premature optimization
* No unnecessary schema growth
* No scheduler redesign before proven need

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

* Phase A implementation batch

## After Phase A Is Stable

* Phase B stabilization batch

## After Phase B Is Stable

* Phase C controlled backend expansion
