-- Only synthetic accounts/projects; every write is rolled back. No Auth login or email.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
('d0a00000-0000-4000-8000-000000000081','authenticated','authenticated','project-admin@example.invalid','{"role":"admin"}'),
('d0a00000-0000-4000-8000-000000000082','authenticated','authenticated','project-manager@example.invalid','{"role":"manager"}'),
('d0a00000-0000-4000-8000-000000000083','authenticated','authenticated','project-employee@example.invalid','{"role":"employee"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values
('d0a00000-0000-4000-8000-000000000081','project-admin@example.invalid','Project Admin','admin',true),
('d0a00000-0000-4000-8000-000000000082','project-manager@example.invalid','Project Manager','manager',true),
('d0a00000-0000-4000-8000-000000000083','project-employee@example.invalid','Project Employee','employee',true);
insert into public.projects(id,slug,title,category,image_url,published) values
('d0c00000-0000-4000-8000-000000000081','projects-public-fixture','PROJECT PUBLIC FIXTURE','apartment','https://example.invalid/pub.jpg',true),
('d0c00000-0000-4000-8000-000000000082','projects-draft-fixture','PROJECT DRAFT FIXTURE','apartment','https://example.invalid/draft.jpg',false);
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 if (select count(*) from public.projects where id in ('d0c00000-0000-4000-8000-000000000081','d0c00000-0000-4000-8000-000000000082'))<>1 then raise exception 'ANON_SCOPE';end if;
 begin perform 1 from public.staff_profiles limit 1;raise exception 'STAFF_EXPOSED';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000082","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
 if exists(select 1 from public.projects where id='d0c00000-0000-4000-8000-000000000082') then raise exception 'MANAGER_DRAFT'; end if;
 update public.projects set title='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'MANAGER_UPDATE';end if;
 delete from public.projects where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'MANAGER_DELETE';end if;
 begin
  insert into public.projects(slug,title,category,image_url) values('projects-denied-fixture','DENIED','apartment','https://example.invalid/a.jpg');
  raise exception 'MANAGER_INSERT';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000083","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if exists(select 1 from public.projects where id='d0c00000-0000-4000-8000-000000000082') then raise exception 'FORGED_EMPLOYEE_DRAFT'; end if;
 update public.projects set title='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'FORGED_EMPLOYEE_UPDATE';end if;
 delete from public.projects where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'FORGED_EMPLOYEE_DELETE';end if;
 begin
  insert into public.projects(slug,title,category,image_url) values('projects-denied-fixture','DENIED','apartment','https://example.invalid/a.jpg');
  raise exception 'FORGED_EMPLOYEE_INSERT';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000089","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if exists(select 1 from public.projects where id='d0c00000-0000-4000-8000-000000000082') then raise exception 'MISSING_USER_DRAFT'; end if;
 update public.projects set title='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'MISSING_USER_UPDATE';end if;
 delete from public.projects where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'MISSING_USER_DELETE';end if;
 begin
  insert into public.projects(slug,title,category,image_url) values('projects-denied-fixture','DENIED','apartment','https://example.invalid/a.jpg');
  raise exception 'MISSING_USER_INSERT';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000081","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if (select count(*) from public.projects where id in ('d0c00000-0000-4000-8000-000000000081','d0c00000-0000-4000-8000-000000000082'))<>2 then raise exception 'ADMIN_READ';end if;
 update public.projects set title='PROJECT ADMIN UPDATED' where id='d0c00000-0000-4000-8000-000000000082';if not found then raise exception 'ADMIN_UPDATE';end if;
 insert into public.projects(slug,title,category,image_url) values('projects-admin-insert-fixture','INSERT FIXTURE','house','https://example.invalid/a.jpg');
 delete from public.projects where slug='projects-admin-insert-fixture';if not found then raise exception 'ADMIN_DELETE';end if;
end $$;
reset role;
update auth.users set raw_app_meta_data='{"role":"disabled"}' where id='d0a00000-0000-4000-8000-000000000081';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.projects where id='d0c00000-0000-4000-8000-000000000082') then raise exception 'REVOKED_AUTH_DRAFT'; end if;
 update public.projects set title='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'REVOKED_AUTH_UPDATE';end if;
 delete from public.projects where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'REVOKED_AUTH_DELETE';end if;
 begin
  insert into public.projects(slug,title,category,image_url) values('projects-denied-fixture','DENIED','apartment','https://example.invalid/a.jpg');
  raise exception 'REVOKED_AUTH_INSERT';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
update auth.users set raw_app_meta_data='{"role":"admin"}' where id='d0a00000-0000-4000-8000-000000000081';
update public.staff_profiles set active=false where user_id='d0a00000-0000-4000-8000-000000000081';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.projects where id='d0c00000-0000-4000-8000-000000000082') then raise exception 'INACTIVE_PROFILE_DRAFT'; end if;
 update public.projects set title='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'INACTIVE_PROFILE_UPDATE';end if;
 delete from public.projects where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'INACTIVE_PROFILE_DELETE';end if;
 begin
  insert into public.projects(slug,title,category,image_url) values('projects-denied-fixture','DENIED','apartment','https://example.invalid/a.jpg');
  raise exception 'INACTIVE_PROFILE_INSERT';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.staff_profiles set active=true where user_id='d0a00000-0000-4000-8000-000000000081';
update auth.users set raw_app_meta_data='{"role":"manager"}' where id='d0a00000-0000-4000-8000-000000000081';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.projects where id='d0c00000-0000-4000-8000-000000000082') then raise exception 'MISMATCHED_PROFILE_DRAFT'; end if;
 update public.projects set title='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'MISMATCHED_PROFILE_UPDATE';end if;
 delete from public.projects where id='d0c00000-0000-4000-8000-000000000081';if found then raise exception 'MISMATCHED_PROFILE_DELETE';end if;
 begin
  insert into public.projects(slug,title,category,image_url) values('projects-denied-fixture','DENIED','apartment','https://example.invalid/a.jpg');
  raise exception 'MISMATCHED_PROFILE_INSERT';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: anon published only; staff private; active Admin CRUD; stale/forged/inactive/mismatched roles denied; fixtures rolled back' as result;
rollback;
