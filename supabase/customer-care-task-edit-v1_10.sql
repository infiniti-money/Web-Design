-- ATELIER HOME / Tân Design v1.10: editable task metadata with an audit trail.
-- Existing tasks and their statuses remain unchanged.
alter table public.inquiry_care_task_events
 drop constraint if exists inquiry_care_task_events_event_type_check;
alter table public.inquiry_care_task_events
 add constraint inquiry_care_task_events_event_type_check
 check (event_type in (
 'created','status_changed','reassigned','title_changed',
 'details_changed','priority_changed','due_changed'
 ));

create or replace function private.record_care_task_change()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if TG_WHEN='BEFORE' and TG_OP='UPDATE' then
   -- Tasks cannot be silently moved to another customer or attributed to another creator.
   if new.id is distinct from old.id or new.inquiry_id is distinct from old.inquiry_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
   then
     raise exception 'IMMUTABLE_TASK_IDENTITY' using errcode='22023';
   end if;
   if new.due_at is not null and new.due_at > now()+interval '12 months' then
     raise exception 'TASK_DUE_OUT_OF_RANGE' using errcode='22023';
   end if;
   new.updated_at=clock_timestamp();
   if new.status='done' and old.status is distinct from 'done' then
     new.completed_at=now();
   elsif new.status<>'done' then
     new.completed_at=null;
   elsif new.status='done' then
     new.completed_at=old.completed_at;
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
     if old.title is distinct from new.title then
       insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
         values(new.id,new.inquiry_id,'title_changed',old.title,new.title,auth.uid());
     end if;
     if old.details is distinct from new.details then
       insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
         values(new.id,new.inquiry_id,'details_changed',old.details,new.details,auth.uid());
     end if;
     if old.priority is distinct from new.priority then
       insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
         values(new.id,new.inquiry_id,'priority_changed',old.priority,new.priority,auth.uid());
     end if;
     if old.due_at is distinct from new.due_at then
       insert into public.inquiry_care_task_events(task_id,inquiry_id,event_type,previous_value,current_value,actor_id)
         values(new.id,new.inquiry_id,'due_changed',
           case when old.due_at is null then null else old.due_at::text end,
           case when new.due_at is null then null else new.due_at::text end,
           auth.uid());
     end if;
   end if;
 end if;
 return null;
end $$;
revoke all on function private.record_care_task_change() from public,anon,authenticated;
