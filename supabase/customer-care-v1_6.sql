-- ATELIER HOME/Tân Design v1.6: private care timeline and in-app follow-up reminders.
-- All notes cascade-delete with their parent inquiry at the 12-month retention deadline.
alter table public.inquiries
  add column if not exists follow_up_at timestamptz;
create index if not exists inquiries_follow_up_due_idx
  on public.inquiries (follow_up_at) where follow_up_at is not null;

create table if not exists public.inquiry_care_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  note_kind text not null default 'note' check(note_kind in ('note','reminder')),
  body text not null check(char_length(btrim(body)) between 1 and 1500),
  scheduled_for timestamptz,
  author_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists inquiry_care_notes_inquiry_idx
  on public.inquiry_care_notes(inquiry_id, created_at desc);
alter table public.inquiry_care_notes enable row level security;
revoke all on table public.inquiry_care_notes from public, anon, authenticated;
grant select, insert on table public.inquiry_care_notes to authenticated;

create policy "admin read care history"
  on public.inquiry_care_notes for select to authenticated
  using ((select auth.uid()) is not null and
    ((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy "admin add care history"
  on public.inquiry_care_notes for insert to authenticated
  with check ((select auth.uid()) is not null
    and author_id = (select auth.uid())
    and ((select auth.jwt())->'app_metadata'->>'role')='admin');

-- Invoker rights + RLS protect both data writes in the atomic transaction.
create or replace function public.schedule_inquiry_followup(
  p_inquiry_id uuid, p_due_at timestamptz
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare v_changed integer;
begin
  if p_inquiry_id is null then return false; end if;
  if p_due_at is not null and (
    p_due_at < now() - interval '1 day'
    or p_due_at > now() + interval '12 months'
  ) then raise exception 'FOLLOWUP_DATE_OUT_OF_RANGE' using errcode='22023'; end if;
  update public.inquiries set follow_up_at = p_due_at where id=p_inquiry_id;
  get diagnostics v_changed = row_count;
  if v_changed <> 1 then return false; end if;
  insert into public.inquiry_care_notes(inquiry_id,note_kind,body,scheduled_for)
  values(p_inquiry_id,'reminder',
    case when p_due_at is null then 'Hủy lịch nhắc liên hệ'
         else 'Đặt lịch nhắc liên hệ' end, p_due_at);
  return true;
end;$$;
revoke all on function public.schedule_inquiry_followup(uuid,timestamptz) from public, anon;
grant execute on function public.schedule_inquiry_followup(uuid,timestamptz) to authenticated;
