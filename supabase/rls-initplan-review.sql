-- Prepared performance review, not automatically applied on the live project.
-- Current 2026-11-14 pg_policies expressions: only wrap stable auth functions
-- in scalar SELECT initplans. No GRANT, role change, RLS disable, data mutation.
-- Before production use: fresh backup, isolated role regression and rollback evidence.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
BEGIN;
ALTER POLICY care_workflow_read ON public.care_workflow USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=(select auth.uid()) AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY care_workflow_events_read ON public.care_workflow_events USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=(select auth.uid()) AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY quotes_staff_read ON public.customer_quotes USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=(select auth.uid()) AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY quote_versions_staff_read ON public.customer_quote_versions USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=(select auth.uid()) AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY contracts_staff_read ON public.customer_contracts USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=(select auth.uid()) AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY commercial_audit_read ON public.commercial_audit USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=(select auth.uid()) AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY staff_notification_read ON public.staff_notifications
 USING (recipient_id=(select auth.uid()) AND EXISTS (
 SELECT 1 FROM public.staff_profiles sp
 WHERE sp.user_id=(select auth.uid()) AND sp.active
   AND sp.role=((select auth.jwt())->'app_metadata'->>'role')
));
ALTER POLICY staff_notification_mark_read ON public.staff_notifications
 USING (recipient_id=(select auth.uid()) AND EXISTS (
 SELECT 1 FROM public.staff_profiles sp
 WHERE sp.user_id=(select auth.uid()) AND sp.active
   AND sp.role=((select auth.jwt())->'app_metadata'->>'role')
))
 WITH CHECK (recipient_id=(select auth.uid()));
COMMIT;

-- If rollback is required (after review), restore exactly the previous
-- expressions from pg_policies under an approved maintenance process.
-- Leaving this file out of supabase/migrations is intentional: no auto-deploy.
