-- Authorized quote/contract mutations; append-only audit.
create table if not exists public.commercial_audit (
 id bigint generated always as identity primary key,
 entity_kind text not null check(entity_kind in ('quote','contract')),
 entity_id uuid not null,
 action text not null,
 actor_id uuid not null references auth.users(id),
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.commercial_audit enable row level security;
revoke all on public.commercial_audit from anon,authenticated;
grant select on public.commercial_audit to authenticated;
create policy commercial_audit_read on public.commercial_audit for select to authenticated using (
 exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role')
);
create or replace function public.commercial_action(p_kind text,p_action text,p_id uuid default null,p_inquiry uuid default null,p_title text default null,p_amount numeric default null,p_content jsonb default null)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_role text;v_id uuid;v_status text;v_inquiry uuid;v_quote uuid;v_n integer;
begin
 select s.role into v_role from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role';
 if v_role is null then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if p_kind not in ('quote','contract') then raise exception 'INVALID_KIND';end if;
 if p_kind='quote' then
  if p_action='create' then
   if p_inquiry is null or length(trim(coalesce(p_title,''))) not between 3 and 180 then raise exception 'INVALID_QUOTE';end if;
   insert into public.customer_quotes(inquiry_id,title,created_by) values(p_inquiry,trim(p_title),auth.uid()) returning id into v_id;
  elsif p_action='revise' then
   select status into v_status from public.customer_quotes where id=p_id for update;
   if v_status not in ('draft','rejected') then raise exception 'REVISION_NOT_ALLOWED';end if;
   if p_amount is null or p_amount<0 or p_content is null or jsonb_typeof(p_content)<>'object' then raise exception 'INVALID_VERSION';end if;
   select coalesce(max(version_no),0)+1 into v_n from public.customer_quote_versions where quote_id=p_id;
   insert into public.customer_quote_versions(quote_id,version_no,total_amount,content,created_by) values(p_id,v_n,p_amount,p_content,auth.uid());
   v_id:=p_id;
  else
   select status into v_status from public.customer_quotes where id=p_id for update;
   if v_status is null then raise exception 'QUOTE_NOT_FOUND';end if;
   if (p_action='submit' and v_status in ('draft','rejected') and exists(select 1 from public.customer_quote_versions where quote_id=p_id))
   or (p_action='approve' and v_status='submitted' and v_role='admin')
   or (p_action='reject' and v_status='submitted' and v_role='admin')
   or (p_action='send' and v_status='approved')
   or (p_action='accept' and v_status='sent') then
    update public.customer_quotes set status=case p_action when 'submit' then 'submitted' when 'approve' then 'approved' when 'reject' then 'rejected' when 'send' then 'sent' else 'accepted' end,
    approved_by=case when p_action='approve' then auth.uid() else approved_by end where id=p_id;
    v_id:=p_id;
   else raise exception 'INVALID_QUOTE_TRANSITION'; end if;
  end if;
 else
  if p_action='create' then
   if p_inquiry is null or length(trim(coalesce(p_title,''))) not between 3 and 90 then raise exception 'INVALID_CONTRACT';end if;
   insert into public.customer_contracts(inquiry_id,contract_number,description,created_by) values(p_inquiry,trim(p_title),coalesce(p_content->>'description',''),auth.uid()) returning id into v_id;
  else
   select status into v_status from public.customer_contracts where id=p_id for update;
   if v_status is null then raise exception 'CONTRACT_NOT_FOUND';end if;
   if (p_action='review' and v_status='draft') or (p_action='sign' and v_status='review' and v_role='admin')
   or (p_action='activate' and v_status='signed' and v_role='admin')
   or (p_action='complete' and v_status='active' and v_role='admin') then
    update public.customer_contracts set status=case p_action when 'review' then 'review' when 'sign' then 'signed' when 'activate' then 'active' else 'completed' end,
    signed_at=case when p_action='sign' then now() else signed_at end where id=p_id;
    v_id:=p_id;
   else raise exception 'INVALID_CONTRACT_TRANSITION';end if;
  end if;
 end if;
 insert into public.commercial_audit(entity_kind,entity_id,action,actor_id,details) values(p_kind,v_id,p_action,auth.uid(),jsonb_build_object('amount',p_amount));
 return v_id;
end;
$fn$;
revoke all on function public.commercial_action(text,text,uuid,uuid,text,numeric,jsonb) from public,anon;
grant execute on function public.commercial_action(text,text,uuid,uuid,text,numeric,jsonb) to authenticated;
