-- ONLY for a fresh, isolated PostgreSQL CI database. Never production.
\set ON_ERROR_STOP on
do $$ begin
  if current_database()<>'quote_guard_test' or to_regclass('auth.users') is not null
    or to_regclass('public.projects') is not null then
    raise exception 'Expected fresh isolated CI database';
  end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select nullif(current_setting('request.jwt.claims',true),'')::jsonb
$$;
grant usage on schema auth to anon,authenticated;
create table auth.users(id uuid primary key,aud text,role text,email text,raw_app_meta_data jsonb);
create table public.staff_profiles(user_id uuid primary key references auth.users(id),email text,full_name text,role text,active boolean);
create function private.current_staff_role() returns text language sql stable security definer set search_path='' as $$
  select sp.role from public.staff_profiles sp join auth.users u on u.id=sp.user_id
  where sp.user_id=auth.uid() and sp.active and sp.role=u.raw_app_meta_data->>'role' limit 1
$$;
revoke all on function private.current_staff_role() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_staff_role() to authenticated;
\ir ../supabase/schema.sql
insert into auth.users(id,raw_app_meta_data) values('d0a00000-0000-4000-8000-000000000080','{"role":"admin"}');
insert into public.staff_profiles(user_id,role,active) values('d0a00000-0000-4000-8000-000000000080','admin',true);
\ir ../supabase/migrations/20261106233736_projects_authoritative_admin_roles.sql
\ir projects-authoritative-rls-rollback.sql
do $$ begin
  if exists(select 1 from public.projects where slug like 'projects-%-fixture')
    or exists(select 1 from auth.users where email like 'project-%@example.invalid') then
    raise exception 'Rollback fixtures left behind';
  end if;
end $$;
select 'PASS: real project migration + authoritative-role regression on isolated PostgreSQL' as result;
