-- Tân Design v1.8.0: customer care work assignments and progress.
-- An assignment names the responsible person; only authenticated Admin users may log in to view/edit it.
create table if not exists public.inquiry_care_tasks (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  details text not null default '' check (char_length(details)<=1500),
  assignee_name text not null check (char_length(btrim(assignee_name)) between 2 and 100),
  status text not null default 'todo' check(status in ('todo','in_progress','done')),
  priority text not null default 'normal' check(priority in ('normal','high','urgent')),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists care_tasks_customer_idx on public.inquiry_care_tasks(inquiry_id,created_at desc);
create index if not exists care_tasks_status_due_idx on public.inquiry_care_tasks(status,due_at);
alter table public.inquiry_care_tasks enable row level security;
revoke all on public.inquiry_care_tasks from public,anon,authenticated;
grant select,insert,update,delete on public.inquiry_care_tasks to authenticated;
create policy "admin manage care tasks" on public.inquiry_care_tasks
  for all to authenticated using (
    (select auth.uid()) is not null
    and (select auth.jwt())->'app_metadata'->>'role'='admin'
  ) with check (
    (select auth.uid()) is not null
    and (select auth.jwt())->'app_metadata'->>'role'='admin'
  );

create table if not exists public.inquiry_care_task_events(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.inquiry_care_tasks(id) on delete cascade,
 inquiry_id uuid not null references public.inquiries(id) on delete cascade,
 event_type text not null check(event_type in ('created','status_changed','reassigned')),
 previous_value text,
 current_value text,
 actor_id uuid,
 created_at timestamptz not null default now()
);
create index if not exists care_task_events_task_idx on public.inquiry_care_task_events(task_id,created_at desc);
alter table public.inquiry_care_task_events enable row level security;
revoke all on public.inquiry_care_task_events from public,anon,authenticated;
grant select on public.inquiry_care_task_events to authenticated;
create policy "admin view care task events" on public.inquiry_care_task_events
 for select to authenticated using (
    (select auth.uid()) is not null
    and (select auth.jwt())->'app_metadata'->>'role'='admin'
 );

create schema if not exists private;
create or replace function private.record_care_task_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if TG_WHEN='BEFORE' and TG_OP='UPDATE' then
   new.updated_at=now();
   if new.status='done' and old.status is distinct from 'done' then
     new.completed_at=now();
   elsif new.status<>'done' then
     new.completed_at=null;
   end if;
   return new;
 end if;
 if TG_WHEN='AFTER' then
   if TG_OP='INSERT' then
     insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,current_value,actor_id)
       values(new.id,new.inquiry_id,'created',new.assignee_name,auth.uid());
   elsif TG_OP='UPDATE' then
     if old.status is distinct from new.status then
       insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
         values(new.id,new.inquiry_id,'status_changed',old.status,new.status,auth.uid());
     end if;
     if old.assignee_name is distinct from new.assignee_name then
       insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
         values(new.id,new.inquiry_id,'reassigned',old.assignee_name,new.assignee_name,auth.uid());
     end if;
   end if;
 end if;
 return null;
end $$;
revoke all on function private.record_care_task_change() from public,anon,authenticated;
drop trigger if exists care_task_before_update on public.inquiry_care_tasks;
create trigger care_task_before_update before update on public.inquiry_care_tasks
 for each row execute function private.record_care_task_change();
drop trigger if exists care_task_audit on public.inquiry_care_tasks;
create trigger care_task_audit after insert or update on public.inquiry_care_tasks
 for each row execute function private.record_care_task_change();
