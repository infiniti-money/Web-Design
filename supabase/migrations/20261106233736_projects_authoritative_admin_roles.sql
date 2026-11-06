-- Policy-only patch: no table, grant, account or business-row changes.
-- current_staff_role checks live Auth app_metadata + matching active staff profile.
do $$ begin
  if to_regprocedure('private.current_staff_role()') is null then
    raise exception 'Missing authoritative role helper';
  end if;
  if not exists(select 1 from pg_class where oid='public.projects'::regclass and relrowsecurity) then
    raise exception 'Projects RLS must already be enabled';
  end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename='projects')<>4
    or (select count(*) from pg_policies where schemaname='public' and tablename='projects'
      and policyname in ('admins add projects','admins edit projects','admins remove projects','public can read published projects'))<>4 then
    raise exception 'Unexpected projects policies; review before applying';
  end if;
  if not exists(select 1 from public.staff_profiles sp join auth.users u on u.id=sp.user_id
    where sp.active and sp.role='admin' and u.raw_app_meta_data->>'role'='admin') then
    raise exception 'No active authoritative Admin';
  end if;
end $$;

-- Anonymous reads never evaluate the private role helper or staff directory.
alter policy "public can read published projects" on public.projects
  to anon using (published);
create policy projects_authenticated_read on public.projects for select to authenticated
  using (published or (select private.current_staff_role())='admin');
alter policy "admins add projects" on public.projects
  with check ((select private.current_staff_role())='admin');
alter policy "admins edit projects" on public.projects
  using ((select private.current_staff_role())='admin')
  with check ((select private.current_staff_role())='admin');
alter policy "admins remove projects" on public.projects
  using ((select private.current_staff_role())='admin');
