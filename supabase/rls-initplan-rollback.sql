-- Restore the eight production RLS expressions observed 2026-11-14.
-- REVIEW-ONLY. Keep outside supabase/migrations; do NOT run without a
-- verified independent production backup, isolated restore and real role UAT.
-- This rollback ONLY reverses auth initPlan wrapping. It does not touch grants,
-- employee profiles, RLS enablement, business records, or unrelated policies.
BEGIN;
ALTER POLICY care_workflow_read ON public.care_workflow USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY care_workflow_events_read ON public.care_workflow_events USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY quotes_staff_read ON public.customer_quotes USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY quote_versions_staff_read ON public.customer_quote_versions USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY contracts_staff_read ON public.customer_contracts USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY commercial_audit_read ON public.commercial_audit USING (EXISTS (
 SELECT 1 FROM public.staff_profiles s
 WHERE s.user_id=auth.uid() AND s.active
   AND s.role IN ('admin','manager')
   AND s.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY staff_notification_read ON public.staff_notifications
 USING (recipient_id=auth.uid() AND EXISTS (
 SELECT 1 FROM public.staff_profiles sp
 WHERE sp.user_id=auth.uid() AND sp.active
   AND sp.role=(auth.jwt()->'app_metadata'->>'role')
));
ALTER POLICY staff_notification_mark_read ON public.staff_notifications
 USING (recipient_id=auth.uid() AND EXISTS (
 SELECT 1 FROM public.staff_profiles sp
 WHERE sp.user_id=auth.uid() AND sp.active
   AND sp.role=(auth.jwt()->'app_metadata'->>'role')
)) WITH CHECK (recipient_id=auth.uid());
COMMIT;
