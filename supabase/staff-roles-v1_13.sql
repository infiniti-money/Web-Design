-- Tân Design v1.13.0: staff profiles, RBAC policies and linked task ownership.
create table if not exists public.staff_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text not null check(char_length(btrim(full_name)) between 2 and 100),
 role text not null check(role in ('admin','manager','employee')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists staff_profiles_role_idx on public.staff_profiles(role,active);
alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from public,anon,authenticated;
grant select on public.staff_profiles to authenticated;
create policy "staff view own and managers view directory" on public.staff_profiles
 for select to authenticated using(
  (select auth.uid())=user_id or ((select auth.uid()) is not null
  and ((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager'))
);
alter table public.inquiry_care_tasks
 add column if not exists assignee_user_id uuid references auth.users(id) on delete set null;
create index if not exists care_tasks_user_idx
 on public.inquiry_care_tasks(assignee_user_id,status,due_at);
insert into public.staff_profiles(user_id,email,full_name,role,active)
select id,email,coalesce(nullif(split_part(email,'@',1),''),'Administrator'),'admin',true
from auth.users where raw_app_meta_data->>'role'='admin'
on conflict(user_id) do nothing;

drop policy if exists "admins view inquiries" on public.inquiries;
create policy "staff scoped inquiry access" on public.inquiries
 for select to authenticated using ((select auth.uid()) is not null and
 exists(select 1 from public.staff_profiles sp
        where sp.user_id=(select auth.uid()) and sp.active)
 and (((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager')
 or (((select auth.jwt())->'app_metadata'->>'role')='employee'
 and exists(select 1 from public.inquiry_care_tasks t where t.inquiry_id=inquiries.id
  and t.assignee_user_id=(select auth.uid())))));

drop policy if exists "admin manage care tasks" on public.inquiry_care_tasks;
create policy "staff view assigned tasks" on public.inquiry_care_tasks
 for select to authenticated using((select auth.uid()) is not null
 and exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.active)
 and (((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager')
 or (((select auth.jwt())->'app_metadata'->>'role')='employee' and assignee_user_id=(select auth.uid()))));
create policy "admin manager create tasks" on public.inquiry_care_tasks
 for insert to authenticated with check((select auth.uid()) is not null
 and exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.active)
 and ((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager'));
create policy "staff update scoped tasks" on public.inquiry_care_tasks
 for update to authenticated using((select auth.uid()) is not null
 and exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.active)
 and (((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager')
 or (((select auth.jwt())->'app_metadata'->>'role')='employee' and assignee_user_id=(select auth.uid()))))
 with check((select auth.uid()) is not null
 and exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.active)
 and (((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager')
 or (((select auth.jwt())->'app_metadata'->>'role')='employee' and assignee_user_id=(select auth.uid()))));
create policy "admin manager delete tasks" on public.inquiry_care_tasks
 for delete to authenticated using((select auth.uid()) is not null
 and exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.active)
 and ((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager'));

drop policy if exists "admin view care task events" on public.inquiry_care_task_events;
create policy "staff view authorized task events" on public.inquiry_care_task_events
 for select to authenticated using((select auth.uid()) is not null
 and exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.active)
 and (((select auth.jwt())->'app_metadata'->>'role') in ('admin','manager')
 or (((select auth.jwt())->'app_metadata'->>'role')='employee' and exists(
  select 1 from public.inquiry_care_tasks t where t.id=inquiry_care_task_events.task_id
  and t.assignee_user_id=(select auth.uid())))));

create or replace function private.staff_task_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_role text;v_valid boolean;
begin
 v_role:=auth.jwt()->'app_metadata'->>'role';
 if v_role is null or v_role not in ('admin','manager','employee')
 then raise exception 'STAFF_LOGIN_REQUIRED' using errcode='42501';end if;
 if v_role='employee' then
  if tg_op<>'UPDATE' or old.assignee_user_id is distinct from auth.uid()
    or new.status is not distinct from old.status
    or new.id is distinct from old.id or new.inquiry_id is distinct from old.inquiry_id
    or new.title is distinct from old.title or new.details is distinct from old.details
    or new.priority is distinct from old.priority or new.due_at is distinct from old.due_at
    or new.assignee_user_id is distinct from old.assignee_user_id
    or new.assignee_name is distinct from old.assignee_name
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then raise exception 'EMPLOYEE_STATUS_ONLY' using errcode='42501';end if;
 end if;
 if new.assignee_user_id is not null then
  select exists(select 1 from public.staff_profiles sp where sp.user_id=new.assignee_user_id
   and sp.active) into v_valid;
  if not v_valid then raise exception 'ASSIGNEE_NOT_ACTIVE' using errcode='22023';end if;
 end if;
 return new;
end $$;
revoke all on function private.staff_task_guard() from public,anon,authenticated;
drop trigger if exists care_task_staff_guard on public.inquiry_care_tasks;
create trigger care_task_staff_guard before insert or update
 on public.inquiry_care_tasks for each row execute function private.staff_task_guard();
alter table public.inquiry_care_task_events
 drop constraint if exists inquiry_care_task_events_event_type_check;
alter table public.inquiry_care_task_events
 add constraint inquiry_care_task_events_event_type_check
 check(event_type in ('created','status_changed','reassigned','title_changed',
 'details_changed','priority_changed','due_changed','account_assigned'));
create or replace function private.staff_task_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' and new.assignee_user_id is distinct from old.assignee_user_id then
   insert into public.inquiry_care_task_events(
    task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
   values(new.id,new.inquiry_id,'account_assigned',
     case when old.assignee_user_id is null then null else old.assignee_user_id::text end,
     case when new.assignee_user_id is null then null else new.assignee_user_id::text end,
     auth.uid());
 end if;return null;
end $$;
revoke all on function private.staff_task_audit() from public,anon,authenticated;
drop trigger if exists care_task_staff_audit on public.inquiry_care_tasks;
create trigger care_task_staff_audit after update
 on public.inquiry_care_tasks for each row execute function private.staff_task_audit();
