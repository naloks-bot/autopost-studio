# Roadmap Consolidation

The roadmap has been consolidated into larger safe batches to reduce command overhead.

### Batch Execution Plan — Tonight's Session Complete ✅
*   **Batch 1**: Content + Image Workflow V2 + Preview Studio UI — ✅ Complete
*   **Batch 2**: Scheduler + Queue UI Foundation — ✅ Complete
*   **Batch 3**: AI Library + Logs UI Foundation — ✅ Complete
*   **Batch 4**: Final QA + Docs Stabilization — ✅ Complete

> ⚠️ **Architecture Freeze Note**: Do not start backend/database routing work without a dedicated controlled phase. Mock mode and production safety remain the default.

---

# Architecture Overview

## System Direction

AutoPost Studio is evolving into a:

AI-powered Facebook Content Operating System

The system architecture is designed around:

* Low-cost AI operations
* Multi-page management
* AI-assisted content generation
* Automated publishing workflows
* Persistent cloud-backed operations
* Future scalability

---

# Core Architecture Layers

## 1. AI Layer

Responsible for:

* Text generation
* Prompt generation
* Image generation
* AI routing
* Model selection
* Provider failover
* AI memory systems

### Current Providers

* Mock
* Gemini API
* OpenAI API

### Planned Providers

* Codex CLI
* Local models
* Additional image providers

---

## 2. Content Operations Layer

Responsible for:

* Draft management
* Scheduling
* Queue processing
* Publishing
* Retry systems
* Logs
* Automation workflows

---

## 3. Workspace Layer

Responsible for:

* Multi-page support
* Facebook page management
* Page-specific AI memory
* Per-page configurations
* Per-page automation rules

---

# Frontend Architecture

## App Shell

* Persistent sidebar
* Compact header
* Two-panel workflows
* Independent scroll regions
* Modal-based guidance system

## Current Pages

* Create Draft
* Status
* Settings
* Guide Modal

## Planned Pages

* My Pages
* Scheduler
* AI Library
* Logs
* Analytics

---

# AI Provider System V2 (UI FOUNDATION COMPLETE)

## Goals

* Low-cost AI routing (UI Foundation implemented)
* Runtime provider visibility (Implemented in Create/Settings)
* Flexible provider switching (UI implemented)
* Provider validation UI (Implemented in Settings)
* Future-proof architecture (Constants & Helpers in place)

---

## Text Generation Flow

Planned supported providers:

* Mock
* Gemini API
* OpenAI API
* Codex CLI

The generation service will:

* Detect provider availability
* Route generation requests
* Validate provider configuration
* Return standardized responses

---

## Image Generation Flow

# AI Image Studio (UI FOUNDATION COMPLETE)

The Image Studio provides a controlled environment for visual content creation:

*   **Aspect Ratio Support**: 1:1, 4:5, 9:16, 16:9
*   **Style Presets**: Realistic, Cinematic, Product Promo, Minimal, Fun / Meme
*   **Prompt Assist**: Integrated metadata-aware briefing.
*   **Preview Studio**: Real-time visualization of image/content relationship.

The UI foundation is now in place for future multi-provider routing.
* Image regeneration

---

# Multi-Page Workspace Architecture (UI FOUNDATION COMPLETE)

Each workspace page will contain:

* Page identity
* Facebook token
* Brand tone
* Audience profile
* Storytelling style
* Visual style memory
* Scheduling rules

The content system must always know:

* Which page is targeted
* Which AI provider generated content
* Which visual style belongs to the page

The UI foundation is now in place with a global page selector and workspace context tracking.

---

# Scheduler Architecture V2 (UI FOUNDATION COMPLETE)

The scheduler system will evolve into:

* Queue-driven architecture
* Multi-page publishing
* Time-slot management
* Retry handling
* Publish tracking

The UI foundation is now implemented with a dedicated Scheduler Dashboard and Queue Planning visibility.

---

# Planned Scheduler Flow

1. Content enters queue
2. Queue assigned to page
3. Scheduler validates timing
4. Publish processor executes post
5. Logs stored
6. Analytics updated

# Content Data Model V2 (UI FOUNDATION COMPLETE)

The new model supports granular control over content structure:

* **Content Type**: General Post, Promo, Storytelling, Engagement Question, Announcement
* **Tone**: Friendly, Professional, Funny, Emotional, Bold
* **Length**: Short, Medium, Long
* **CTA**: None, Comment, Share, Inbox, Visit Link

The UI foundation is now implemented with metadata controls and preview visibility tags.

---

# Supabase Usage

Supabase remains the operational backbone.

## Current Usage

* Draft storage
* Settings storage
* Metadata persistence
* Generated image tracking

## Planned Usage

* Multi-page data
* Scheduler queues
* AI libraries
* Logs
* Analytics
* Cleanup jobs

---

# Storage Optimization Strategy

Because the system targets low-cost/free operation:

* Old successful posts will auto-clean after 7 days
* Logs may auto-expire
* AI image cache may be configurable
* Supabase free-tier limits must always be respected

---

# Safety Architecture

The system is intentionally designed to default to safe operation.

## Safety Features

* Mock publish mode
* Scheduler enable toggle
* Manual publish confirmation
* Provider validation
* Fail-safe fallbacks

---

# Content Workflow V2 (UI FOUNDATION COMPLETE)

The workflow now includes a "Prompt Assist" layer that:

*   **Summarizes Context**: Combines Workspace, Provider, and Content Metadata.
*   **Generates Briefs**: Creates human-readable summaries of the desired content.
*   **Enables Manual Flow**: Allows users to copy briefs for manual AI assistance while the automated routing is being built.

This ensures a smooth transition to full AI orchestration in later phases.

---

# Design Principles

1. Minimal-cost operation
2. Fail-safe publishing
3. Provider flexibility
4. Multi-page scalability
5. Modular AI architecture
6. Workflow-first UX
7. Stable production behavior

---

# Long-Term Vision

The long-term vision is:

* A centralized AI content operating dashboard
* Capable of managing multiple Facebook pages
* With AI-assisted automation
* While maintaining extremely low operational cost
* And remaining accessible to non-technical users
