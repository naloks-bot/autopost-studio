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
- **Phase 5**: AI Text Generation Integration.
    - Isolated service `ai-generation.js`.
    - OpenAI and xAI real API fetch implementations.
    - Hybrid mock/real dispatcher with provider routing.
    - Form validation and error state handling in `CreatePage`.

## In Progress
- UI polish for the dashboard layout (split‑screen, scrollable sections) – see recent UI optimizations.
- Ongoing refactoring of constants and service abstractions.

## Next Phase
1. **Phase 6: Image Generation & Storage** – implement real image generation (OpenAI DALL-E or similar) and store results in Supabase Storage.
2. **Facebook Posting Flow** – add `services/facebook.js` wrapper around Graph API to publish posts.
3. **Scheduler Integration** – implement client-side or edge-function based publishing.
4. **TypeScript Migration** – introduce TS for better maintainability.

## Future Features
- Multi‑account support (multiple Facebook pages).
- Post analytics dashboard (impressions, engagements via Facebook Insights).
- Bulk draft import/export (CSV/JSON).
- Internationalization (i18n) for Thai and English UI.
- Role‑based access control for team collaboration.

## Technical Debt
- No TypeScript typings – all files are plain JavaScript.
- Empty `src/components/` and `src/hooks/` directories – placeholders need actual utilities.
- Minimal unit test coverage – only manual testing performed.
- Direct inline styles mixed with Tailwind utilities in some components.
- Environment variables are read from `.env` but not validated at runtime.

## Bugs / Known Issues
- **Supabase RLS**: write operations on `posts` are blocked until proper policies are applied.
- **Missing tables**: `app_settings` and `posts` may not exist until `supabase-setup.sql` is run.
- **AI Image Generation** is currently mock-only (text prompts are generated, but no real image API call is made).
- **Facebook integration** is currently only UI placeholders – no actual posting.
- Offline drafts are not automatically synced when connectivity is restored.
- Dark mode gradient background may cause performance issues on low‑end devices.
- Some UI text strings are hard‑coded in Thai only.

---
*Generated on 2026‑05‑06*
