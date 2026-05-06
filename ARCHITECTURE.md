# Architecture Overview

## Overall Architecture
The application is a **client‑side React SPA** built with **Vite**. It communicates directly with **Supabase** (PostgreSQL + Storage + Edge Functions) via the Supabase JavaScript client. All business logic lives in the **service layer** (`src/services/`). UI components are organized under `src/pages/` and future reusable widgets will reside in `src/components/`.

## Frontend Flow
1. **App Initialization** – `main.jsx` mounts `App.jsx`.
2. **Settings Load** – Local settings are read from `localStorage` (`services/app-settings.js`). If a Supabase `app_settings` row exists, it is fetched and merged.
3. **Supabase Connection Check** – `hasSupabaseConfig` (environment variables) determines whether the app operates in **online**, **read‑only**, or **offline** mode.
4. **Data Fetching** – `fetchRemotePosts` & `fetchRemoteSettings` are called on mount (`loadAllData`). Remote data populates drafts and status UI.
5. **User Interaction** – Creating a draft, editing settings, or toggling dark mode updates local state and, when possible, syncs to Supabase.
6. **Graceful Fallback** – When Supabase is unavailable, drafts are saved locally and the UI indicates the current connection mode.

## Supabase Integration Flow
- **Environment Snapshot** – `getSupabaseEnvSnapshot` pulls the `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `.env` so the UI can display which credentials are in use.
- **CRUD Services** (`services/supabase.js`)
  - `fetchRemotePosts` – SELECT from `public.posts` (including image metadata columns).
  - `insertRemoteDraft` – INSERT a new draft row with full image metadata.
  - `updateRemotePostStatus` – UPDATE status to `posted` and set `posted_at` after successful publishing.
  - `fetchRemoteSettings` – SELECT the singleton `app_settings` row.
  - `saveRemoteSettings` – UPSERT the `app_settings` row.

## AI Generation Flow
1. **Text Generation** (`services/ai-generation.js`) – Dispatcher for OpenAI, xAI, and Mock text models.
2. **Image Generation** (`services/ai-image-generation.js`) – Specialized service for image generation (OpenAI DALL-E support).
3. **Storage Integration** (`services/storage.js`) – Handles binary uploads to Supabase Storage.
4. **End-to-End Flow**:
   - Prompt generation (AI thinks of a visual description).
   - Image generation (AI creates the image).
   - Preview (User sees the result in `CreatePage`).
   - Automated Upload (Image is mirrored to Supabase Storage bucket `generated-images`).
   - Metadata Capture (Stored URL, storage path, and provider info are attached to the draft).

## Facebook Posting Flow
1. **Service Layer** (`services/facebook.js`) – Wrapper around Facebook Graph API v23.0.
2. **Publishing Logic**:
   - **Manual Publish**: Triggered from the Status page for remote drafts.
   - **Payload Construction**: Combines `message` (content) and `link` (image_url).
   - **Response Handling**: Captures Facebook Post ID and updates Supabase `posts` table via `updateRemotePostStatus`.
3. **Status Sync**: After a successful API response, the post status is updated to `posted` and `posted_at` is recorded.

## Scheduler Strategy
1. **Service Layer** (`services/scheduler.js`) – Logic for finding due posts and coordinating multi-service tasks.
2. **Client-Side Polling**:
   - Frequency: Every 60 seconds via `setInterval` in `App.jsx`.
   - Locking: `schedulerLock` ref prevents overlapping ticks.
   - Requirement: App must be open/active in the browser.
3. **Execution Flow**: Check all remote posts → filter `status='scheduled'` and `scheduled_at <= now` → call `publishFacebookPost` → call `updateRemotePostStatus`.
4. **Visibility**: Last run results (success/failure counts) are displayed on the Status page.

## Storage Strategy
- **Supabase Storage** – Store generated images in the `generated-images` bucket; file paths are organized by date (`generated/YYYY-MM-DD/gen-<timestamp>.webp`).
- **Mirroring** – Every successfully generated image is automatically mirrored to Supabase Storage for persistence.
- **Local Fallback** – When offline or if upload fails, the UI uses the direct provider URL (OpenAI) or placeholder images.

## Folder Structure Target (Planned)
```
src/
├─ components/          # Reusable UI widgets (Buttons, Cards, Modals)
├─ constants/          # Static data (appConstants.js, enums)
├─ hooks/              # Custom React hooks (useSupabase, useScheduler)
├─ pages/              # Route‑level screens (App, Create, Settings, …)
├─ services/           # Business logic & external API wrappers
│   ├─ supabase.js      # Existing Supabase wrappers
│   ├─ ai-generation.js # Text generation dispatcher
│   ├─ ai-image-generation.js # Image generation dispatcher
│   ├─ storage.js       # Supabase Storage integration
│   ├─ facebook.js      # Facebook Graph API wrapper
│   ├─ scheduler.js     # Client-side automation logic
│   └─ scheduler.js     # Future client‑side / edge‑function glue
├─ utils/              # Helper functions (formatting, validation)
└─ index.css / main.jsx
```

## Service Layer Plan
- **Keep services thin** – each file exports a small set of pure functions.
- **Return a uniform shape** `{ data?, error?, mode }` where `mode` is `connected | read-only | offline | missing-table | mock`.

## Design Principles
- **Separation of Concerns** – UI ↔ state ↔ service.
- **Incremental Refactoring** – Introduce TypeScript typings gradually.
- **Graceful Degradation** – Every feature works offline with local storage; sync when possible.

---
*Generated on 2026‑05‑06*
