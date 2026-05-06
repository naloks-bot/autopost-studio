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
- **Phase 8.6**: Production Safety Controls & Docs Wrap-up.
    - `facebookPublishMode` and `schedulerEnabled` switches.
    - Critical memory leak hotfix.
    - Updated ARCHITECTURE, PROJECT_STATUS, and TODO.

## In Progress
- *Stabilization and Monitoring.*

## Next Phase Candidates
1. **Facebook Live Token Setup & App Review** – Transition from developer/mock mode to production permissions.
2. **Supabase Edge Scheduler** – Server-side cron jobs for 24/7 reliability (remove client-side dependency).
3. **UX Polish / Content Workflow** – Advanced text editing and multi-image post support.
4. **Auth / Multi-User Support** – Secure team access and role management.

## Technical Debt
- Empty `src/hooks/` directory.
- Minimal unit test coverage.
- Need for automated E2E testing for the publishing flow.

## Known Limitations
- **Supabase RLS**: write operations on `posts` require `supabase-setup.sql` to be executed correctly.
- **Client-Side Scheduler**: Automation only works while the browser tab is open (until Phase 9 is implemented).
- Offline drafts are not automatically synced when connectivity is restored.

---
*Last updated on 2026‑05‑07 (Phase 8.6)*
