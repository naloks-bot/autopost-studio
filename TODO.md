# Roadmap Consolidation

The roadmap has been consolidated into larger safe batches to reduce command overhead and ensure UI/UX consistency across related features.

### Batch Execution Plan
*   **Batch 1**: Content + Image Workflow V2 + Preview Studio UI — ✅ Complete
*   **Batch 2**: Scheduler + Queue UI Foundation — ✅ Complete
*   **Batch 3**: AI Library + Logs UI Foundation — ✅ Complete
*   **Batch 4**: Final QA + Docs Stabilization — ⏳ Next

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

## PHASE 11C — Content Data Model V2 UI Foundation

Priority: CRITICAL

✅ Phase 11C Complete — Content Data Model V2 UI Metadata Foundation
* ✅ Content Metadata card (Type, Tone, Length, CTA)
* ✅ Preview metadata visibility tags
* ✅ Metadata local state tracking
* ✅ Provider-aware metadata display

### Next Steps (Phase 11C-2 / Future)

* Database schema update for metadata
* AI prompt generation using metadata
* Dynamic model selection based on content type
* Advanced CTA insertion logic

---

# STAGE 2 — CONTENT CREATION SYSTEM

---

## PHASE 12A — Content Creation Workflow V2

Priority: HIGH

✅ Phase 12A Complete — Content Workflow V2 Prompt Assist UI
* ✅ Content type selector
* ✅ Tone selector
* ✅ Content length selector
* ✅ CTA controls
* ✅ Prompt Assist card
* ✅ Copy Prompt Brief functionality

### Next Steps (Phase 12A-2 / Future)
* Hashtag controls
* Link controls
* AI prompt routing integration
* Dynamic generation using Briefs

---

## PHASE 12B — AI Image Studio & Preview Foundation

Priority: HIGH

✅ Batch 1 Complete — Content + Image Workflow V2 UI Foundation
* ✅ AI Image Studio card
* ✅ Aspect ratio & Style presets
* ✅ Preview Studio (Mobile/Desktop)
* ✅ Integrated Workflow V2 UI

### Next Steps (Batch 2 / Future)
* Image generation API routing
* Auto-generation of image prompts from content
* Image variation system
* Advanced Studio filters
* Text overlay support
* Image regeneration

---

## PHASE 13 — Analytics & Reporting (PLANNED)

Priority: MEDIUM

* Post performance tracking
* Page growth metrics
* Best time to post recommendations
* Content performance by type/tone

---

## PHASE 13A — Queue-Based Scheduler Foundation

Priority: HIGH

✅ Batch 2 Complete — Scheduler + Queue UI Foundation
* ✅ Scheduler Dashboard Page
* ✅ Queue Planning UI (Mock)
* ✅ Posting Slot Controls UI
* ✅ Timezone & Status visibility

### Next Steps (Batch 3 / Future)
* Supabase `queue` table
* Background processor V2 (Edge Functions)
* Automated retry logic
* Posting slot persistence
* Real-time queue syncing

---

## PHASE 13B — Scheduler UI Dashboard

Priority: MEDIUM

### Planned Features

* Per-page queue stats
* Daily post planning
* Timeline controls
* Queue visibility

---

# STAGE 4 — AI LIBRARY + LOGS FOUNDATION

---

## PHASE 14A — AI Library & Logs Foundation

Priority: MEDIUM

✅ Batch 3 Complete — AI Library + Logs UI Foundation
* ✅ AI Library Dashboard UI
* ✅ Asset categories (Images, Prompts, etc.)
* ✅ System Logs Viewer UI
* ✅ Log filtering & export UI placeholders
* ✅ Full Navigation integration

### Next Steps (Batch 4 / Future)
* Supabase `library` table
* Persistent logging service
* Asset search & filtering logic
* Template persistence
* Log export functionality

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
