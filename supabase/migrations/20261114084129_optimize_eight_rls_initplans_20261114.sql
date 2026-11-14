-- ATELIER HOME: recorded production migration 20261114084129.
-- Applied to Supabase project mswiegltusllzvuavjdh on 2026-11-14.
-- Safe syntactic initPlan optimization only; no RLS disable, role grants or data writes.
-- See supabase/rls-initplan-rollback.sql for original expressions and
-- PRODUCTION_RLS_POSTDEPLOY_20261114.md for validation and outstanding UAT gates.
-- Backend migration mechanism wraps migration in its own transaction.
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
