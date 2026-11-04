-- One SELECT policy per role, preserving both public reads and editorial scope.
alter policy cms_public_read on public.cms_posts to anon;
alter policy cms_editor_read on public.cms_posts using (
  (status='published' and published_at <= now())
  or (select private.cms_staff_role())='admin'
  or ((select private.cms_staff_role())='manager' and author_id=(select auth.uid()))
);
