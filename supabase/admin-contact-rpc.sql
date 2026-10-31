-- Server-timed, atomic Admin contact acknowledgement.
-- RLS permits updating only for a verified authenticated admin JWT.
-- Service time from PostgreSQL now(), not the admin's browser clock.
create or replace function public.record_inquiry_contact(p_inquiry_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare changed integer;
begin
  if p_inquiry_id is null then return false; end if;
  update public.inquiries
     set last_contacted_at = now(),
         status = case when status = 'new' then 'contacted' else status end
   where id = p_inquiry_id;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.record_inquiry_contact(uuid) from PUBLIC, anon;
grant execute on function public.record_inquiry_contact(uuid) to authenticated;

-- An authorized Admin uses supabase.rpc("record_inquiry_contact", {p_inquiry_id:id}).
-- Reject other JWT roles using existing public.inquiries RLS update policy.
