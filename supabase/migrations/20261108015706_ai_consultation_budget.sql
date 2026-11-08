-- Only the server may reserve AI calls. Reuses the existing ephemeral throttle
-- table under a separate namespace; never reads/writes customer or payment rows.
create function public.reserve_ai_consultation_budget(p_network_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  now_at timestamptz:=statement_timestamp();
  day_key text:=to_char(now_at at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD');
  hour_key text:=to_char(now_at at time zone 'UTC','YYYY-MM-DD-HH24');
  reserved text;
begin
  if p_network_hash is null or p_network_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_AI_NETWORK' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atelier-ai-budget',0));
  delete from private.inquiry_rate_limits where rate_key like 'ai-%' and expires_at<now_at;
  insert into private.inquiry_rate_limits as counter(rate_key,attempts,expires_at)
  values('ai-global:'||day_key,1,now_at+interval '2 days')
  on conflict(rate_key) do update set attempts=counter.attempts+1 where counter.attempts<20
  returning rate_key into reserved;
  if reserved is null then raise exception 'AI_QUOTA_EXCEEDED' using errcode='P0001';end if;
  reserved:=null;
  insert into private.inquiry_rate_limits as counter(rate_key,attempts,expires_at)
  values('ai-network:'||hour_key||':'||p_network_hash,1,now_at+interval '2 days')
  on conflict(rate_key) do update set attempts=counter.attempts+1 where counter.attempts<5
  returning rate_key into reserved;
  if reserved is null then raise exception 'AI_QUOTA_EXCEEDED' using errcode='P0001';end if;
  return true;
end;
$$;
revoke all on function public.reserve_ai_consultation_budget(text) from public,anon,authenticated;
grant execute on function public.reserve_ai_consultation_budget(text) to service_role;
comment on function public.reserve_ai_consultation_budget(text) is 'Server-only AI reservation: 20/day Vietnam time globally, 5/hour per rotating network hash. No customer data.';
