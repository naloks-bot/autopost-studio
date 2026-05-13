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

## 3. Publishing + Automation Layer

Responsible for:

* manual publish
* scheduled publish
* failed publish handling
* duplicate prevention
* cron + Edge Function execution reliability

Rule:
Reliability hardening is allowed. Redesign is not.

Current reliability boundary inside this layer:

* Supabase DB is the authoritative publish state
* manual and scheduled publish both claim `publishing` before Facebook API execution
* successful publish finalization clears `scheduled_at`, persists `facebook_post_id`, and re-reads DB truth
* failed publishes transition to `failed` instead of silently remaining in queue
* scheduler observability must log execution truth, not optimistic intent

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
2. Minimize phase fragmentation.
3. Prefer large safe batches.
4. Avoid rewrites and architecture churn.
5. Avoid speculative systems.
6. Preserve rollback safety.
7. Commit only meaningful checkpoints.
8. Update docs only after meaningful milestones.

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
* 5-minute production cron cadence for scheduler triggering

Future work should build on this boundary, not reopen it without a proven blocker.
