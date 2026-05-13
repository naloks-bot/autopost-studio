# Architecture

## Operating Principle

AutoPost Studio is being built as an AI-assisted Facebook content operating system with a strict bias toward low-cost, production-safe, minimal-churn development.

The architecture must optimize for:

* stable publishing behavior
* safe mock-mode defaults
* minimal backend churn
* controlled expansion
* rollback-friendly milestones

---

# Development Strategy

## Permanent Workflow Rules

1. Prefer large safe batches over fragmented micro-phases.
2. Extend stable systems instead of replacing them.
3. Avoid unnecessary abstractions, rewrites, and speculative architecture.
4. Keep documentation updates milestone-based, not tweak-based.
5. Commit only at meaningful stable checkpoints.

These workflow rules are part of the architecture strategy because they directly protect system stability and keep the codebase lean.

---

# Architecture Overview

## System Direction

The target system direction remains:

* Multi-provider AI routing
* Multi-page workspace support
* Automated but production-safe publishing workflows
* Persistent cloud-backed operations
* Future queue-driven scheduling
* Centralized content operations

This direction is valid, but implementation must remain staged and controlled.

---

# Core Architecture Layers

## 1. AI Layer

Responsible for:

* text generation
* prompt generation
* image generation
* provider routing
* runtime validation
* model/provider selection

### Current Providers

* Mock
* Gemini API
* OpenAI API

### Deferred Providers

* Codex CLI
* local models
* additional image providers
* advanced failover logic

## 2. Content Operations Layer

Responsible for:

* draft management
* scheduling
* publishing
* workflow safety
* validation and error handling

## 3. Workspace Layer

Responsible for:

* page targeting
* page-specific settings
* future multi-page management
* page-aware content context

---

# Frontend Architecture

## Current Stable UI Foundation

* Persistent sidebar
* Compact header
* Two-panel workflows
* Prompt Assist flow
* Image Studio controls
* Preview Studio
* Scheduler dashboard visibility
* AI Library UI
* Logs viewer UI

Checkpoint note:
Create flow runtime wiring has been stabilized without changing the scheduler, publish flow, Facebook service, backend, or Supabase architecture. Preview now receives caption-only state, image prompt state flows directly into Image Studio, upload-first image entry works, and local Gemini env is aligned to `gemini-2.5-flash`.

This UI foundation is considered stable and should be reused during MVP activation instead of being reworked.

---

# Phased Architecture Plan

## Phase A - MVP Production Activation

Phase A is intentionally narrow. It should connect the existing UI foundation to real AI generation with minimal architecture changes.

Scope:

* AI provider routing
* runtime validation
* provider badge/status accuracy
* image routing connection
* end-to-end generation QA

Architecture rule:
Use existing services and stable flows wherever possible. Do not introduce large new provider frameworks or backend redesigns during this phase.

Current Phase A progress:

* Text provider routing is active through the existing `ai-generation.js` service.
* OpenAI and Gemini now use real text generation requests when configured.
* Missing or failing text providers fall back safely to Mock mode.
* Scheduler, publish flow, and Supabase schema remain untouched.

## Phase B - Production Safety + Stabilization

Phase B hardens real-world operation after Phase A is working.

Scope:

* error handling
* validation hardening
* scheduler QA
* publish QA
* settings hardening
* build stabilization

Architecture rule:
Focus on operational stability, not feature expansion.

Current Phase B progress:

* Provider validation now exposes clearer missing-key and fallback behavior.
* Runtime safety visibility is more consistent across header, create flow, and publish mode surfaces.
* Create Draft handlers now use compact user-safe errors and defensive try/catch protection.
* Controlled QA fixes now cover persisted draft reload/edit and preview-side provider visibility.
* Scheduler, publish flow, backend structure, and Supabase schema remain unchanged.
* MVP core is now release-locked as stable without backend or architecture expansion.

## Phase C - Controlled Backend Expansion

Phase C begins only after MVP activation and stabilization are proven stable.

Scope:

* multi-page database architecture
* queue processor V2
* logs persistence
* analytics foundation

Architecture rule:
Backend expansion must remain controlled. Avoid premature optimization, unnecessary schema growth, or scheduler redesigns before the MVP proves stable.

Planning rule:
Do not start Phase C implementation from general momentum alone. A dedicated planning checkpoint must explicitly choose the first implementation milestone before any schema or queue work begins.

Smallest safe planned Phase C scope:

* Batch 1: minimal multi-page schema and page-aware settings/token routing
* Batch 2: queue/page routing foundation without execution activation
* Batch 3: controlled per-page publish activation
* Batch 4: logs persistence foundation after Batch 3 routing is stable
* Batch 5: queue processor V2 only after routing and log behavior are stable

Current Batch 2 status:

* workspace page context is now loaded through a minimal page foundation
* default single-page behavior remains the compatibility path
* draft persistence now carries `page_id`
* publish and scheduler execution still use the stable global V1 flow
* scheduled-post processing can now resolve normalized page context for metadata/debug without changing publish token execution
* page publish readiness can now be derived safely for UI/debug without activating per-page token execution
* per-page publish dry runs can now report hypothetical routing safely while live per-page execution stays disabled

Current Batch 3 status:

* guarded publish config selection now resolves mock/global/page-specific execution sources
* live mode can use page-specific Facebook credentials when the selected page is fully configured
* unresolved or incomplete non-default page targets block safely instead of silently falling back to the wrong page
* default page can still fall back to the stable global V1 config
* scheduler loop structure and Facebook API service remain unchanged

Current Batch 4 status:

* operation logs now have a minimal persistent foundation in Supabase
* manual publish and scheduled publish success/failure/block/fallback events can be recorded
* log writes are intentionally non-blocking and fail silently except for dev warnings
* the existing Logs UI can read persisted operation logs when the table is available
* final Phase C QA confirms scheduler structure, publish flow, guarded page routing, and log persistence remain stable
* post-Phase C stabilization added migration-safe `page_id` hardening, non-disruptive draft edit/update behavior, and operator-facing UX cleanup without changing scheduler or Facebook service architecture

Risk areas to watch:

* Supabase schema coupling with existing single-page assumptions
* multi-page routing mistakes causing wrong-token publish behavior
* queue processor changes destabilizing the current scheduler path
* logs persistence increasing write complexity before operations are settled
* Facebook publish safety regression during routing changes

---

# Data and Backend Guidance

## Current Supabase Usage

* Draft storage
* Settings storage
* Metadata persistence
* Generated image tracking

## Deferred Supabase Expansion

Do not expand into the following until Phase C:

* queue processor redesign
* persistent logs storage
* analytics data foundation

For the current checkpoint, Batch 4 adds only minimal log persistence. Queue redesign and analytics remain deferred.

Phase C is now considered complete and stable at the current architecture boundary. Future backend expansion should begin only from a fresh planning checkpoint, not from continued momentum inside the current publish path.

Post-Phase C stabilization remains within the same architecture boundary. It is limited to safe integration fixes, UI clarity, and migration-safe data guards.

Phase D is also constrained to the same boundary. It is reserved for operator-facing UI cleanup, Thai wording, reduced visual fatigue, and operational polish only.

Phase D.2 narrows that further:

* finish broken operator flows before adding visual polish
* separate workspace page management from Settings
* treat page README / AI memory as workspace context, not backend expansion
* keep scheduler, queue, and backend redesign deferred
* avoid schema expansion unless it is required to preserve existing save-flow compatibility

Phase D.3 continues within the same boundary:

* align the core posting flow with real operator usage
* keep Create as input-left / preview-right
* allow page profile guidance to shape writing and image prompt behavior using existing workspace state
* keep Settings system-only and move page-specific setup to the dedicated page management surface
* preserve scheduler V1, current publish flow, and the existing backend/schema boundary

Current test-ready stabilization priority within the same boundary:

* stabilize the full flow from Generate -> Image Prompt -> Image -> Preview -> Save -> Reload/Edit
* keep Mock / OpenAI Image / future image providers as the image-provider direction
* treat Codex as a coding assistant, not an image provider inside the app runtime
* harden `page_id` save compatibility without schema redesign unless a compatibility guard is absolutely required
* keep scheduler V1, publish flow, queue redesign, and backend architecture unchanged

This protects the current stable publish flow and avoids unnecessary backend churn.

---

# Safety Architecture

The system must continue to default to safe operation.

## Safety Requirements

* Mock mode remains the safest default path.
* Existing publish flow must remain stable.
* Scheduler behavior must not be destabilized by MVP AI work.
* Validation should fail safely with clear user feedback.
* Real-provider activation must be key-gated and production-aware.

---

# Design Principles

1. Minimal-cost operation
2. Fail-safe publishing
3. Minimal architecture churn
4. Controlled backend expansion
5. Provider flexibility without over-engineering
6. Workflow-first UX
7. Stable production behavior

---

# Long-Term Vision

The long-term vision remains a centralized AI content operating dashboard for multiple Facebook pages, but the path to that outcome must stay disciplined:

* stabilize MVP first
* harden production safety second
* expand backend only when justified
