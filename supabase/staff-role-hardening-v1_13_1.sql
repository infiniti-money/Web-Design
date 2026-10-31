-- v1.13.1: reject stale JWT role claims immediately after changing a user's role.
-- Private stable helper reads the authoritative Auth app_metadata and active staff profile.
create or replace function private.current_staff_role()
returns text language sql stable security definer set search_path=''
as $$
 select sp.role from public.staff_profiles sp
 join auth.users u on u.id=sp.user_id
 where sp.user_id=auth.uid() and sp.active
   and sp.role=(u.raw_app_meta_data->>'role')
 limit 1;
$$;
revoke all on function private.current_staff_role() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_staff_role() to authenticated;

drop policy if exists "staff view own and managers view directory" on public.staff_profiles;
create policy "staff view own and managers view directory" on public.staff_profiles
 for select to authenticated using(
 (select private.current_staff_role()) is not null
 and (user_id=(select auth.uid()) or
      (select private.current_staff_role()) in ('admin','manager'))
);
drop policy if exists "staff scoped inquiry access" on public.inquiries;
create policy "staff scoped inquiry access" on public.inquiries
 for select to authenticated using(
 (select private.current_staff_role()) in ('admin','manager') or
 ((select private.current_staff_role())='employee'
   and exists(select 1 from public.inquiry_care_tasks t
    where t.inquiry_id=inquiries.id and t.assignee_user_id=(select auth.uid())))
);
drop policy if exists "staff view assigned tasks" on public.inquiry_care_tasks;
create policy "staff view assigned tasks" on public.inquiry_care_tasks
 for select to authenticated using(
 (select private.current_staff_role()) in ('admin','manager') or
 ((select private.current_staff_role())='employee' and assignee_user_id=(select auth.uid()))
);
drop policy if exists "admin manager create tasks" on public.inquiry_care_tasks;
create policy "admin manager create tasks" on public.inquiry_care_tasks
 for insert to authenticated with check((select private.current_staff_role()) in ('admin','manager'));
drop policy if exists "staff update scoped tasks" on public.inquiry_care_tasks;
create policy "staff update scoped tasks" on public.inquiry_care_tasks
 for update to authenticated
 using((select private.current_staff_role()) in ('admin','manager') or
   ((select private.current_staff_role())='employee' and assignee_user_id=(select auth.uid())))
 with check((select private.current_staff_role()) in ('admin','manager') or
   ((select private.current_staff_role())='employee' and assignee_user_id=(select auth.uid())));
drop policy if exists "admin manager delete tasks" on public.inquiry_care_tasks;
create policy "admin manager delete tasks" on public.inquiry_care_tasks
 for delete to authenticated using((select private.current_staff_role()) in ('admin','manager'));
drop policy if exists "staff view authorized task events" on public.inquiry_care_task_events;
create policy "staff view authorized task events" on public.inquiry_care_task_events
 for select to authenticated using(
 (select private.current_staff_role()) in ('admin','manager') or
 ((select private.current_staff_role())='employee' and exists(
  select 1 from public.inquiry_care_tasks t
  where t.id=inquiry_care_task_events.task_id and t.assignee_user_id=(select auth.uid())))
);
create or replace function private.staff_task_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_role text;v_valid boolean;
begin
 v_role:=private.current_staff_role();
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
