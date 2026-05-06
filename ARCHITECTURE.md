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

## Design Principles
- **Separation of Concerns** – Logic is decoupled from UI.
- **Fail-Safe Operations** – All async calls are wrapped in try-catch blocks with standardized return shapes.
- **Development Tracing** – Verbose logging in DEV mode for easier debugging.

---
*Generated on 2026‑05‑06*
