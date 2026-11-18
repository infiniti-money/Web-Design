# Glass + chat implementation — 18/11/2026

User confirmed BOTH customer chat (existing tawk.to) and internal staff chat. Also wants hover-card image zoom, full-width photographic scenes and frosted glass across public site/admin/Windows.

Baseline main 92cc44e, public v1.29.3, PC1.2.2. Current changes are uncommitted.

Implemented pending QA: public-glass.css, glassHeroes helper/static hero story wrappers, conditional article thumbnails from existing public cover; admin-glass.css + local workspace-backdrop.svg loaded on all 10 private pages. No Admin logic changed yet.

Next: build authenticated chat.html + text-only room/group messages using existing Auth and fresh session/profile guard; tawk customer tab must open the OPERATOR dashboard, never visitor widget or pretend API integration. Customer provider accounts/permissions remain at tawk.to. Add native PC safe external URL exact dashboard.tawk.to root, package route/chat navigation, version web1.30.0/PC1.3.0 and shared glass assets.

Database currently has NO chat tables (live metadata verified); private.current_staff_role reads current auth.users app_metadata + active matching staff_profiles. Sessions columns id/user_id/not_after exist. Design: private helpers/RPC implementations with auth/session/member guards, public SECURITY INVOKER wrappers with grants authenticated only; all exposed chat tables RLS. No customer data on dashboard, no actual messages sent from tests.

Backup export completed fresh under path recorded in ignored dist/chat-backup-location.json (outside Git). Docker Desktop was started; daemon29.9.2. Cached Supabase Postgres17.11.0.011 available. Must restore/compare in new --network none container (no TCP/listen, cron jobs off) BEFORE additive empty chat migration. Existing business/Auth/RLS and production data must remain intact. Backup guide has HOLD for broad financial/Auth changes; this request authorizes additive chat, not modifying old guards. Do not commit backups/logs/PII/credentials.

Supabase skill read; project mswiegltusllzvuavjdh ACTIVE_HEALTHY. Official changelog/RLS/realtime docs checked. CLI C:/Users/Admin/AppData/Local/AtelierTools/Supabase-3.0.0/supabase.exe logged in; no DB password env. CLI db dump --remote works using login role. Need migration new CLI for final filename, isolated SQL tests + advisors + production metadata-only verification. PostgreSQL client17.11 installed under AtelierTools.

Need complete public/admin/desktop QA, CI + exact deployed revision, actual Windows installer release/update metadata, source release checksum and final honest limits (no real employee UAT/physical mobile/FPS evidence). Reuse existing website/desktop auto-promote workflows; do not push docs before promotion tags finish.

Implementation completed locally: chat.html + text-only safe frontend, member-scoped live-session SQL, navigation and desktop allowlists, web1.30.0/PC1.3.0 manifests. Fresh restore59/59 COPY counts and 3 critical source hashes match. Migration applied production as20261118165744; metadata/grants/advisors checked, no business data changes. Node178pass1skip; chat3roles/desktop smoke/public responsive/motion pass. Pending exact CI/releases/deployed verification and final acceptance evidence.

Release complete: web1.30.0/PC1.3.0 tagged exact9d576f8; all CI green (browser retry after native viewport-transition abort), deployed smoke and SEO pass. See GLASS_CHAT_ACCEPTANCE_20261119.md; real-account UAT remains separate.
