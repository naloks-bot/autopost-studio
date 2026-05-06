# Project Status

## Current Project Status
- The application runs as a **React** SPA built with **Vite** and styled with **Tailwind CSS**.
- Core features (Create, Settings, Status, Guide) are functional.
- Supabase integration works for reading posts and saving drafts when the required tables and RLS policies are present.
- Offline / read‑only fallback paths are implemented.
- Dark / light theme toggle is stable.

## Current Tech Stack
- **React 19** (JSX, hooks)
- **Vite 7** (dev server & build)
- **Tailwind CSS 4** (utility‑first styling)
- **Supabase JS 2** (auth‑less client, CRUD, env snapshot)
- **Lucide‑react** (icon set)
- **JavaScript (ESM)** – no TypeScript yet.

## Current `src` Structure
```
src
├─ components/
│   ├─ ActionButton.jsx
│   ├─ Header.jsx
│   ├─ SectionCard.jsx
│   ├─ StatusCard.jsx
│   └─ TabButton.jsx
├─ constants/
│   └─ appConstants.js
├─ hooks/               (empty)
├─ pages/
│   ├─ App.jsx
│   ├─ CreatePage.jsx
│   ├─ GuidePage.jsx
│   ├─ SettingsPage.jsx
│   └─ StatusPage.jsx
├─ services/
│   ├─ ai-generation.js (Text generation dispatcher)
│   ├─ ai-image-generation.js (Image generation dispatcher)
│   ├─ facebook.js (Facebook Graph API wrapper)
│   ├─ scheduler.js (Client-side automation logic)
│   ├─ storage.js (Supabase Storage wrapper)
│   ├─ app-settings.js  (local settings persistence)
│   ├─ local-drafts.js  (offline draft handling)
│   └─ supabase.js      (Supabase API wrapper)
└─ index.css / main.jsx
```

## What Has Been Refactored Already
- Extraction of **settings**, **draft** handling, and **Supabase** calls into the `services/` layer.
- Centralised constants (`appConstants.js`) for tabs, guide sections, and default form data.
- Added dark‑mode toggle with a gradient background.
- Implemented graceful fallback when Supabase is unavailable (offline/read‑only modes).
- **Phase 4 Complete**: Extraction of reusable UI components (`Header`, `StatusCard`, `SectionCard`, `TabButton`, `ActionButton`).
- **Phase 5 Complete**: Integrated **AI Text Generation** (OpenAI & xAI).
- **Phase 6A Complete**: Integrated **Image Generation Flow MVP**.
- **Phase 6B Complete**: Integrated **Supabase Image Metadata Persistence**.
- **Phase 7A Complete**: Integrated **Facebook Publishing Foundation**.
- **Phase 7B Complete**: Integrated **Scheduler & Automation Foundation**.
    - Isolated scheduler service (`scheduler.js`) for client-side task management.
    - Automated background polling (every 60s) while the app is open.
    - Automatic detection and publication of "due" scheduled posts.
    - Status page visibility for scheduled/posted timestamps and scheduler activity.
- **Phase 8 Complete**: **Production Hardening & QA Pass**.
    - Introduced a centralized `logger.js` for development-only tracing.
    - Added defensive validation and error extraction across all services.
    - Improved error messaging for common Facebook and Supabase Storage failures.
    - Verified cross-mode stability (online, offline, missing config).
    - Established a manual QA checklist for ongoing verification.

## Current Known Issues
- **Supabase RLS**: write operations on the `posts` table are blocked until proper row‑level security policies are added.
- **Missing tables**: `app_settings` and `posts` may not exist until `supabase-setup.sql` is executed.
- **Supabase Storage**: Bucket `generated-images` must exist and be public (or have correct RLS policies) for mirroring to work.
- **Client-Side Scheduler**: Automation only runs while the browser tab is open and active.
- Offline mode stores drafts locally but does not sync automatically when connectivity is restored.

## Current Coding Rules for AI Assistants
1. **Never modify UI layout or visual styling** unless explicitly requested.
2. **Do not change existing logic** – only add documentation or new files.
3. Preserve all existing comments and docstrings.
4. Keep new code consistent with the existing ES module style.

## Current Phase
**Phase 8 Complete: Production Hardening & QA Pass** – The app is now stable, well-logged, and ready for production-like usage.

## Recommended Next Phase
1. **Phase 9: Supabase Edge Scheduler** – Migrate client-side polling to a server-side cron job for 24/7 reliability.
2. **Phase 10: Multi-Account Support** – Support for managing multiple Facebook pages from one dashboard.
3. **TypeScript Migration** – introduce TS for better maintainability.

## Current Pages / Components / Services / Constants Summary
- **Pages**: `App.jsx`, `CreatePage.jsx`, `GuidePage.jsx`, `SettingsPage.jsx`, `StatusPage.jsx`.
- **Components**: `Header`, `StatusCard`, `SectionCard`, `TabButton`, `ActionButton`.
- **Services**: `ai-generation.js`, `ai-image-generation.js`, `facebook.js`, `logger.js`, `scheduler.js`, `storage.js`, `app-settings.js`, `local-drafts.js`, `supabase.js`.
- **Constants**: `appConstants.js` – contains tabs, guide sections, default form values, status copy strings.

## QA Checklist (Verified)
- [x] **Create Text**: AI successfully generates Thai/English content.
- [x] **Generate Image**: AI generates images and mirrors them to Supabase Storage.
- [x] **Save Draft**: Drafts persist with full image metadata.
- [x] **Status View**: Persisted metadata and previews render correctly.
- [x] **Manual Publish**: Immediate posting to Facebook Page works.
- [x] **Scheduled Publish**: Background automation works while the tab is open.
- [x] **Error Handling**: Graceful warnings for missing config or network failure.
