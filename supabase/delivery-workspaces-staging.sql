-- PROPOSAL / STAGING ONLY. DO NOT run on production until UAT + restorable backup.
-- When approved, generate a timestamped migration with Supabase CLI and reconcile migration history.
-- Separate private delivery operations from public portfolio projects.
BEGIN;
CREATE TABLE IF NOT EXISTS public.delivery_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE, -- honor existing 12-month CRM retention
  portfolio_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  stage text NOT NULL DEFAULT 'planning'
    CHECK(stage IN ('planning','design','procurement','construction','handover','done','paused')),
  owner_user_id uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
  due_at timestamptz,
  details text NOT NULL DEFAULT '' CHECK(char_length(details)<=2000),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delivery_workspaces_inquiry_due
  ON public.delivery_workspaces(inquiry_id,stage,due_at);
CREATE INDEX IF NOT EXISTS delivery_workspaces_owner_due
  ON public.delivery_workspaces(owner_user_id,due_at);

CREATE OR REPLACE FUNCTION private.delivery_version_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $guard$
BEGIN
  IF new.id IS DISTINCT FROM old.id
    OR new.inquiry_id IS DISTINCT FROM old.inquiry_id
    OR new.created_by IS DISTINCT FROM old.created_by
    OR new.created_at IS DISTINCT FROM old.created_at
    OR new.version IS DISTINCT FROM old.version THEN
    RAISE EXCEPTION 'DELIVERY_IDENTITY_OR_VERSION_CHANGED' USING ERRCODE='23514';
  END IF;
  new.version:=old.version+1;
  new.updated_at:=now();
  RETURN new;
END;
$guard$;
REVOKE ALL ON FUNCTION private.delivery_version_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS delivery_workspace_version_guard ON public.delivery_workspaces;
CREATE TRIGGER delivery_workspace_version_guard
BEFORE UPDATE ON public.delivery_workspaces
FOR EACH ROW EXECUTE FUNCTION private.delivery_version_guard();

CREATE TABLE IF NOT EXISTS public.delivery_catalog_links (
  workspace_id uuid NOT NULL REFERENCES public.delivery_workspaces(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK(quantity>0 AND quantity<=1000000),
  note text NOT NULL DEFAULT '' CHECK(char_length(note)<=500),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,catalog_item_id)
);
CREATE TABLE IF NOT EXISTS public.delivery_task_links (
  workspace_id uuid NOT NULL REFERENCES public.delivery_workspaces(id) ON DELETE CASCADE,
  task_id uuid NOT NULL UNIQUE REFERENCES public.inquiry_care_tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,task_id)
);

ALTER TABLE public.delivery_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_catalog_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_task_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_workspaces, public.delivery_catalog_links, public.delivery_task_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_workspaces, public.delivery_catalog_links, public.delivery_task_links TO authenticated;

DROP POLICY IF EXISTS delivery_workspace_staff_read ON public.delivery_workspaces;
CREATE POLICY delivery_workspace_staff_read ON public.delivery_workspaces
  FOR SELECT TO authenticated USING ((SELECT private.current_staff_role()) IN ('admin','manager'));
DROP POLICY IF EXISTS delivery_workspace_staff_insert ON public.delivery_workspaces;
CREATE POLICY delivery_workspace_staff_insert ON public.delivery_workspaces
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT private.current_staff_role()) IN ('admin','manager')
    AND created_by=(SELECT auth.uid())
    AND (owner_user_id IS NULL OR EXISTS
        (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=owner_user_id AND sp.active))
  );
DROP POLICY IF EXISTS delivery_workspace_staff_update ON public.delivery_workspaces;
CREATE POLICY delivery_workspace_staff_update ON public.delivery_workspaces
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_staff_role()) IN ('admin','manager'))
  WITH CHECK ((SELECT private.current_staff_role()) IN ('admin','manager')
    AND (owner_user_id IS NULL OR EXISTS
        (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=owner_user_id AND sp.active)));
DROP POLICY IF EXISTS delivery_workspace_staff_delete ON public.delivery_workspaces;
CREATE POLICY delivery_workspace_staff_delete ON public.delivery_workspaces
  FOR DELETE TO authenticated USING ((SELECT private.current_staff_role())='admin');

DROP POLICY IF EXISTS delivery_catalog_staff_read ON public.delivery_catalog_links;
CREATE POLICY delivery_catalog_staff_read ON public.delivery_catalog_links
  FOR SELECT TO authenticated USING ((SELECT private.current_staff_role()) IN ('admin','manager'));
DROP POLICY IF EXISTS delivery_catalog_staff_insert ON public.delivery_catalog_links;
CREATE POLICY delivery_catalog_staff_insert ON public.delivery_catalog_links
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT private.current_staff_role()) IN ('admin','manager')
    AND EXISTS (SELECT 1 FROM public.catalog_items i WHERE i.id=catalog_item_id AND i.published)
  );
DROP POLICY IF EXISTS delivery_catalog_staff_update ON public.delivery_catalog_links;
CREATE POLICY delivery_catalog_staff_update ON public.delivery_catalog_links
  FOR UPDATE TO authenticated
  USING ((SELECT private.current_staff_role()) IN ('admin','manager'))
  WITH CHECK ((SELECT private.current_staff_role()) IN ('admin','manager')
    AND EXISTS (SELECT 1 FROM public.catalog_items i WHERE i.id=catalog_item_id AND i.published));
DROP POLICY IF EXISTS delivery_catalog_staff_delete ON public.delivery_catalog_links;
CREATE POLICY delivery_catalog_staff_delete ON public.delivery_catalog_links
  FOR DELETE TO authenticated USING ((SELECT private.current_staff_role()) IN ('admin','manager'));

DROP POLICY IF EXISTS delivery_task_staff_read ON public.delivery_task_links;
CREATE POLICY delivery_task_staff_read ON public.delivery_task_links
  FOR SELECT TO authenticated USING ((SELECT private.current_staff_role()) IN ('admin','manager'));
DROP POLICY IF EXISTS delivery_task_staff_insert ON public.delivery_task_links;
CREATE POLICY delivery_task_staff_insert ON public.delivery_task_links
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT private.current_staff_role()) IN ('admin','manager')
    AND EXISTS (
      SELECT 1 FROM public.delivery_workspaces w
      JOIN public.inquiry_care_tasks t ON t.inquiry_id=w.inquiry_id
      WHERE w.id=workspace_id AND t.id=task_id
    )
  );
DROP POLICY IF EXISTS delivery_task_staff_delete ON public.delivery_task_links;
CREATE POLICY delivery_task_staff_delete ON public.delivery_task_links
  FOR DELETE TO authenticated USING ((SELECT private.current_staff_role()) IN ('admin','manager'));
-- No UPDATE policy: unlink and relink to preserve scoped consistency.
COMMIT;
