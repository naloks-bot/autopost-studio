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

## Phase C - Controlled Backend Expansion

Phase C begins only after MVP activation and stabilization are proven stable.

Scope:

* multi-page database architecture
* queue processor V2
* logs persistence
* analytics foundation

Architecture rule:
Backend expansion must remain controlled. Avoid premature optimization, unnecessary schema growth, or scheduler redesigns before the MVP proves stable.

---

# Data and Backend Guidance

## Current Supabase Usage

* Draft storage
* Settings storage
* Metadata persistence
* Generated image tracking

## Deferred Supabase Expansion

Do not expand into the following until Phase C:

* multi-page page tables
* queue processor redesign
* persistent logs storage
* analytics data foundation

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
