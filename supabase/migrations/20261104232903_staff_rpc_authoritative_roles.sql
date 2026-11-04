-- Preserve existing RPC behavior; validate current Auth metadata and active staff role.
CREATE OR REPLACE FUNCTION public.care_advance(p_inquiry uuid, p_next text, p_note text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare old_stage text; allowed boolean; active_role text; days_allowed integer;
begin
 active_role := private.current_staff_role();
 if active_role is null or active_role not in ('admin','manager') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if p_inquiry is null or p_next not in ('consult','survey','quote','contract') or length(coalesce(p_note,''))>1000
 then raise exception 'INVALID_INPUT'; end if;
 if not exists(select 1 from public.inquiries where id=p_inquiry) then raise exception 'NOT_FOUND'; end if;
 insert into public.care_workflow(inquiry_id) values(p_inquiry) on conflict do nothing;
 select stage into old_stage from public.care_workflow where inquiry_id=p_inquiry for update;
 allowed=(old_stage='intake' and p_next='consult') or (old_stage='consult' and p_next='survey')
 or (old_stage='survey' and p_next='quote') or (old_stage='quote' and p_next='contract');
 if not allowed then raise exception 'INVALID_STAGE_TRANSITION'; end if;
 days_allowed=case p_next when 'consult' then 2 when 'survey' then 3 when 'quote' then 2 else 7 end;
 update public.care_workflow set stage=p_next,started_at=now(),due_at=now()+(days_allowed || ' days')::interval,updated_at=now()
 where inquiry_id=p_inquiry;
 insert into public.care_workflow_events(inquiry_id,previous_stage,next_stage,actor_id,note)
 values(p_inquiry,old_stage,p_next,auth.uid(),coalesce(p_note,''));
 return p_next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.edit_inquiry_care_note(p_note_id uuid, p_body text, p_expected_updated_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_note public.inquiry_care_notes%rowtype;
  v_new text;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or private.current_staff_role() is distinct from 'admin'
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
end;$function$
;

CREATE OR REPLACE FUNCTION public.generate_task_due_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor_role text; inserted_rows integer;
begin
 actor_role := private.current_staff_role();
 if actor_role is distinct from 'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501';end if;
 insert into public.staff_notifications(recipient_id,task_id,event_key,kind,title,body)
 select t.assignee_user_id,t.id,t.id::text||':due:'||case when t.due_at<now() then 'overdue:'||to_char(t.due_at,'YYYYMMDDHH24MI') else 'soon:'||to_char(t.due_at,'YYYYMMDDHH24MI') end,
 case when t.due_at<now() then 'overdue' else 'due_soon' end,
 case when t.due_at<now() then 'Công việc quá hạn' else 'Công việc sắp đến hạn' end,
 left(t.title,600)
 from public.inquiry_care_tasks t join public.staff_profiles s on s.user_id=t.assignee_user_id and s.active
 where t.due_at is not null and t.completed_at is null
 and t.status not in ('completed','cancelled')
 and t.due_at < now()+interval '24 hours'
 on conflict(recipient_id,event_key) do nothing;
 get diagnostics inserted_rows=row_count;
 return inserted_rows;
end;$function$
;
