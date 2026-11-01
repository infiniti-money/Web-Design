-- Apply after care-workflow-v1_14.sql. Server controls transitions and SLA.
create or replace function public.care_advance(p_inquiry uuid,p_next text,p_note text default '')
returns text language plpgsql security definer set search_path = ''
as $function$
declare old_stage text; allowed boolean; active_role text; days_allowed integer;
begin
 select role into active_role from public.staff_profiles
 where user_id=auth.uid() and active=true
 and role in ('admin','manager') and role=auth.jwt()->'app_metadata'->>'role';
 if active_role is null then raise exception 'NOT_AUTHORIZED'; end if;
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
$function$;
revoke all on function public.care_advance(uuid,text,text) from public,anon;
grant execute on function public.care_advance(uuid,text,text) to authenticated;
