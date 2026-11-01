-- Tân Design v1.14.0 additive workflow schema.
create table if not exists public.care_workflow (
 inquiry_id uuid primary key references public.inquiries(id) on delete cascade,
 stage text not null default 'intake' check(stage in ('intake','consult','survey','quote','contract')),
 started_at timestamptz not null default now(),
 due_at timestamptz not null default (now() + interval '1 day'),
 updated_at timestamptz not null default now()
);
create table if not exists public.care_workflow_events (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null references public.inquiries(id) on delete cascade,
 previous_stage text not null,
 next_stage text not null,
 actor_id uuid not null references auth.users(id),
 note text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists care_workflow_due_idx on public.care_workflow(due_at);
create index if not exists care_workflow_events_idx on public.care_workflow_events(inquiry_id,created_at desc);
alter table public.care_workflow enable row level security;
alter table public.care_workflow_events enable row level security;
revoke all on public.care_workflow from anon,authenticated;
revoke all on public.care_workflow_events from anon,authenticated;
grant select on public.care_workflow to authenticated;
grant select on public.care_workflow_events to authenticated;
create policy care_workflow_read on public.care_workflow for select to authenticated using (
 exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role')
);
create policy care_workflow_events_read on public.care_workflow_events for select to authenticated using (
 exists (select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role')
);
