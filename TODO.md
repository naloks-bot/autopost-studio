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
- **Phase 10A**: App Shell + Sidebar UI Restructure.
    - Implemented left sidebar navigation.
    - Added compact status header with connectivity chips.
    - Optimized layout for independent content scrolling.

## In Progress
- Production environment verification (secrets setup).

## Next Phase Candidates
1. **Phase 10: Multi-Account Support** – Manage multiple Facebook pages.
2. **Facebook Live Token Setup & App Review** – Transition from developer/mock mode.
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
