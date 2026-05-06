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
│   ├─ ai-generation.js (OpenAI / xAI / Mock text dispatcher)
│   ├─ ai-image-generation.js (OpenAI / Mock image dispatcher)
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
    - Isolated image generation service (`ai-image-generation.js`) with OpenAI and Mock support.
    - Real-time image generation connected to `CreatePage` with status feedback.
    - Improved image preview state with provider info and revised prompts.
    - Automated upload of generated images to **Supabase Storage** (`generated-images` bucket).
    - Metadata (URL, storage path, provider) attached to draft data.
    - Robust fallback: stays on external URL if storage upload fails.
- **Phase 6B Complete**: Integrated **Supabase Image Metadata Persistence**.
    - Updated `posts` table schema to store image provider, revised prompt, and storage metadata.
    - Enabled remote draft insertion with full image metadata support.
    - Updated Status page to display saved image previews and technical metadata.

## Current Known Issues
- **Supabase RLS**: write operations on the `posts` table are blocked until proper row‑level security policies are added.
- **Missing tables**: `app_settings` and `posts` may not exist until `supabase-setup.sql` is executed.
- **Supabase Storage**: Bucket `generated-images` must exist and be public (or have correct RLS policies) for mirroring to work.
- **Facebook integration** is not yet implemented – only placeholders exist in the UI.
- Offline mode stores drafts locally but does not sync automatically when connectivity is restored.
- No TypeScript typing; linting rules are minimal.

## Current Coding Rules for AI Assistants
1. **Never modify UI layout or visual styling** unless explicitly requested.
2. **Do not change existing logic** – only add documentation or new files.
3. Preserve all existing comments and docstrings.
4. Keep new code consistent with the existing ES module style.
5. Respect the project’s incremental refactor approach: small, isolated changes.

## Current Phase
**Phase 6B Complete: Supabase Image Metadata Persistence** – The app now fully persists AI-generated images and their technical metadata to Supabase.

## Recommended Next Phase
1. **Phase 7: Facebook Posting Flow** – Add `services/facebook.js` wrapper around Graph API to publish posts.
2. **Scheduler Integration** – implement client-side or edge-function based publishing.
3. **Scheduler Integration** – implement client-side or edge-function based publishing.

## Current Pages / Components / Services / Constants Summary
- **Pages**: `App.jsx`, `CreatePage.jsx`, `GuidePage.jsx`, `SettingsPage.jsx`, `StatusPage.jsx`.
- **Components**: `Header`, `StatusCard`, `SectionCard`, `TabButton`, `ActionButton`.
- **Services**: `ai-generation.js`, `ai-image-generation.js`, `storage.js`, `app-settings.js`, `local-drafts.js`, `supabase.js`.
- **Constants**: `appConstants.js` – contains tabs, guide sections, default form values, status copy strings.

---
*Generated on 2026‑05‑06*
