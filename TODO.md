# TODO List

## Completed
- Core SPA setup with React 19, Vite 7, and Tailwind CSS 4.
- Dark/Light theme toggle with gradient backgrounds.
- Settings persistence via `services/app-settings.js` and Supabase sync.
- Draft creation, local storage fallback, and remote draft insertion.
- Status page showing remote and local drafts.
- AI Text Generation Integration (OpenAI & xAI).
- Image Generation Flow (DALL-E + Supabase Storage Mirroring).
- Facebook Publishing Foundation (Immediate & Scheduled).
- Client-Side Scheduler (60s background polling).
- **Phase 8**: Production Hardening & QA Pass.
- **Phase 8.5**: Production Deployment Preparation.
    - README and environment documentation.
    - Versioning and build metadata.
    - Deployment checklist.

## In Progress
- Final UI polish for dashboard layout.

## Next Phase
1. **Phase 9: Supabase Edge Scheduler** – Server-side cron jobs for 24/7 reliability.
2. **Phase 10: Multi-Account Support** – Manage multiple Facebook pages.
3. **Phase 11: TypeScript Migration** – Better type safety.

## Technical Debt
- Empty `src/components/` and `src/hooks/` directories.
- Minimal unit test coverage.
- Environment variables validation at runtime.

## Bugs / Known Issues
- **Supabase RLS**: write operations on `posts` are blocked until proper policies are applied.
- **Client-Side Scheduler**: Automation only works while the browser tab is open.
- Offline drafts are not automatically synced when connectivity is restored.

---
*Generated on 2026‑05‑06*
