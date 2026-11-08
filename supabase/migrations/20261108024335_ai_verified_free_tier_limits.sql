-- Limits verified from the owner's AI Studio screenshot on 2026-11-08:
-- Gemini 3.5 Flash-Lite: 15 RPM, 250K input TPM, 500 RPD. No billing upgrade.
-- Input is reserved conservatively by UTF-8 bytes rounded up to 1,000-token units.
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atelier-ai-budget',0));
insert into private.inquiry_rate_limits(rate_key,attempts,expires_at)
select 'ai-google-day:'||to_char(statement_timestamp() at time zone 'America/Los_Angeles','YYYY-MM-DD'),
 least(500,coalesce(sum(attempts),0))::integer,statement_timestamp()+interval '2 days'
from private.inquiry_rate_limits where rate_key like 'ai-global:%' and expires_at>statement_timestamp()
on conflict(rate_key) do nothing;
drop function public.reserve_ai_consultation_budget(text);
create function public.reserve_ai_consultation_budget(p_network_hash text,p_input_tokens integer default 32000)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
 now_at timestamptz:=statement_timestamp();
 day_key text:=to_char(now_at at time zone 'America/Los_Angeles','YYYY-MM-DD');
 minute_key text:=to_char(now_at at time zone 'UTC','YYYY-MM-DD-HH24-MI');
 hour_key text:=to_char(now_at at time zone 'UTC','YYYY-MM-DD-HH24');
 units integer; reserved text;
begin
 if p_network_hash is null or p_network_hash !~ '^[0-9a-f]{64}$' or p_input_tokens is null or p_input_tokens<1 or p_input_tokens>60000 then raise exception 'INVALID_AI_NETWORK' using errcode='22023';end if;
 units:=ceil(p_input_tokens::numeric/1000)::integer;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atelier-ai-budget',0));
 delete from private.inquiry_rate_limits where rate_key like 'ai-%' and expires_at<now_at;
 insert into private.inquiry_rate_limits as c(rate_key,attempts,expires_at) values('ai-google-day:'||day_key,1,now_at+interval '2 days')
 on conflict(rate_key) do update set attempts=c.attempts+1 where c.attempts<500 returning rate_key into reserved;
 if reserved is null then raise exception 'AI_QUOTA_EXCEEDED';end if;
 reserved:=null;
 insert into private.inquiry_rate_limits as c(rate_key,attempts,expires_at) values('ai-google-minute:'||minute_key,1,now_at+interval '2 hours')
 on conflict(rate_key) do update set attempts=c.attempts+1 where c.attempts<15 returning rate_key into reserved;
 if reserved is null then raise exception 'AI_QUOTA_EXCEEDED';end if;
 reserved:=null;
 insert into private.inquiry_rate_limits as c(rate_key,attempts,expires_at) values('ai-google-token-units:'||minute_key,units,now_at+interval '2 hours')
 on conflict(rate_key) do update set attempts=c.attempts+units where c.attempts+units<=250 returning rate_key into reserved;
 if reserved is null then raise exception 'AI_QUOTA_EXCEEDED';end if;
 reserved:=null;
 insert into private.inquiry_rate_limits as c(rate_key,attempts,expires_at) values('ai-network:'||hour_key||':'||p_network_hash,1,now_at+interval '2 days')
 on conflict(rate_key) do update set attempts=c.attempts+1 where c.attempts<30 returning rate_key into reserved;
 if reserved is null then raise exception 'AI_QUOTA_EXCEEDED';end if;
 return true;
end;
$$;
revoke all on function public.reserve_ai_consultation_budget(text,integer) from public,anon,authenticated;
grant execute on function public.reserve_ai_consultation_budget(text,integer) to service_role;
comment on function public.reserve_ai_consultation_budget(text,integer) is 'Server-only verified Gemini limits: 500/Pacific day, 15/min, 250K input token units/min; anti-abuse 30/network hour. Existing usage retained conservatively.';
