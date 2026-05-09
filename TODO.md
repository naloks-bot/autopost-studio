# AutoPost Studio — MVP Production Activation Plan

## Foundation Status: ✅ STABLE

UI Foundation work is complete (Batches 1–4). No backend, publishing, or scheduler logic was changed during the UI foundation phase. Mock mode remains the default. Production publishing uses the existing stable V1 flow.

---

## UI Foundation — Completed (Batches 1–4)

| Area | Status |
|---|---|
| AI Provider System V2 UI (dropdowns, badges, status) | ✅ Complete |
| Multi-Page Workspace UI (selector, context card, settings) | ✅ Complete |
| Content Metadata UI (Type, Tone, Length, CTA) | ✅ Complete |
| Prompt Assist (brief generator, copy button) | ✅ Complete |
| AI Image Studio UI (aspect ratio, style presets) | ✅ Complete |
| Preview Studio UI (mobile/desktop post preview) | ✅ Complete |
| Scheduler / Queue UI (dashboard, slots, status badges) | ✅ Complete |
| AI Library UI (images, prompts, captions, templates) | ✅ Complete |
| System Logs Viewer UI (terminal, categories, filters) | ✅ Complete |
| Production UI QA Pass | ✅ Complete |

---

## MVP Production Activation Plan

### Batch 5 — Real AI Routing MVP
> Connect existing provider selectors to real generation services.

- Route text generation to Gemini API (when key is present)
- Route text generation to OpenAI API (when key is present)
- Mock fallback when no key is configured
- Use existing `ai-generation.js` service; no new services yet
- **No Codex CLI execution yet**
- **No provider failover engine yet**

### Batch 6 — Real Image + End-to-End Publish QA
> Wire image provider selector into existing image generation flow.

- Connect image provider selector to current image generation service
- Align GPT Image / DALL·E naming if supported by existing service
- Full end-to-end QA: Generate → Preview → Save Draft → Schedule → Publish
- Keep existing scheduler backend unchanged

### Batch 7 — Production Activation + Safety Hardening
> Final safety checks before calling the system production-ready.

- Settings validation (API key presence checks with clear error messages)
- Mock / Live mode safety review
- Final build, git tag, and docs

---

## Deferred / Post-MVP

> ⚠️ Do NOT start the following without a dedicated controlled phase.

- Supabase `pages` table + per-page token routing
- Scheduler queue processor V2 (Edge Functions)
- Real persistent logging system
- AI Library database storage
- Analytics system
- Auth / SaaS / Billing infrastructure
- Codex CLI real execution
- Advanced provider failover engine

---

## Development Rules

1. Minimal safe changes only
2. Preserve stable backend behavior
3. Never break mock mode
4. Build test every batch
5. Update docs every batch
6. Commit & push every batch
7. Prefer large safe UI batches over tiny fragmented phases
8. Backend/database/API changes must be done in dedicated controlled phases only

---

## Architecture Freeze Note

> ⚠️ Do not start backend or database routing work without a dedicated controlled phase. Mock mode and production safety are the default.
