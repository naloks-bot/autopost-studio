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

Planned supported providers:

* Mock
* GPT Image
* DALL·E
* Future providers

Features:

* Aspect ratio routing
* Style presets
* Prompt assist
* Prompt memory
* Image regeneration

---

# Multi-Page Workspace Architecture (PLANNED)

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

---

# Scheduler Architecture V2 (PLANNED)

The scheduler system will evolve into:

* Queue-driven architecture
* Multi-page publishing
* Time-slot management
* Retry handling
* Publish tracking

---

# Planned Scheduler Flow

1. Content enters queue
2. Queue assigned to page
3. Scheduler validates timing
4. Publish processor executes post
5. Logs stored
6. Analytics updated

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
