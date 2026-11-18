-- Additive internal chat. Existing business/Auth policies are not changed.
begin;
do $$begin
 if to_regprocedure('private.current_staff_role()') is null then raise exception 'Missing authoritative staff guard';end if;
 if to_regclass('public.chat_rooms') is not null then raise exception 'Chat schema already exists; inspect before applying';end if;
end$$;
create table public.chat_rooms(
 id uuid primary key default gen_random_uuid(),title text not null default '' check(char_length(title)<=120),
 kind text not null check(kind in('direct','group')),direct_key text unique,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),last_message_at timestamptz,archived boolean not null default false,
 check((kind='direct' and direct_key is not null) or (kind='group' and direct_key is null and char_length(btrim(title))>=2))
);
create table public.chat_room_members(
 room_id uuid not null references public.chat_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default clock_timestamp(),last_read_at timestamptz,last_sent_at timestamptz,
 primary key(room_id,user_id)
);
create table public.chat_messages(
 id uuid primary key default gen_random_uuid(),room_id uuid not null references public.chat_rooms(id) on delete cascade,
 sender_id uuid references auth.users(id) on delete set null,client_message_id uuid not null,
 body text not null check(char_length(body) between 1 and 4000 and body !~ '^[[:space:]]*$'),
 created_at timestamptz not null default clock_timestamp(),unique(room_id,sender_id,client_message_id)
);
create index chat_rooms_creator_idx on public.chat_rooms(created_by,created_at desc);
create index chat_members_user_idx on public.chat_room_members(user_id,room_id);
create index chat_messages_cursor_idx on public.chat_messages(room_id,created_at desc,id desc);
create index chat_messages_sender_idx on public.chat_messages(sender_id);
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.chat_rooms,public.chat_room_members,public.chat_messages from public,anon,authenticated;
grant select on public.chat_rooms,public.chat_room_members,public.chat_messages to authenticated;

-- Sensitive chat requires a still-existing Auth session, not just a valid old JWT.
create function private.chat_actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_session text:=auth.jwt()->>'session_id';
begin
 if v_user is null or private.current_staff_role() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true'
    or v_session is null or v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null;end if;
 if not exists(select 1 from auth.sessions s where s.id=v_session::uuid and s.user_id=v_user and (s.not_after is null or s.not_after>now())) then return null;end if;
 return v_user;
end$$;
create function private.chat_room_ids() returns uuid[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(m.room_id),'{}'::uuid[]) from public.chat_room_members m where m.user_id=(select private.chat_actor());
$$;
create policy chat_rooms_member_read on public.chat_rooms for select to authenticated using(id=any((select private.chat_room_ids())::uuid[]));
create policy chat_members_member_read on public.chat_room_members for select to authenticated using(room_id=any((select private.chat_room_ids())::uuid[]));
create policy chat_messages_member_read on public.chat_messages for select to authenticated using(room_id=any((select private.chat_room_ids())::uuid[]));

create function private.chat_bootstrap() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.chat_actor();rooms jsonb;directory jsonb;room_count bigint;
begin
 if actor is null then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) into directory from(
  select s.user_id,s.full_name,s.role from public.staff_profiles s join auth.users u on u.id=s.user_id
  where s.active and s.role=u.raw_app_meta_data->>'role' and s.role in('admin','manager','employee') order by s.full_name,s.user_id limit 500
 )d;
 select count(*) into room_count from public.chat_room_members where user_id=actor;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.activity_at desc,r.id desc),'[]'::jsonb) into rooms from(
  select c.id,c.title,c.kind,c.created_by,c.archived,c.created_at,coalesce(c.last_message_at,c.created_at) activity_at,
   (select count(*) from public.chat_messages msg where msg.room_id=c.id and msg.sender_id is distinct from actor and msg.created_at>coalesce(own.last_read_at,own.joined_at)) unread_count,
   (select jsonb_build_object('body',left(msg.body,180),'sender_id',msg.sender_id,'created_at',msg.created_at,'id',msg.id) from public.chat_messages msg where msg.room_id=c.id order by msg.created_at desc,msg.id desc limit 1) last_message,
   (select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(s.full_name,'Tài khoản đã gỡ'),'active',coalesce(s.active,false),'last_read_at',m.last_read_at) order by m.joined_at,m.user_id),'[]'::jsonb) from public.chat_room_members m left join public.staff_profiles s on s.user_id=m.user_id where m.room_id=c.id) members
  from public.chat_rooms c join public.chat_room_members own on own.room_id=c.id and own.user_id=actor
  order by coalesce(c.last_message_at,c.created_at) desc,c.id desc limit 200
 )r;
 return jsonb_build_object('rooms',rooms,'directory',directory,'rooms_truncated',room_count>200,'directory_truncated',(select count(*)>500 from public.staff_profiles where active),'actor_id',actor);
end$$;

create function private.chat_create_room(p_title text,p_user_ids uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.chat_actor();members uuid[];member_count integer;label text:=regexp_replace(coalesce(p_title,''),'^[[:space:]]+|[[:space:]]+$','','g');room uuid;key text;
begin
 if actor is null then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 if p_user_ids is null or cardinality(p_user_ids)<1 or cardinality(p_user_ids)>19 or char_length(label)>120 then raise exception 'CHAT_INVALID_ROOM' using errcode='22023';end if;
 select array_agg(distinct id order by id) into members from unnest(p_user_ids||array[actor]) id where id is not null;
 member_count:=cardinality(members);
 if member_count<2 or member_count>20 or (label<>'' and char_length(label)<2) then raise exception 'CHAT_INVALID_ROOM' using errcode='22023';end if;
 if (select count(*) from public.staff_profiles s join auth.users u on u.id=s.user_id where s.user_id=any(members) and s.active and s.role=u.raw_app_meta_data->>'role' and s.role in('admin','manager','employee'))<>member_count then raise exception 'CHAT_INVALID_MEMBER' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if member_count=2 and label='' then
  key:=members[1]::text||':'||members[2]::text;
  select id into room from public.chat_rooms where direct_key=key;
  if room is not null then return room;end if;
 end if;
 if (select count(*) from public.chat_rooms where created_by=actor and created_at>now()-interval '1 day')>=10 then raise exception 'CHAT_ROOM_RATE_LIMIT' using errcode='P0001';end if;
 insert into public.chat_rooms(title,kind,direct_key,created_by) values(label,case when key is null then 'group' else 'direct' end,key,actor) returning id into room;
 insert into public.chat_room_members(room_id,user_id) select room,id from unnest(members) id;
 return room;
exception when unique_violation then
 if key is not null then select id into room from public.chat_rooms where direct_key=key;return room;end if;raise;
end$$;

create function private.chat_list_messages(p_room_id uuid,p_before timestamptz,p_before_id uuid,p_limit integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.chat_actor();result jsonb;
begin
 if actor is null or not exists(select 1 from public.chat_room_members where room_id=p_room_id and user_id=actor) then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 if (p_before is null)<>(p_before_id is null) or p_limit is null or p_limit<1 or p_limit>100 then raise exception 'CHAT_INVALID_CURSOR' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at,m.id),'[]'::jsonb) into result from(
  select id,room_id,sender_id,body,created_at,client_message_id from public.chat_messages
  where room_id=p_room_id and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit p_limit
 )m;return result;
end$$;

create function private.chat_send_message(p_room_id uuid,p_client_message_id uuid,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.chat_actor();previous timestamptz;result public.chat_messages;clean text:=regexp_replace(coalesce(p_body,''),'^[[:space:]]+|[[:space:]]+$','','g');
begin
 if actor is null then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 if not exists(select 1 from public.chat_room_members where room_id=p_room_id and user_id=actor) then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 perform 1 from public.chat_rooms where id=p_room_id for update;
 select last_sent_at into previous from public.chat_room_members where room_id=p_room_id and user_id=actor for update;
 if not found then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 select * into result from public.chat_messages where room_id=p_room_id and sender_id=actor and client_message_id=p_client_message_id;
 if found then return to_jsonb(result);end if;
 if not exists(select 1 from public.chat_rooms where id=p_room_id and not archived) then raise exception 'CHAT_ROOM_ARCHIVED' using errcode='P0001';end if;
 if p_client_message_id is null or char_length(clean)<1 or char_length(clean)>4000 then raise exception 'CHAT_INVALID_MESSAGE' using errcode='22023';end if;
 if previous is not null and previous>clock_timestamp()-interval '1 second' then raise exception 'CHAT_SEND_RATE_LIMIT' using errcode='P0001';end if;
 insert into public.chat_messages(room_id,sender_id,client_message_id,body) values(p_room_id,actor,p_client_message_id,clean) returning * into result;
 update public.chat_room_members set last_sent_at=clock_timestamp() where room_id=p_room_id and user_id=actor;
 update public.chat_rooms set last_message_at=result.created_at where id=p_room_id;
 return to_jsonb(result);
end$$;

create function private.chat_mark_read(p_room_id uuid,p_message_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.chat_actor();at_time timestamptz;
begin
 if actor is null or not exists(select 1 from public.chat_room_members where room_id=p_room_id and user_id=actor) then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 select created_at into at_time from public.chat_messages where room_id=p_room_id and id=p_message_id;
 if at_time is null then raise exception 'CHAT_INVALID_MESSAGE' using errcode='22023';end if;
 update public.chat_room_members set last_read_at=greatest(coalesce(last_read_at,joined_at),at_time) where room_id=p_room_id and user_id=actor;return true;
end$$;

create function private.chat_update_room(p_room_id uuid,p_title text,p_user_ids uuid[],p_archived boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.chat_actor();room public.chat_rooms;members uuid[];label text:=regexp_replace(coalesce(p_title,''),'^[[:space:]]+|[[:space:]]+$','','g');
begin
 if actor is null then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 select * into room from public.chat_rooms where id=p_room_id for update;
 if not found or room.created_by is distinct from actor or not exists(select 1 from public.chat_room_members where room_id=p_room_id and user_id=actor) then raise exception 'CHAT_FORBIDDEN' using errcode='42501';end if;
 if p_archived is null then raise exception 'CHAT_INVALID_ROOM' using errcode='22023';end if;
 if room.kind='group' then
  if p_user_ids is null or cardinality(p_user_ids)>19 or char_length(label)<2 or char_length(label)>120 then raise exception 'CHAT_INVALID_ROOM' using errcode='22023';end if;
  select array_agg(distinct id order by id) into members from unnest(p_user_ids||array[actor]) id where id is not null;
  if cardinality(members)<2 or cardinality(members)>20 then raise exception 'CHAT_INVALID_ROOM' using errcode='22023';end if;
  if (select count(*) from public.staff_profiles s join auth.users u on u.id=s.user_id where s.user_id=any(members) and s.active and s.role=u.raw_app_meta_data->>'role' and s.role in('admin','manager','employee'))<>cardinality(members) then raise exception 'CHAT_INVALID_MEMBER' using errcode='22023';end if;
  delete from public.chat_room_members where room_id=p_room_id and not(user_id=any(members));
  insert into public.chat_room_members(room_id,user_id) select p_room_id,id from unnest(members) id on conflict do nothing;
  update public.chat_rooms set title=label,archived=p_archived where id=p_room_id;
 else update public.chat_rooms set archived=p_archived where id=p_room_id;end if;
 return true;
end$$;

create function public.chat_bootstrap() returns jsonb language sql stable security invoker set search_path='' as $$select private.chat_bootstrap();$$;
create function public.chat_create_room(p_title text,p_user_ids uuid[]) returns uuid language sql security invoker set search_path='' as $$select private.chat_create_room(p_title,p_user_ids);$$;
create function public.chat_list_messages(p_room_id uuid,p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 50) returns jsonb language sql stable security invoker set search_path='' as $$select private.chat_list_messages(p_room_id,p_before,p_before_id,p_limit);$$;
create function public.chat_send_message(p_room_id uuid,p_client_message_id uuid,p_body text) returns jsonb language sql security invoker set search_path='' as $$select private.chat_send_message(p_room_id,p_client_message_id,p_body);$$;
create function public.chat_mark_read(p_room_id uuid,p_message_id uuid) returns boolean language sql security invoker set search_path='' as $$select private.chat_mark_read(p_room_id,p_message_id);$$;
create function public.chat_update_room(p_room_id uuid,p_title text,p_user_ids uuid[],p_archived boolean) returns boolean language sql security invoker set search_path='' as $$select private.chat_update_room(p_room_id,p_title,p_user_ids,p_archived);$$;
do $$declare fn record;begin
 for fn in select p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('private','public') and p.proname in('chat_actor','chat_room_ids','chat_bootstrap','chat_create_room','chat_list_messages','chat_send_message','chat_mark_read','chat_update_room') loop
  execute format('revoke all on function %s from public,anon,authenticated',fn.signature);
  execute format('grant execute on function %s to authenticated',fn.signature);
 end loop;
end$$;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages;
 end if;
end$$;
commit;
