-- Synthetic users only; all changes and generated notifications roll back.
begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
('d0a00000-0000-4000-8000-000000000041','authenticated','authenticated','rpc-admin@example.invalid','{"role":"admin"}'),
('d0a00000-0000-4000-8000-000000000042','authenticated','authenticated','rpc-manager@example.invalid','{"role":"manager"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values
('d0a00000-0000-4000-8000-000000000041','rpc-admin@example.invalid','RPC test admin','admin',true),
('d0a00000-0000-4000-8000-000000000042','rpc-manager@example.invalid','RPC test manager','manager',true);
insert into public.inquiries(id,full_name,phone,service) values
('d0c00000-0000-4000-8000-000000000041','RPC ROLE ROLLBACK FIXTURE','0900000000','Thiết kế nội thất');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000042","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
 if public.care_advance('d0c00000-0000-4000-8000-000000000041','consult','test')<>'consult' then raise exception 'MANAGER_FLOW_FAILED'; end if;
 begin
  perform public.edit_inquiry_care_note(null,'test',now());
  raise exception 'MANAGER_EDIT_ALLOWED';
 exception when insufficient_privilege then null; end;
 begin
  perform public.generate_task_due_notifications();
  raise exception 'MANAGER_NOTIFY_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000041","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if public.care_advance('d0c00000-0000-4000-8000-000000000041','survey','test')<>'survey' then raise exception 'ADMIN_FLOW_FAILED'; end if;
 begin
  perform public.edit_inquiry_care_note(null,'test',now());
  raise exception 'MISSING_INPUT_ACCEPTED';
 exception when invalid_parameter_value then null; end;
 perform public.generate_task_due_notifications();
end $$;
reset role;
update auth.users set raw_app_meta_data='{"role":"disabled"}'
 where id in ('d0a00000-0000-4000-8000-000000000041','d0a00000-0000-4000-8000-000000000042');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000041","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 begin
  perform public.care_advance('d0c00000-0000-4000-8000-000000000041','quote','stale');
  raise exception 'STALE_ADMIN_CARE_ALLOWED';
 exception when insufficient_privilege then null; end;
 begin
  perform public.edit_inquiry_care_note(null,'test',now());
  raise exception 'STALE_ADMIN_EDIT_ALLOWED';
 exception when insufficient_privilege then null; end;
 begin
  perform public.generate_task_due_notifications();
  raise exception 'STALE_ADMIN_NOTIFY_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000042","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
 begin
  perform public.care_advance('d0c00000-0000-4000-8000-000000000041','quote','stale');
  raise exception 'STALE_MANAGER_CARE_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if (select stage from public.care_workflow where inquiry_id='d0c00000-0000-4000-8000-000000000041')<>'survey' then raise exception 'UNAUTHORIZED_TRANSITION'; end if;
end $$;
select 'Staff RPC authoritative roles passed; fixtures rolled back' as result;
rollback;
