begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
('d0a00000-0000-4000-8000-000000000061','authenticated','authenticated','search-admin@example.invalid','{"role":"admin"}'),
('d0a00000-0000-4000-8000-000000000062','authenticated','authenticated','search-employee@example.invalid','{"role":"employee"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values
('d0a00000-0000-4000-8000-000000000061','search-admin@example.invalid','Search admin','admin',true),
('d0a00000-0000-4000-8000-000000000062','search-employee@example.invalid','Search employee','employee',true);
insert into public.inquiries(id,full_name,phone,service,space,details) values
('d0c00000-0000-4000-8000-000000000061','Nguyễn Đặng Hồng','0900000061','Thiết kế nội thất','Căn hộ','Tư vấn gỗ óc chó');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000061","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if private.fold_vietnamese('NGUYỄN ĐẶNG HỒNG')<>'nguyen dang hong' then raise exception 'FOLD_FAILED'; end if;
 if private.fold_vietnamese(U&'Nguye\0302\0303n')<>'nguyen' then raise exception 'NFD_FAILED'; end if;
 if (select count(*) from public.inquiries where id='d0c00000-0000-4000-8000-000000000061' and search_text ilike '%nguyen dang%')<>1 then raise exception 'NAME_SEARCH_FAILED'; end if;
 if not exists(select 1 from public.inquiries where id='d0c00000-0000-4000-8000-000000000061' and search_text ilike '%go oc cho%') then raise exception 'DETAIL_SEARCH_FAILED'; end if;
 update public.inquiries set full_name='Đỗ Ánh' where id='d0c00000-0000-4000-8000-000000000061';
 if not exists(select 1 from public.inquiries where id='d0c00000-0000-4000-8000-000000000061' and search_text like 'do anh%') then raise exception 'GENERATED_UPDATE_FAILED'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000062","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if exists(select 1 from public.inquiries where search_text ilike '%0900000061%') then raise exception 'EMPLOYEE_SEARCH_LEAK'; end if;
end $$;
set local role anon;
do $$ begin
 begin
 perform search_text from public.inquiries limit 1;
 raise exception 'ANON_SELECT_GRANTED';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Vietnamese CRM search and RLS passed; fixtures rolled back' as result;
rollback;
