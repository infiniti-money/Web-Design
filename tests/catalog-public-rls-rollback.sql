begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
('d0a00000-0000-4000-8000-000000000071','authenticated','authenticated','catalog-admin@example.invalid','{"role":"admin"}'),
('d0a00000-0000-4000-8000-000000000072','authenticated','authenticated','catalog-manager@example.invalid','{"role":"manager"}'),
('d0a00000-0000-4000-8000-000000000073','authenticated','authenticated','catalog-employee@example.invalid','{"role":"employee"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values
('d0a00000-0000-4000-8000-000000000071','catalog-admin@example.invalid','Catalog admin','admin',true),
('d0a00000-0000-4000-8000-000000000072','catalog-manager@example.invalid','Catalog manager','manager',true),
('d0a00000-0000-4000-8000-000000000073','catalog-employee@example.invalid','Catalog employee','employee',true);
insert into public.catalog_items(id,name,category,published) values
('d0c00000-0000-4000-8000-000000000071','CATALOG PUBLIC FIXTURE','Vật liệu',true),
('d0c00000-0000-4000-8000-000000000072','CATALOG DRAFT FIXTURE','Vật liệu',false);
set local role anon;
do $$ begin
 if (select count(*) from public.catalog_items where id in ('d0c00000-0000-4000-8000-000000000071','d0c00000-0000-4000-8000-000000000072'))<>1 then raise exception 'ANON_SCOPE'; end if;
 begin perform 1 from public.staff_profiles limit 1;raise exception 'STAFF_EXPOSED';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000072","role":"authenticated","app_metadata":{"role":"manager"}}',true);
do $$ begin
 if (select count(*) from public.catalog_items where id in ('d0c00000-0000-4000-8000-000000000071','d0c00000-0000-4000-8000-000000000072'))<>1 then raise exception 'MANAGER_SCOPE'; end if;
 update public.catalog_items set name='UNAUTHORIZED' where id='d0c00000-0000-4000-8000-000000000071';if found then raise exception 'MANAGER_WROTE'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000073","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if (select count(*) from public.catalog_items where id in ('d0c00000-0000-4000-8000-000000000071','d0c00000-0000-4000-8000-000000000072'))<>1 then raise exception 'EMPLOYEE_FORGED_SCOPE'; end if;
 delete from public.catalog_items where id='d0c00000-0000-4000-8000-000000000071';if found then raise exception 'EMPLOYEE_DELETED'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000071","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if (select count(*) from public.catalog_items where id in ('d0c00000-0000-4000-8000-000000000071','d0c00000-0000-4000-8000-000000000072'))<>2 then raise exception 'ADMIN_SCOPE'; end if;
 update public.catalog_items set name='CATALOG ADMIN UPDATED' where id='d0c00000-0000-4000-8000-000000000071';if not found then raise exception 'ADMIN_UPDATE_FAILED'; end if;
 insert into public.catalog_items(id,name,category) values('d0c00000-0000-4000-8000-000000000073','CATALOG INSERT FIXTURE','Thiết bị');
 delete from public.catalog_items where id='d0c00000-0000-4000-8000-000000000073';if not found then raise exception 'ADMIN_DELETE_FAILED'; end if;
end $$;
reset role;
update auth.users set raw_app_meta_data='{"role":"disabled"}' where id='d0a00000-0000-4000-8000-000000000071';
set local role authenticated;
do $$ begin
 if exists(select 1 from public.catalog_items where id='d0c00000-0000-4000-8000-000000000072') then raise exception 'REVOKED_ADMIN_DRAFT'; end if;
 update public.catalog_items set name='STALE ADMIN' where id='d0c00000-0000-4000-8000-000000000071';if found then raise exception 'REVOKED_ADMIN_WRITE'; end if;
 begin insert into public.catalog_items(name,category) values('REVOKED INSERT','Thiết bị');raise exception 'REVOKED_ADMIN_INSERT';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'Catalog public read, staff isolation and authoritative Admin checks passed; fixtures rolled back' as result;
rollback;
