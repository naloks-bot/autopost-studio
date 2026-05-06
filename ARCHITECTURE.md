# Architecture Overview

## Overall Architecture
The application is a **client‑side React SPA** built with **Vite**. It communicates directly with **Supabase** (PostgreSQL + Storage + Edge Functions) via the Supabase JavaScript client. All business logic lives in the **service layer** (`src/services/`). UI components are organized under `src/pages/` and future reusable widgets will reside in `src/components/`.

## Frontend Flow
1. **App Initialization** – `main.jsx` mounts `App.jsx`.
2. **Settings Load** – Local settings are read from `localStorage` (`services/app-settings.js`). If a Supabase `app_settings` row exists, it is fetched and merged.
3. **Logging & Diagnostics** – `services/logger.js` provides development-only tracing for all core operations.
4. **Data Fetching** – `fetchRemotePosts` & `fetchRemoteSettings` populate the UI with existing drafts and configuration.
5. **Scheduler Polling** – `services/scheduler.js` runs every 60s while the app is active to process due scheduled posts.

## Supabase Integration Flow
- **Environment Snapshot** – `getSupabaseEnvSnapshot` pulls the `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `.env`.
- **CRUD Services** (`services/supabase.js`)
  - `fetchRemotePosts` – SELECT from `public.posts` with full image metadata.
  - `insertRemoteDraft` – INSERT a new draft row.
  - `updateRemotePostStatus` – Updates status to `posted` after publishing.
  - `saveRemoteSettings` – Persists API keys and Page IDs.

## AI & Media Flow
1. **Text Generation** (`services/ai-generation.js`) – Dispatcher for text models.
2. **Image Generation** (`services/ai-image-generation.js`) – DALL-E integration.
3. **Storage** (`services/storage.js`) – Mirrors generated images to Supabase `generated-images` bucket.
4. **Resiliency**: If Storage upload fails, the app falls back to the provider URL; if AI fails, the app uses a mock template.

## Facebook Posting Flow
1. **Service Layer** (`services/facebook.js`) – Wrapper around Facebook Graph API v23.0.
2. **Automation**: `services/scheduler.js` handles time-based detection and automatic API calls.
3. **Error Handling**: Detailed extraction of Facebook error codes (190, 200, etc.) for user-facing feedback.

## Folder Structure
```
src/
├─ components/          # Reusable UI widgets
├─ constants/          # Static data
├─ pages/              # Route‑level screens
├─ services/           # Service Layer
│   ├─ ai-generation.js
│   ├─ ai-image-generation.js
│   ├─ facebook.js
│   ├─ logger.js        # Centralized dev-logging
│   ├─ scheduler.js
│   ├─ storage.js
│   ├─ app-settings.js
│   ├─ local-drafts.js
│   └─ supabase.js
└─ index.css / main.jsx
```

## Production Safety Controls
- **facebookPublishMode**: A toggle in Settings that defaults to `mock`.
    - **Manual Publish**: Checks this mode; if not `live`, it simulates a successful post without calling the Facebook API.
    - **Confirmation**: Only requires a `confirm()` popup when in `live` mode to prevent "accidental one-click" publishing.
- **schedulerEnabled**: A master switch for background automation.
    - Even if posts are due, the scheduler will skip processing unless this is toggled `ON`.
- **Memory Safety**: Scheduler and fetch loops are stabilized with `useRef` locks to prevent re-render cascades and memory leaks in long-running production sessions.

## Production Hosting
- **Frontend**: Hosted on **Vercel** as a static build (`npm run build`).
- **Database/Storage**: Powered by **Supabase**.
- **Services**: All API integrations (Facebook, OpenAI, xAI) are handled via standard `fetch` calls from the browser.

## Design Principles
- **Separation of Concerns** – Logic is decoupled from UI.
- **Fail-Safe Operations** – All async calls are wrapped in try-catch blocks with standardized return shapes.
- **Stable Re-renders** – State updates are guarded with deep comparison to ensure UI performance.

---
*Last updated on 2026‑05‑07 (Phase 8.6)*
