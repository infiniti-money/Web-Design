-- OPTIONAL / STAGING-ONLY: index candidates from 2026-11-14 production plan.
-- NOT AUTOMATICALLY DEPLOYED: table sizes (0-16 rows) do not currently justify
-- creation. Use only after independent restore, real Employee UAT, representative
-- data-volume tests, DB planner BEFORE/AFTER, and approval of write overhead.
-- Each CREATE INDEX CONCURRENTLY statement must be run outside transactions;
-- evaluate and deploy one at a time. No indexes are created merely to quiet lints.
--
-- Current index baseline checked: customer_quotes (PK only),
-- customer_contracts (PK + contract_number unique),
-- inquiry_care_task_events (PK + task_id/created_at index).
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_customer_quotes_inquiry_id_candidate
  ON public.customer_quotes USING btree(inquiry_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_customer_contracts_quote_id_candidate
  ON public.customer_contracts USING btree(quote_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS
  idx_inquiry_care_task_events_inquiry_id_candidate
  ON public.inquiry_care_task_events USING btree(inquiry_id);
