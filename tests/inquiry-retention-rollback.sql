-- Non-destructive validation of ATELIER HOME 12-month retention.
-- Run in Supabase SQL Editor as trusted administrator.
-- Every synthetic write and purge is inside one transaction rolled back at the end.
begin;
do $$
declare
 expired_id uuid;
 recent_contact_id uuid;
 legal_hold_id uuid;
 removed integer;
 n integer;
begin
  insert into public.inquiries(full_name,phone,service,space,details,status,created_at)
  values('Retention expired test','0900000001','Thiết kế nội thất','Căn hộ',
         'ROLLBACK_RETENTION_EXPIRED','new',now()-interval '14 months')
  returning id into expired_id;

  insert into public.inquiries(full_name,phone,service,space,details,status,created_at,last_contacted_at)
  values('Retention contacted test','0900000002','Thiết kế nội thất','Căn hộ',
         'ROLLBACK_RETENTION_ACTIVE','contacted',now()-interval '14 months',now()-interval '1 month')
  returning id into recent_contact_id;

  insert into public.inquiries(full_name,phone,service,space,details,status,created_at,legal_hold_until)
  values('Retention legal hold','0900000003','Thiết kế nội thất','Căn hộ',
         'ROLLBACK_RETENTION_HOLD','new',now()-interval '14 months',now()+interval '6 months')
  returning id into legal_hold_id;

  removed:=private.purge_expired_inquiries();
  if removed<>1 then raise exception 'Expected one deletion, got %',removed; end if;

  select count(*) into n from public.inquiries where id=expired_id;
  if n<>0 then raise exception 'Expired record was not deleted'; end if;

  select count(*) into n from public.inquiries where id in(recent_contact_id,legal_hold_id);
  if n<>2 then raise exception 'Active or legally retained record was deleted'; end if;
end $$;
rollback;
select count(*)::integer as remaining_test_records
from public.inquiries where details like 'ROLLBACK_RETENTION_%';
-- Expected remaining_test_records = 0.
