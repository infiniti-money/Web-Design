-- Tân Design CRM v1.7.0: correct manual care notes without losing prior versions.
-- Customer notes/revisions are deleted together with the inquiry (12-month policy).
alter table public.inquiry_care_notes
  add column if not exists editable boolean not null default true;
alter table public.inquiry_care_notes
  add column if not exists updated_at timestamptz not null default now();

-- Existing automated records must never appear as user-editable notes.
update public.inquiry_care_notes set editable=false
where note_kind='reminder'
  or body='Đã ghi nhận liên hệ thực tế'
  or body like 'Đã chuyển trạng thái: %';

create table if not exists public.inquiry_care_note_revisions(
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  note_id uuid not null references public.inquiry_care_notes(id) on delete cascade,
  previous_body text not null,
  revised_body text not null,
  edited_by uuid not null,
  edited_at timestamptz not null default now()
);
create index if not exists care_note_revisions_inquiry_idx
  on public.inquiry_care_note_revisions(inquiry_id,edited_at desc);
alter table public.inquiry_care_note_revisions enable row level security;
revoke all on public.inquiry_care_note_revisions from public,anon,authenticated;
grant select on public.inquiry_care_note_revisions to authenticated;
create policy "admin view note revisions" on public.inquiry_care_note_revisions
for select to authenticated using (
  (select auth.uid()) is not null
  and (select auth.jwt())->'app_metadata'->>'role'='admin'
);

-- Uses an isolated, audited security-definer function; no direct note UPDATE grant.
-- Optimistic locking blocks editing an out-of-date note from a second Admin session.
create or replace function public.edit_inquiry_care_note(
 p_note_id uuid,p_body text,p_expected_updated_at timestamptz
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_note public.inquiry_care_notes%rowtype;
  v_new text;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or auth.role() is distinct from 'authenticated'
    or auth.jwt()->'app_metadata'->>'role' is distinct from 'admin'
  then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  v_new := btrim(coalesce(p_body,''));
  if char_length(v_new) not between 1 and 1500 then
    raise exception 'INVALID_NOTE_LENGTH' using errcode='22023'; end if;
  if p_note_id is null or p_expected_updated_at is null then
    raise exception 'INVALID_NOTE_REFERENCE' using errcode='22023'; end if;
  select * into v_note from public.inquiry_care_notes
   where id=p_note_id for update;
  if not found or v_note.note_kind<>'note' or not v_note.editable then
    return false; end if;
  if v_note.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_NOTE' using errcode='40001'; end if;
  if v_note.body=v_new then return true; end if;
  insert into public.inquiry_care_note_revisions(
    inquiry_id,note_id,previous_body,revised_body,edited_by
  ) values(v_note.inquiry_id,v_note.id,v_note.body,v_new,v_actor);
  update public.inquiry_care_notes set body=v_new,updated_at=clock_timestamp()
  where id=v_note.id;
  return true;
end;$$;
revoke all on function public.edit_inquiry_care_note(uuid,text,timestamptz)
from public,anon,authenticated;
grant execute on function public.edit_inquiry_care_note(uuid,text,timestamptz)
to authenticated;

-- Completing a reminder clears the active due date without impersonating actual contact.
create or replace function public.complete_inquiry_followup(p_inquiry_id uuid)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_changed integer;
begin
 if p_inquiry_id is null then return false; end if;
 update public.inquiries set follow_up_at=null
  where id=p_inquiry_id and follow_up_at is not null;
 get diagnostics v_changed=row_count;
 if v_changed<>1 then return false; end if;
 insert into public.inquiry_care_notes(inquiry_id,note_kind,body,editable)
 values(p_inquiry_id,'reminder','Đã hoàn thành công việc nhắc liên hệ',false);
 return true;
end;$$;
revoke all on function public.complete_inquiry_followup(uuid) from public,anon;
grant execute on function public.complete_inquiry_followup(uuid) to authenticated;

-- Mark all automated notes as non-editable, including future writes.
create or replace function public.record_inquiry_contact(p_inquiry_id uuid)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_changed integer;
begin
 if p_inquiry_id is null then return false; end if;
 update public.inquiries set
   last_contacted_at=now(),
   status=case when status='new' then 'contacted' else status end
 where id=p_inquiry_id;
 get diagnostics v_changed=row_count;
 if v_changed<>1 then return false; end if;
 insert into public.inquiry_care_notes(inquiry_id,note_kind,body,editable)
 values(p_inquiry_id,'note','Đã ghi nhận liên hệ thực tế',false);
 return true;
end;$$;

create or replace function public.update_inquiry_status_with_log(
 p_inquiry_id uuid,p_status text
) returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_changed integer;
begin
 if p_inquiry_id is null or p_status not in ('new','contacted','quoted','closed')
 then raise exception 'INVALID_STATUS' using errcode='22023'; end if;
 update public.inquiries set status=p_status
 where id=p_inquiry_id and status is distinct from p_status;
 get diagnostics v_changed=row_count;
 if v_changed=1 then
   insert into public.inquiry_care_notes(inquiry_id,note_kind,body,editable)
   values(p_inquiry_id,'note','Đã chuyển trạng thái: '||p_status,false);
   return true;
 end if;
 return exists(select 1 from public.inquiries where id=p_inquiry_id and status=p_status);
end;$$;
