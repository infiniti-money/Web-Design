\set ON_ERROR_STOP on
-- Synthetic database only. Never execute against production.
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls;end if;end$$;
create schema auth;create schema private;
create table auth.users(id uuid primary key,raw_app_meta_data jsonb);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users,not_after timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid;$$;
grant usage on schema auth,private to authenticated;
create table public.staff_profiles(user_id uuid primary key references auth.users,full_name text,role text,active boolean);
create function private.current_staff_role() returns text language sql stable security definer set search_path='' as $$select s.role from public.staff_profiles s join auth.users u on u.id=s.user_id where s.user_id=auth.uid() and s.active and s.role=u.raw_app_meta_data->>'role' limit 1;$$;
insert into auth.users select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,jsonb_build_object('role',case i when 1 then 'admin' when 2 then 'manager' else 'employee' end) from generate_series(1,4)i;
insert into auth.sessions select ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,id,null from auth.users u cross join lateral(select right(u.id::text,1)::int i)n;
insert into public.staff_profiles select id,'Fixture '||right(id::text,1),raw_app_meta_data->>'role',true from auth.users;
\ir ../supabase/migrations/20261118165415_internal_staff_chat.sql
create temp table qa_state(k text primary key,v uuid);grant select,insert,update on qa_state to authenticated;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","session_id":"10000000-0000-4000-8000-000000000001"}',false);
do $$declare direct uuid;room uuid;msg jsonb;retry jsonb;begin
 direct:=public.chat_create_room('',array['00000000-0000-4000-8000-000000000002']::uuid[]);
 if direct<>public.chat_create_room('',array['00000000-0000-4000-8000-000000000002']::uuid[]) then raise exception 'Duplicate direct chat';end if;
 room:=public.chat_create_room('Nhóm kiểm thử',array['00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']::uuid[]);
 insert into qa_state values('direct',direct),('group',room);
 msg:=public.chat_send_message(room,'20000000-0000-4000-8000-000000000001','<img src=x onerror=alert(1)>');
 insert into qa_state values('first_message',(msg->>'id')::uuid);
 retry:=public.chat_send_message(room,'20000000-0000-4000-8000-000000000001','changed retry');
 if msg<>retry then raise exception 'Idempotent send changed message';end if;
 begin perform public.chat_send_message(room,'20000000-0000-4000-8000-000000000002','too fast');raise exception 'Missing rate limit';exception when raise_exception then if sqlerrm<>'CHAT_SEND_RATE_LIMIT' then raise;end if;end;
 begin insert into public.chat_messages(room_id,sender_id,client_message_id,body) values(room,auth.uid(),gen_random_uuid(),'bypass');raise exception 'Direct insert allowed';exception when insufficient_privilege then null;end;
 begin update public.chat_messages set body='changed' where room_id=room;raise exception 'Direct update allowed';exception when insufficient_privilege then null;end;
 begin delete from public.chat_messages where room_id=room;raise exception 'Direct delete allowed';exception when insufficient_privilege then null;end;
 if jsonb_array_length(public.chat_bootstrap()->'directory')<>4 then raise exception 'Directory missing staff';end if;
end$$;
-- A manager can read own rooms but cannot take ownership of another creator's group.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","session_id":"10000000-0000-4000-8000-000000000002"}',false);
do $$declare room uuid:=(select v from qa_state where k='group');msg jsonb;begin
 if (select count(*) from public.chat_rooms)<>2 then raise exception 'Manager room RLS mismatch';end if;
 if jsonb_array_length(public.chat_list_messages(room))<>1 then raise exception 'Member cannot read';end if;
 if (select (r->>'unread_count')::int from jsonb_array_elements(public.chat_bootstrap()->'rooms')r where r->>'id'=room::text)<>1 then raise exception 'Unread count wrong';end if;
 perform public.chat_mark_read(room,(select v from qa_state where k='first_message'));
 if (select (r->>'unread_count')::int from jsonb_array_elements(public.chat_bootstrap()->'rooms')r where r->>'id'=room::text)<>0 then raise exception 'Read marker failed';end if;
 begin perform public.chat_mark_read((select v from qa_state where k='direct'),(select v from qa_state where k='first_message'));raise exception 'Cross-room read marker';exception when invalid_parameter_value then null;end;
 begin perform public.chat_update_room(room,'Take over',array[auth.uid()],false);raise exception 'Non-owner managed group';exception when insufficient_privilege then null;end;
 msg:=public.chat_send_message(room,'20000000-0000-4000-8000-000000000003','Manager fixture');
 if (msg->>'sender_id')::uuid<>auth.uid() then raise exception 'Sender not server bound';end if;
end$$;
-- An authenticated employee outside a room gets neither rows nor RPC history.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","session_id":"10000000-0000-4000-8000-000000000004"}',false);
do $$begin
 if exists(select 1 from public.chat_rooms) or exists(select 1 from public.chat_room_members) or exists(select 1 from public.chat_messages) then raise exception 'Outsider RLS leak';end if;
 begin perform public.chat_list_messages((select v from qa_state where k='group'));raise exception 'Outsider RPC leak';exception when insufficient_privilege then null;end;
 begin perform public.chat_send_message((select v from qa_state where k='group'),gen_random_uuid(),'outside');raise exception 'Outsider posted';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","session_id":"10000000-0000-4000-8000-000000000001"}',false);
do $$declare room uuid:=(select v from qa_state where k='group');begin
 perform public.chat_update_room(room,'Nhóm đã cập nhật',array['00000000-0000-4000-8000-000000000002']::uuid[],true);
 begin perform public.chat_send_message(room,gen_random_uuid(),'closed');raise exception 'Archived send accepted';exception when raise_exception then if sqlerrm<>'CHAT_ROOM_ARCHIVED' then raise;end if;end;
 perform public.chat_update_room(room,'Nhóm đã cập nhật',array['00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003']::uuid[],false);
 begin perform public.chat_send_message(room,gen_random_uuid(),repeat('x',4001));raise exception 'Oversize accepted';exception when invalid_parameter_value then null;end;
 begin perform public.chat_send_message(room,gen_random_uuid(),E' \n\t');raise exception 'Blank accepted';exception when invalid_parameter_value then null;end;
end$$;
reset role;
-- Stable cursor pagination, including equal timestamps and Unicode text.
insert into public.chat_messages(room_id,sender_id,client_message_id,body,created_at)
 select (select v from qa_state where k='group'),'00000000-0000-4000-8000-000000000001',gen_random_uuid(),'Tiếng Việt — fixture '||i,'2026-11-18T00:00:00Z' from generate_series(1,5)i;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","session_id":"10000000-0000-4000-8000-000000000003"}',false);
do $$declare page jsonb;cursor_at timestamptz;cursor_id uuid;seen uuid[]:='{}';item jsonb;begin
 loop
  page:=public.chat_list_messages((select v from qa_state where k='group'),cursor_at,cursor_id,2);exit when jsonb_array_length(page)=0;
  for item in select * from jsonb_array_elements(page) loop if (item->>'id')::uuid=any(seen) then raise exception 'Duplicate cursor row';end if;seen:=array_append(seen,(item->>'id')::uuid);end loop;
  cursor_at:=(page->0->>'created_at')::timestamptz;cursor_id:=(page->0->>'id')::uuid;
 end loop;
 if cardinality(seen)<>7 then raise exception 'Missing cursor rows: %',cardinality(seen);end if;
end$$;
-- Removal, deactivation, mismatched metadata, deleted or expired sessions revoke access.
reset role;
delete from public.chat_room_members where room_id=(select v from qa_state where k='group') and user_id='00000000-0000-4000-8000-000000000003';
set role authenticated;
do $$begin if exists(select 1 from public.chat_messages) then raise exception 'Removed member retained access';end if;end$$;
reset role;
update public.staff_profiles set active=false where user_id='00000000-0000-4000-8000-000000000002';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","session_id":"10000000-0000-4000-8000-000000000002"}',false);
do $$begin if exists(select 1 from public.chat_messages) then raise exception 'Inactive read';end if;begin perform public.chat_bootstrap();raise exception 'Inactive bootstrap';exception when insufficient_privilege then null;end;end$$;
reset role;
update public.staff_profiles set active=true where user_id='00000000-0000-4000-8000-000000000002';
update auth.users set raw_app_meta_data='{"role":"employee"}' where id='00000000-0000-4000-8000-000000000002';
set role authenticated;
do $$begin if exists(select 1 from public.chat_messages) then raise exception 'Mismatched profile read';end if;end$$;
reset role;
update auth.users set raw_app_meta_data='{"role":"manager"}' where id='00000000-0000-4000-8000-000000000002';
delete from auth.sessions where user_id='00000000-0000-4000-8000-000000000002';
set role authenticated;
do $$begin if exists(select 1 from public.chat_messages) then raise exception 'Revoked session read';end if;begin perform public.chat_bootstrap();raise exception 'Revoked RPC';exception when insufficient_privilege then null;end;end$$;
reset role;
update auth.sessions set not_after=now()-interval '1 minute' where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","session_id":"10000000-0000-4000-8000-000000000001"}',false);
do $$begin begin perform public.chat_bootstrap();raise exception 'Expired session RPC';exception when insufficient_privilege then null;end;end$$;
reset role;
update auth.sessions set not_after=null where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","session_id":"10000000-0000-4000-8000-000000000001","is_anonymous":true}',false);
do $$begin begin perform public.chat_bootstrap();raise exception 'Anonymous claim RPC';exception when insufficient_privilege then null;end;end$$;
reset role;
set role anon;
do $$begin begin perform public.chat_bootstrap();raise exception 'Anon RPC';exception when insufficient_privilege then null;end;begin perform 1 from public.chat_messages;raise exception 'Anon table';exception when insufficient_privilege then null;end;end$$;
reset role;
do $$begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'chat_%' and p.prosecdef) then raise exception 'Exposed definer';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.proname like 'chat_%' and has_function_privilege('anon',p.oid,'execute')) then raise exception 'Anon grant';end if;
end$$;
\echo 'Chat SQL PASS: membership/roles/revoked sessions, owner-only updates, idempotency, rate caps, read markers, equal-time pagination and denied direct writes.'
