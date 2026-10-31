-- Applied to project atelier-home-web-design as migration secure_inquiry_rate_limit_and_rpc.
-- This file is the repeatable source of truth for the protected submission gateway.
-- IMPORTANT: run only with trusted administrative SQL permissions.
create schema if not exists private;
revoke all on schema private from PUBLIC, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.inquiry_rate_limits(
  rate_key text primary key,
  attempts integer not null default 0 check (attempts between 0 and 1000),
  expires_at timestamptz not null
);
alter table private.inquiry_rate_limits enable row level security;
revoke all on private.inquiry_rate_limits from PUBLIC, anon, authenticated;
grant select, insert, update, delete on private.inquiry_rate_limits to service_role;
create index if not exists inquiry_rate_limits_expire_idx
  on private.inquiry_rate_limits(expires_at);

create or replace function public.submit_inquiry_secure(
  p_full_name text, p_phone text, p_service text, p_space text, p_details text,
  p_ip_key text, p_phone_key text
) returns uuid
language plpgsql security invoker set search_path=''
as $$
declare
  result_id uuid;
  lock_key text;
begin
  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 100
     or p_phone is null or p_phone !~ '^[0-9+(). -]{9,18}$'
     or p_service not in ('Thiết kế nội thất','Thi công trọn gói','Tư vấn & trang trí')
     or char_length(coalesce(p_space,'')) > 100
     or char_length(coalesce(p_details,'')) > 1000
     or p_ip_key !~ '^ip:[0-9a-f]{64}$'
     or p_phone_key !~ '^phone:[0-9a-f]{64}$'
  then
    raise exception 'INVALID_REQUEST' using errcode='22023';
  end if;

  insert into private.inquiry_rate_limits as x(rate_key,attempts,expires_at)
  values(p_ip_key,1,now()+interval '1 hour')
  on conflict(rate_key) do update
    set attempts=x.attempts+1 where x.attempts < 3
  returning rate_key into lock_key;
  if lock_key is null then
    raise exception 'RATE_LIMIT_EXCEEDED' using errcode='P0001';
  end if;

  lock_key:=null;
  insert into private.inquiry_rate_limits as x(rate_key,attempts,expires_at)
  values(p_phone_key,1,now()+interval '1 day')
  on conflict(rate_key) do update
    set attempts=x.attempts+1 where x.attempts < 5
  returning rate_key into lock_key;
  if lock_key is null then
    raise exception 'RATE_LIMIT_EXCEEDED' using errcode='P0001';
  end if;

  insert into public.inquiries(full_name,phone,service,space,details,status,consented_at,privacy_policy_version)
  values(btrim(p_full_name),btrim(p_phone),p_service,
         coalesce(nullif(btrim(p_space),''),'Khác'),
         coalesce(btrim(p_details),''),'new',now(),'2026-10-31-retention-12m')
  returning id into result_id;

  if random()<0.02 then
    delete from private.inquiry_rate_limits
    where expires_at < now()-interval '2 days';
  end if;
  return result_id;
end
$$;

revoke all on function public.submit_inquiry_secure(text,text,text,text,text,text,text)
  from PUBLIC, anon, authenticated;
grant execute on function public.submit_inquiry_secure(text,text,text,text,text,text,text)
  to service_role;

-- When the deployed website uses submit-inquiry and tests pass, cut over:
revoke insert on public.inquiries from anon;
drop policy if exists "visitors send inquiries" on public.inquiries;
