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
- **Phase 4 Complete**: Extracted reusable UI components (`Header`, `StatusCard`, `SectionCard`, `TabButton`, `ActionButton`) from main pages.
- Consolidated UI text into reusable components (e.g., `SettingsField`).

## Current Known Issues
- **Supabase RLS**: write operations on the `posts` table are blocked until proper row‑level security policies are added.
- **Missing tables**: `app_settings` and `posts` may not exist until `supabase-setup.sql` is executed.
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
**Refactoring / Componentization Phase** – UI elements have been standardized into reusable components for better maintainability.

## Recommended Next Phase
1. **AI Generation Flow** – integrate OpenAI (or xAI) to generate post content and images.
2. **Facebook Posting Flow** – add Graph API calls to publish posts directly.
3. **Scheduler Strategy** – design a lightweight scheduler (e.g., Supabase Edge Functions or a cron‑like service) to automate posting.
4. **Storage Strategy** – decide between Supabase Storage vs. external CDN for generated images.
5. **TypeScript Migration** – introduce static typing for better maintainability.

## Current Pages / Components / Services / Constants Summary
- **Pages**: `App.jsx`, `CreatePage.jsx`, `GuidePage.jsx`, `SettingsPage.jsx`, `StatusPage.jsx`.
- **Components**: `Header`, `StatusCard`, `SectionCard`, `TabButton`, `ActionButton`.
- **Services**: `app-settings.js`, `local-drafts.js`, `supabase.js`.
- **Constants**: `appConstants.js` – contains tabs, guide sections, default form values, status copy strings.

---
*Generated on 2026‑05‑06*
