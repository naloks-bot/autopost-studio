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
  - `fetchRemotePosts` – SELECT from `public.posts` (including new image metadata columns).
  - `insertRemoteDraft` – INSERT a new draft row with full image metadata (`image_provider`, `image_revised_prompt`, `image_storage_path`, `image_storage_mode`).
  - `fetchRemoteSettings` – SELECT the singleton `app_settings` row.
  - `saveRemoteSettings` – UPSERT the `app_settings` row.
- **Row‑Level Security** – Policies defined in `supabase-setup.sql` allow **anonymous** users to read/write the tables when the project is in development mode. Production will tighten these policies.

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
5. **Fallback Strategy**: If Supabase Storage is offline or misconfigured, the app retains the original provider URL to ensure the image remains visible in the current session.

## Future Facebook Posting Flow
- **Access Token Management** – Use the stored `facebookPageAccessToken` and `facebookPageId` from settings.
- **Graph API Wrapper** (`services/facebook.js`)
  - `publishPost` – POST to `/{page-id}/feed` with `message` and `attached_media` (image URL).
  - `schedulePost` – POST to `/{page-id}/feed` with `published=false` and `scheduled_publish_time`.
- **Status Update** – After a successful publish, update the corresponding `posts` row (`status='posted'`, `posted_at=now()`).

## Scheduler Strategy
- **Client‑Side Polling** (simple MVP) – Periodic `setInterval` that checks drafts with a future `scheduled_at` and triggers `publishPost`.
- **Supabase Edge Functions / Cron** – For a production‑grade solution, move the scheduler to an Edge Function triggered by a scheduled job (free tier provides up to 5 million invocations per month).
- **Future Queue** – Consider integrating a lightweight queue (e.g., Supabase Realtime + Postgres `pg_notify`) to decouple scheduling from the UI.

## Storage Strategy
- **Supabase Storage** – Store generated images in the `generated-images` bucket; file paths are organized by date (`generated/YYYY-MM-DD/gen-<timestamp>.webp`).
- **Mirroring** – Every successfully generated image is automatically mirrored to Supabase Storage for persistence.
- **Local Fallback** – When offline or if upload fails, the UI uses the direct provider URL (OpenAI) or placeholder images.
- **Cost‑Effective** – Keep image size under 1 MB and purge files older than 30 days via a scheduled cleanup function.

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
│   ├─ facebook.js      # Future Graph API wrapper
│   └─ scheduler.js     # Future client‑side / edge‑function glue
├─ utils/              # Helper functions (formatting, validation)
└─ index.css / main.jsx
```

## Service Layer Plan
- **Keep services thin** – each file exports a small set of pure functions.
- **Return a uniform shape** `{ data?, error?, mode }` where `mode` is `connected | read-only | offline | missing-table`.
- **Add unit tests** (Jest) for each service to guarantee behaviour when Supabase is unavailable.

## Design Principles
- **Separation of Concerns** – UI ↔ state ↔ service.
- **Incremental Refactoring** – Introduce TypeScript typings gradually.
- **Graceful Degradation** – Every feature works offline with local storage; sync when possible.
- **Accessibility & Dark‑Mode** – Already present, continue to respect WCAG contrast ratios.

## Cost Optimization Strategy
- **Free‑Tier Supabase** – Limit reads/writes; batch inserts for drafts.
- **Cache API Responses** – Store generated content locally for 5 minutes to avoid duplicate AI calls.
- **Image Compression** – Use `image/webp` when storing generated images.
- **Monitor Usage** – Add a small dashboard widget showing API call counts.

## Deployment Strategy (Free‑Tier Focused)
1. **Static Hosting** – Deploy the Vite build to **Vercel**, **Netlify**, or **GitHub Pages** (all free tiers).
2. **Supabase Project** – Use the free tier (500 MB storage, 2 M rows, 500 k requests/month).
3. **Environment Variables** – Store keys in the hosting platform’s secret manager; keep `.env` out of the repo.
4. **CI/CD** – Simple GitHub Actions that run `npm run build && npm run preview` on PRs.
5. **Monitoring** – Enable Supabase’s built‑in logs; add a lightweight client‑side error reporter.

---
*Generated on 2026‑05‑06*
