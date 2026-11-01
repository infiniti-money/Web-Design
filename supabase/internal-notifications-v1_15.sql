-- Tân Design v1.15.0: additive internal notifications; preserves existing CRM records.
create table if not exists public.staff_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid references public.inquiry_care_tasks(id) on delete set null,
 event_key text not null check(length(event_key) between 4 and 160),
 kind text not null check(kind in ('new_task','reassigned','due_soon','overdue')),
 title text not null check(length(title) between 1 and 180),
 body text not null default '' check(length(body)<=600),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(recipient_id,event_key)
);
create index if not exists staff_notifications_inbox_idx on public.staff_notifications(recipient_id,read_at,created_at desc);
alter table public.staff_notifications enable row level security;
revoke all on public.staff_notifications from anon,authenticated;
grant select on public.staff_notifications to authenticated;
grant update(read_at) on public.staff_notifications to authenticated;
create policy staff_notification_read on public.staff_notifications
 for select to authenticated using (
 recipient_id=auth.uid()
 and exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid()
  and sp.active and sp.role=auth.jwt()->'app_metadata'->>'role')
);
create policy staff_notification_mark_read on public.staff_notifications
 for update to authenticated using (
 recipient_id=auth.uid()
 and exists(select 1 from public.staff_profiles sp where sp.user_id=auth.uid()
  and sp.active and sp.role=auth.jwt()->'app_metadata'->>'role')
) with check (recipient_id=auth.uid());
-- Alerts will be written through trusted server-side functions, not direct browser inserts.
