# TODO List

## Completed
- Core SPA setup with React 19, Vite 7, and Tailwind CSS 4.
- Dark/Light theme toggle with gradient backgrounds.
- Settings persistence via `services/app-settings.js` (localStorage) and Supabase sync.
- Draft creation, local storage fallback, and remote draft insertion (`services/supabase.js`).
- Status page showing remote and local drafts, with connection mode indicators.
- Guide page with step‑by‑step onboarding instructions.
- Basic Supabase schema (`supabase-setup.sql`) and RLS policies for development.
- Graceful offline/read‑only handling when Supabase is unavailable.
- **Phase 4**: Extraction of reusable UI components (`Header`, `StatusCard`, `SectionCard`, `TabButton`, `ActionButton`).
- **Phase 5**: AI Text Generation Integration (OpenAI & xAI).
- **Phase 6A**: Image Generation Flow MVP.
- **Phase 6B**: Supabase Image Metadata Persistence.
- **Phase 7A**: Facebook Publishing Foundation.
- **Phase 7B**: Scheduler & Automation Foundation.
    - Background polling logic (60s intervals) in `App.jsx`.
    - Automatic publication of due scheduled drafts via `scheduler.js`.
    - Enhanced StatusPage with scheduler summary and timestamps.

## In Progress
- UI polish for the dashboard layout (split‑screen, scrollable sections).
- Ongoing refactoring of constants and service abstractions.

## Next Phase
1. **Phase 8: Multi-Account & Analytics** – Support for multiple Facebook pages and basic post performance tracking.
2. **Phase 9: Supabase Edge Scheduler** – 24/7 automation via Edge Functions.
3. **TypeScript Migration** – introduce TS for better maintainability.

## Future Features
- Multi‑account support (multiple Facebook pages).
- Post analytics dashboard (impressions, engagements via Facebook Insights).
- Bulk draft import/export (CSV/JSON).
- Internationalization (i18n) for Thai and English UI.

## Technical Debt
- No TypeScript typings – all files are plain JavaScript.
- Empty `src/components/` and `src/hooks/` directories.
- Minimal unit test coverage.
- Environment variables are read from `.env` but not validated at runtime.

## Bugs / Known Issues
- **Supabase RLS**: write operations on `posts` are blocked until proper policies are applied.
- **Missing tables**: `app_settings` and `posts` may not exist until `supabase-setup.sql` is run.
- **Supabase Storage**: Bucket `generated-images` must exist and be public (or have correct RLS policies) for mirroring to work.
- **Client-Side Scheduler**: Automation only works while the browser tab is open and active.
- Offline drafts are not automatically synced when connectivity is restored.

---
*Generated on 2026‑05‑06*
