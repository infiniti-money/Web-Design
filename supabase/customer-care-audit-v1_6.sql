-- Care audit log for actual contact and status changes; atomic server-side operations.
create or replace function public.record_inquiry_contact(p_inquiry_id uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_changed integer;
begin
  if p_inquiry_id is null then return false; end if;
  update public.inquiries
    set last_contacted_at=now(),status=case when status='new' then 'contacted' else status end
    where id=p_inquiry_id;
  get diagnostics v_changed=row_count;
  if v_changed<>1 then return false; end if;
  insert into public.inquiry_care_notes(inquiry_id,note_kind,body)
    values(p_inquiry_id,'note','Đã ghi nhận liên hệ thực tế');
  return true;
end;$$;
revoke all on function public.record_inquiry_contact(uuid) from PUBLIC,anon;
grant execute on function public.record_inquiry_contact(uuid) to authenticated;

create or replace function public.update_inquiry_status_with_log(
  p_inquiry_id uuid,p_status text
) returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_changed integer;
begin
 if p_inquiry_id is null or p_status not in ('new','contacted','quoted','closed')
 then raise exception 'INVALID_STATUS' using errcode='22023'; end if;
 update public.inquiries set status=p_status
 where id=p_inquiry_id and status is distinct from p_status;
 get diagnostics v_changed=row_count;
 if v_changed=1 then
   insert into public.inquiry_care_notes(inquiry_id,note_kind,body)
     values(p_inquiry_id,'note','Đã chuyển trạng thái: '||p_status);
   return true;
 end if;
 return exists(select 1 from public.inquiries where id=p_inquiry_id and status=p_status);
end;$$;
revoke all on function public.update_inquiry_status_with_log(uuid,text) from PUBLIC,anon;
grant execute on function public.update_inquiry_status_with_log(uuid,text) to authenticated;
