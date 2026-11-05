# Supabase deployment audit — 05/11/2026

## Completed: additive delivery schema on existing production

Target Supabase project: `mswiegltusllzvuavjdh` (`atelier-home-web-design`). No new Supabase project/database was created.

The repository owner directly requested applying the new delivery functionality to real Supabase, and the additive migration succeeded.

- Supabase migration version: `20261105082144`
- Migration name: `delivery_workspaces_crm_catalog_20261105`
- Recorded source: `supabase/migrations/20261105082144_delivery_workspaces_crm_catalog_20261105.sql`
- New tables: `public.delivery_workspaces`, `public.delivery_catalog_links`, `public.delivery_task_links`
- RLS active on all three tables; table SELECT to `anon` is not granted. Authenticated requests must pass RLS that resolves the active live role.
- Enabled trigger: `delivery_workspace_version_guard` (prevents changing immutable identity and increments version on UPDATE).
- All new tables were empty directly after deployment; no actual client, project, material or task records were seeded.

### Postflight data reconciliation

| Existing entity | Before | After |
| --- | ---: | ---: |
| CRM inquiries | 2 | 2 |
| CRM tasks | 2 | 2 |
| Catalog items | 1 | 1 |
| Public portfolio projects | 6 | 6 |

Read-only PostgreSQL introspection verified 11 policies total across the new tables: 4 on workspaces, 4 on catalog links, 3 on task links. Security Advisor retained the previous notices: four callable SECURITY DEFINER RPC functions, leaked-password protection disabled, and one informational RLS/no-policy note for the private rate-limit table. New tables did not introduce any additional Advisor security notice at the time checked.

### CI evidence

- [Delivery RLS PostgreSQL 17](https://github.com/infiniti-money/Web-Design/actions/runs/41993606639): PASS.
- [Synthetic dump/restore with quoted version lock](https://github.com/infiniti-money/Web-Design/actions/runs/41993606637): PASS.
- [Node/static, Chromium fixtures and quote history regression](https://github.com/infiniti-money/Web-Design/actions/runs/41993606714): PASS.

### Still BLOCKED (do not claim UAT/backup passed)

- Actual production backup, checksum, isolated restore including Auth identities/config and Storage objects have NOT been verified. Synthetic dump/restore is **not** a production backup. The owner explicitly requested the additive schema operation before this separate gate; the missing recovery evidence remains an operational risk.
- No live Auth UAT with Admin/Manager/Employee sessions; there is no active Employee profile in current production read-only metadata.
- The quote-history immutability migration `20261105093000_quote_version_immutability.sql` remains unapplied to production and is prohibited until its backup/restore/UAT gate passes.
- The web delivery UI remains on draft [PR #26](https://github.com/infiniti-money/Web-Design/pull/26) and is not deployed to Pages until the release criteria are met. No CRM/CMS/contract records, Auth accounts, mail notifications, secrets or existing RLS policies were changed by this additive schema operation.

### Reconciliation for future environments

The production migration is now in Supabase migration history. Do not manually re-run `supabase/delivery-workspaces-staging.sql` against production or attempt a blanket `db push` before reconciling older historical migrations that were previously applied outside this repository. For a new isolated instance, use the canonical versioned file in `supabase/migrations` and test permissions/retention first. Do not remove the tables or data in a rollback without an inventory and approved recovery plan.

Related: [UAT_ACCEPTANCE_20261105.md](UAT_ACCEPTANCE_20261105.md), [QUOTE_VERSION_GUARD_ROLLOUT.md](QUOTE_VERSION_GUARD_ROLLOUT.md).
