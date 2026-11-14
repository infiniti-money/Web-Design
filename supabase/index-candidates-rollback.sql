-- OPTIONAL rollback for ONLY the three candidate indexes above.
-- REVIEW-ONLY, not a production migration. Run individually, outside BEGIN/COMMIT.
-- First verify no dependent queries now require these indexes.
DROP INDEX CONCURRENTLY IF EXISTS public.idx_customer_quotes_inquiry_id_candidate;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_customer_contracts_quote_id_candidate;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_inquiry_care_task_events_inquiry_id_candidate;
