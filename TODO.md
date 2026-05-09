# TODO Roadmap

# CURRENT STABLE PHASE

✅ Phase 10D — Guide Modal + Final UI QA

The dashboard UI foundation is now stable.

---

# NEXT MAJOR ROADMAP

# STAGE 1 — FOUNDATION RESTRUCTURE

Goal:
Prepare the application for:

* Multi-page architecture
* Multi-provider AI routing
* Production-safe scalability

---

## PHASE 11A — AI Provider System V2

Priority: CRITICAL

✅ Phase 11A Complete — AI Provider System V2 UI Foundation
* ✅ AI provider dropdowns
* ✅ Text/image provider separation
* ✅ Provider badges
* ✅ Provider helper text
* ✅ Runtime AI status visibility (Create Page)
* ✅ Provider validation UI (Test buttons)

### Next Steps (Phase 11A-2 / Future)

* Codex CLI status detection
* Runtime AI information display (detailed logs)
* Backend routing logic implementation
* Real provider testing tools

---

## PHASE 11B — Multi-Page Workspace Foundation

Priority: CRITICAL

✅ Phase 11B Complete — Multi-Page Workspace UI Foundation
* ✅ Page selector dropdown (Header)
* ✅ Workspace context card (Create Page)
* ✅ Workspace settings section
* ✅ Local active page state persistence

### Next Steps (Phase 11B-2 / Future)

* pages table in Supabase
* Per-page configuration UI
* Per-page access token management
* Page profile system (AI context)
* Page-based settings storage

---

## PHASE 11C — Content Data Model V2

Priority: HIGH

### Goals

* Stabilize content structure
* Support multi-page metadata
* Prepare for queue architecture

### Tasks

* Content metadata redesign
* Provider metadata
* Image metadata
* Queue metadata
* Page relationships

---

# STAGE 2 — CONTENT CREATION SYSTEM

---

## PHASE 12A — Content Creation Workflow V2

Priority: HIGH

### Planned Features

* Content type selector
* Tone selector
* Content length selector
* CTA controls
* Hashtag controls
* Link controls

---

## PHASE 12B — AI Image System V2

Priority: HIGH

### Planned Features

* Image provider selector
* Aspect ratio selector
* Style presets
* Prompt assist
* Auto prompt generation
* Text overlay support
* Image regeneration

---

## PHASE 12C — Preview Studio

Priority: MEDIUM

### Planned Features

* Mobile preview
* Desktop preview
* Final publish preview
* Crop preview

---

# STAGE 3 — SCHEDULER SYSTEM V2

---

## PHASE 13A — Queue-Based Scheduler

Priority: HIGH

### Planned Features

* Multi-page scheduling
* Queue overview
* Posting slots
* Retry system
* Failure recovery
* Publish tracking

---

## PHASE 13B — Scheduler UI Dashboard

Priority: MEDIUM

### Planned Features

* Per-page queue stats
* Daily post planning
* Timeline controls
* Queue visibility

---

# STAGE 4 — AI LIBRARY + LOGS

---

## PHASE 14A — AI Library

Priority: MEDIUM

### Planned Features

* Generated image library
* Saved prompts
* Saved captions
* Search & filtering
* Reusable templates

---

## PHASE 14B — Logs System

Priority: MEDIUM

### Planned Features

* App logs
* AI logs
* Scheduler logs
* Publish logs
* Error tracking
* Copy/export tools

---

# STAGE 5 — ANALYTICS

---

## PHASE 15A — Analytics Foundation

Priority: LOW

### Planned Features

* Post statistics
* AI generation statistics
* Queue performance
* Publish success metrics

---

# FUTURE / LONG-TERM

## Multi-user Auth

Deferred until workflow stabilization.

## SaaS Architecture

Deferred until system maturity.

## Billing System

Deferred until stable multi-user architecture exists.

---

# DEVELOPMENT RULES

1. Minimal safe changes only
2. Preserve stable backend behavior
3. Never break mock mode
4. Build test every phase
5. Update docs every phase
6. Commit & push every phase
7. Avoid technical debt accumulation
8. Prioritize workflow quality over feature quantity
