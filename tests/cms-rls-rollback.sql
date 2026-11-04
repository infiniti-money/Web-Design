-- Synthetic fixtures only. Every write, including Auth fixtures, is rolled back.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data)
values
('d0a00000-0000-4000-8000-000000000001','authenticated','authenticated','cms-admin@example.invalid','{"role":"admin"}'),
('d0a00000-0000-4000-8000-000000000002','authenticated','authenticated','cms-manager@example.invalid','{"role":"manager"}'),
('d0a00000-0000-4000-8000-000000000003','authenticated','authenticated','cms-employee@example.invalid','{"role":"employee"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values
('d0a00000-0000-4000-8000-000000000001','cms-admin@example.invalid','CMS test admin','admin',true),
('d0a00000-0000-4000-8000-000000000002','cms-manager@example.invalid','CMS test manager','manager',true),
('d0a00000-0000-4000-8000-000000000003','cms-employee@example.invalid','CMS test employee','employee',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}',true);
insert into public.cms_posts(id,slug,title,excerpt,body_markdown,status) values
('d0b00000-0000-4000-8000-000000000001','cms-rollback-published','CMS ROLLBACK TEST',repeat('Mô tả kiểm thử. ',4),repeat('Nội dung kiểm thử. ',8),'published'),
('d0b00000-0000-4000-8000-000000000002','cms-rollback-draft','CMS ROLLBACK DRAFT','','','draft');
insert into public.cms_posts(slug,title,excerpt,body_markdown,status,published_at) values
('cms-rollback-scheduled','CMS ROLLBACK SCHEDULED',repeat('Mô tả kiểm thử. ',4),repeat('Nội dung kiểm thử. ',8),'published',now()+interval '1 day');
do $$ declare changed integer; begin
  update public.cms_posts set title='Stale update' where id='d0b00000-0000-4000-8000-000000000001' and version=99;
  get diagnostics changed = row_count;
  if changed<>0 then raise exception 'STALE_VERSION_OVERWROTE_DATA'; end if;
  update public.cms_posts set title='CMS ROLLBACK VERSION TWO' where id='d0b00000-0000-4000-8000-000000000001' and version=1;
  if (select version from public.cms_posts where id='d0b00000-0000-4000-8000-000000000001')<>2 then raise exception 'VERSION_NOT_INCREMENTED'; end if;
  if (select count(*) from public.cms_post_revisions where post_id='d0b00000-0000-4000-8000-000000000001')<>2 then raise exception 'REVISION_MISSING'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  if (select count(slug) from public.cms_posts where slug like 'cms-rollback-%')<>1 then raise exception 'ANON_READ_DRAFT_OR_SCHEDULED'; end if;
  begin perform author_id from public.cms_posts; raise exception 'ANON_READ_INTERNAL_AUTHOR'; exception when insufficient_privilege then null; end;
  begin perform snapshot from public.cms_post_revisions; raise exception 'ANON_READ_REVISIONS'; exception when insufficient_privilege then null; end;
  begin insert into public.cms_posts(slug,title) values('cms-anon-bypass','BYPASS'); raise exception 'ANON_INSERTED'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"manager"}}',true);
insert into public.cms_posts(id,slug,title,status) values('d0b00000-0000-4000-8000-000000000003','cms-rollback-manager','CMS MANAGER DRAFT','draft');
do $$ declare changed integer; begin
  begin update public.cms_posts set status='published',excerpt=repeat('Mô tả kiểm thử. ',4),body_markdown=repeat('Nội dung kiểm thử. ',8) where id='d0b00000-0000-4000-8000-000000000003'; raise exception 'MANAGER_PUBLISHED'; exception when insufficient_privilege then null; end;
  begin update public.cms_posts set author_id='d0a00000-0000-4000-8000-000000000001' where id='d0b00000-0000-4000-8000-000000000003'; raise exception 'AUTHOR_CHANGED'; exception when insufficient_privilege then null; end;
  update public.cms_posts set title='MANAGER EDIT OTHER' where id='d0b00000-0000-4000-8000-000000000001';
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'MANAGER_CHANGED_OTHER_POST'; end if;
  update public.cms_posts set status='review' where id='d0b00000-0000-4000-8000-000000000003';
  if (select version from public.cms_posts where id='d0b00000-0000-4000-8000-000000000003')<>2 then raise exception 'MANAGER_REVIEW_FAILED'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
  begin insert into public.cms_posts(slug,title) values('cms-employee-bypass','BYPASS'); raise exception 'EMPLOYEE_INSERTED_WITH_FORGED_JWT'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.staff_profiles set active=false where user_id='d0a00000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
  begin insert into public.cms_posts(slug,title) values('cms-disabled-bypass','BYPASS'); raise exception 'DISABLED_STAFF_INSERTED'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'CMS RLS, versions, scheduling and revision tests passed; fixtures rolled back' as result;
rollback;
