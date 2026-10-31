-- Admin RLS regression test (run in Supabase SQL Editor with admin rights).
-- Uses the already verified admin's UUID and a synthetic test row.
-- All writes are inside ROLLBACK; no production project is changed.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a2a90606-f29d-4666-9491-9e1aceb4bd1c","role":"authenticated","app_metadata":{"role":"admin"}}',
  true
);
do $admin$
declare v_id uuid; n integer;
begin
  insert into public.projects(slug,title,category,image_url,published)
  values ('rbac-test-do-not-keep','ATELIER TEST','apartment','https://example.com/test.jpg',false)
  returning id into v_id;
  if v_id is null then raise exception 'ADMIN_INSERT_FAILED'; end if;
  update public.projects set title='ATELIER TEST EDIT' where id=v_id;
  select count(*) into n from public.projects where id=v_id and title='ATELIER TEST EDIT';
  if n<>1 then raise exception 'ADMIN_UPDATE_FAILED'; end if;
  delete from public.projects where id=v_id;
  select count(*) into n from public.projects where id=v_id;
  if n<>0 then raise exception 'ADMIN_DELETE_FAILED'; end if;
end $admin$;
rollback;

-- Non-admin JWT must NOT insert.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","app_metadata":{"role":"user"}}',
  true
);
do $guest$
declare denied boolean:=false;
begin
  begin
    insert into public.projects(slug,title,category,image_url,published)
    values ('rbac-nonadmin-must-fail','UNAUTHORIZED TEST','apartment','https://example.com/test.jpg',false);
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'UNAUTHORIZED_INSERT_WAS_ACCEPTED'; end if;
end $guest$;
rollback;

select count(*)::integer as leftover
from public.projects
where slug in ('rbac-test-do-not-keep','rbac-nonadmin-must-fail');
-- Expected leftover = 0.
-- These SQL tests simulate database JWT claims. They do NOT sign in to Supabase Auth.
