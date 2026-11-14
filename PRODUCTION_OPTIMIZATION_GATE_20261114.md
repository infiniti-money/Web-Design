# Production rollout gate: RLS initPlan / selective FK indexes (14/11/2026)

**STATUS: REVIEW-READY / PRODUCTION HOLD.** No DDL has been run against project `mswiegltusllzvuavjdh`. Companion to [Issue #29](https://github.com/infiniti-money/Web-Design/issues/29) and `PRODUCTION_UAT_20261114.md`.

## Actual production recheck
- Supabase ACTIVE_HEALTHY, organization **Free**, PostgreSQL 17.11; **no accessible evidence of a current independently stored backup or a successful real restore**. This is *not* a claim that no external manual dump exists.
- `auth.users`: **admin 1, manager 1, employee 0**; `staff_profiles`: no active employee. An isolated five-profile CI test is **not** real-account UAT.
- Security Advisor retains 4 intended authenticated SECURITY DEFINER RPC warnings and leaked password protection disabled; private-schema tables deny public reads.
- Performance Advisor retains **8 `auth_rls_initplan` WARN, 17 unindexed FKs INFO, 6 unused indexes INFO**.
- Real DB five-sample `EXPLAIN (ANALYZE, BUFFERS)` baseline from the acceptance report: 0.159–0.258 ms execution, all buffer hits/no physical reads. These are single SQL-admin SELECTs, not a real-user RLS benchmark.
- Live policy definitions checked: 6 business READ policies and 2 notification SELECT/UPDATE policies all verify live `staff_profiles.active` and `app_metadata` (never user metadata).

## Code staged for approved maintenance
1. `supabase/rls-initplan-review.sql` — existing **eight** ALTER POLICY statements only replacing stable `auth.uid()` / `auth.jwt()` with scalar initPlans, no weaker authorization or DML. **Not in migrations**.
2. `supabase/rls-initplan-rollback.sql` — the inverse **eight** ALTER POLICY expressions reconstructed from the actual 14/11 production `pg_policies`; restores unwrapped auth checks, role guard and WITH CHECK on notifications. **Not in migrations**.
3. `supabase/index-candidates-review.sql` — **three optional index candidates** selected for sales/care access paths: `customer_quotes(inquiry_id)`, `customer_contracts(quote_id)`, `inquiry_care_task_events(inquiry_id)`. Existing coverage checked; these are **not yet demonstrated beneficial** at present low row counts. No bulk 17-index rollout.
4. `supabase/index-candidates-rollback.sql` — three corresponding DROP INDEX CONCURRENTLY commands, outside transactions.
5. `tests/rls-initplan-rollback-isolated.sql` — CI PostgreSQL 17 synthetic RLS optimization → rollback → reapply, exercising admin, manager, employee, inactive profile and mismatched JWT roles. This **does not** replace live Web/Windows UAT.

## Mandatory gates before any production execution
- [ ] Obtain a **new, verifiable, independent database backup**, including an approved recovery plan for Auth identity records, Storage files and secrets; record UTC timestamp, SHA-256 and protected location without placing PII or secrets in GitHub.
- [ ] Restore **that exact backup** to an isolated recovery environment, compare row counts/checksums + RLS/roles, test Auth/Storage and record RPO/RTO.
- [ ] Admin authorizes a genuine **employee** account, login and logout using separate browser/Windows profiles; verify denied writes by HTTP status and JWT state after revocation; confirm manager/admin behavior still works. Avoid real payments or private client data.
- [ ] Capture before/after representative traffic in a staging clone (with safe synthetic or anonymized volume), `EXPLAIN (ANALYZE, BUFFERS)`, p95 DB latency and permissions. If index candidates do not materially help the measured query path, **omit them**.
- [ ] Operator reviews schema drift against original policy expressions, schedules a maintenance window and demonstrates rollback scripts with the same backup snapshot.
- [ ] Only after all gates: apply the **eight RLS policies as a transaction** under explicit operator approval. Verify policy shapes, Admin/Manager/Employee API matrix, Advisors, and database latency. If denied access changes, rollback. Apply any approved concurrent index **individually, outside a transaction**, monitoring write overhead.
- [ ] Post-change compare `auth_rls_initplan` count (target 0 for these eight), remaining index INFO with justification, application smoke and role test. Keep warnings for deliberate authenticated SECURITY DEFINER RPCs under separate review.

**No workflow, tag, GitHub merge or file addition should automatically run these SQL files on production.** This gate is separate from the already published website/Windows versions.
