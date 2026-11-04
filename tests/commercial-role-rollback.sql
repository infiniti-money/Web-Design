-- Run after commercial_authoritative_role. Synthetic fixtures only; all rows roll back.
-- Expected denial for each stale/revoked actor: SQLSTATE 42501, message FORBIDDEN.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
('d0a00000-0000-4000-8000-000000000021','authenticated','authenticated','commercial-admin@example.invalid','{"role":"admin"}'),
('d0a00000-0000-4000-8000-000000000022','authenticated','authenticated','commercial-manager@example.invalid','{"role":"manager"}'),
('d0a00000-0000-4000-8000-000000000023','authenticated','authenticated','commercial-employee@example.invalid','{"role":"employee"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values
('d0a00000-0000-4000-8000-000000000021','commercial-admin@example.invalid','Commercial test admin','admin',true),
('d0a00000-0000-4000-8000-000000000022','commercial-manager@example.invalid','Commercial test manager','manager',true),
('d0a00000-0000-4000-8000-000000000023','commercial-employee@example.invalid','Commercial test employee','employee',true);
insert into public.inquiries(id,full_name,phone,service) values
('d0c00000-0000-4000-8000-000000000021','COMMERCIAL ROLE ROLLBACK FIXTURE','0900000000','Thiết kế nội thất');

-- Active manager and admin retain their existing permission to create a draft.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000022","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
  perform public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000021','ROLE TEST VALID MANAGER');
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000021","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
  perform public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000021','ROLE TEST VALID ADMIN');
end $$;

-- Simulate the staff API's partial-failure window: Auth was disabled but the old
-- active manager profile and a previously issued manager JWT still exist.
reset role;
update auth.users set raw_app_meta_data='{"role":"disabled"}' where id='d0a00000-0000-4000-8000-000000000022';
update public.staff_profiles set role='manager',active=true where user_id='d0a00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000022","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
  begin
    perform public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000021','STALE MANAGER MUST FAIL');
    raise exception 'STALE_MANAGER_JWT_WAS_ACCEPTED';
  exception when insufficient_privilege then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;

-- A complete demotion must also fail even though the caller still presents the
-- old manager JWT. This checks the allowed-role guard after the helper lookup.
reset role;
update auth.users set raw_app_meta_data='{"role":"employee"}' where id='d0a00000-0000-4000-8000-000000000022';
update public.staff_profiles set role='employee',active=true where user_id='d0a00000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000022","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
  begin
    perform public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000021','DEMOTED EMPLOYEE MUST FAIL');
    raise exception 'DEMOTED_EMPLOYEE_WAS_ACCEPTED';
  exception when insufficient_privilege then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;

-- Revoked Admin metadata must not be rescued by its stale active Admin profile.
reset role;
update auth.users set raw_app_meta_data='{"role":"disabled"}' where id='d0a00000-0000-4000-8000-000000000021';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000021","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
  begin
    perform public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000021','STALE ADMIN MUST FAIL');
    raise exception 'STALE_ADMIN_JWT_WAS_ACCEPTED';
  exception when insufficient_privilege then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;

-- Employee cannot acquire commercial access from an elevated claim alone.
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000023","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
  begin
    perform public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000021','EMPLOYEE CLAIM MUST FAIL');
    raise exception 'EMPLOYEE_WITH_ELEVATED_CLAIM_WAS_ACCEPTED';
  exception when insufficient_privilege then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
end $$;

reset role;
do $$ begin
  if (select count(*) from public.customer_quotes where inquiry_id='d0c00000-0000-4000-8000-000000000021')<>2 then
    raise exception 'UNAUTHORIZED_COMMERCIAL_WRITE_PERSISTED';
  end if;
end $$;
select 'Commercial authoritative role checks passed; fixtures rolled back' as result;
rollback;
