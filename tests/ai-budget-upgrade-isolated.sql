\set ON_ERROR_STOP on
\ir ai-budget-isolated.sql
\ir ../supabase/migrations/20261108024335_ai_verified_free_tier_limits.sql
do $$begin
 if (select attempts from private.inquiry_rate_limits where rate_key like 'ai-google-day:%')<>20 then raise exception 'Upgrade reset existing AI usage';end if;
end $$;
set role service_role;
do $$begin
 for i in 1..15 loop perform public.reserve_ai_consultation_budget(md5(i::text)||md5(i::text),1000);end loop;
 begin perform public.reserve_ai_consultation_budget(repeat('f',64),1000);raise exception 'Expected 15 RPM cap';exception when raise_exception then if sqlerrm<>'AI_QUOTA_EXCEEDED' then raise;end if;end;
 if (select attempts from private.inquiry_rate_limits where rate_key like 'ai-google-day:%')<>35 then raise exception 'Denied RPM consumed day quota';end if;
end $$;
reset role;
update private.inquiry_rate_limits set attempts=499 where rate_key like 'ai-google-day:%';
update private.inquiry_rate_limits set attempts=0 where rate_key like 'ai-google-minute:%' or rate_key like 'ai-google-token-units:%';
set role service_role;
do $$begin
 perform public.reserve_ai_consultation_budget(repeat('b',64),1000);
 begin perform public.reserve_ai_consultation_budget(repeat('b',64),1000);raise exception 'Expected 500 RPD cap';exception when raise_exception then if sqlerrm<>'AI_QUOTA_EXCEEDED' then raise;end if;end;
 if (select attempts from private.inquiry_rate_limits where rate_key like 'ai-google-day:%')<>500 then raise exception 'Day quota exceeded';end if;
end $$;
reset role;
update private.inquiry_rate_limits set attempts=100 where rate_key like 'ai-google-day:%';
update private.inquiry_rate_limits set attempts=0 where rate_key like 'ai-google-minute:%';
update private.inquiry_rate_limits set attempts=249 where rate_key like 'ai-google-token-units:%';
set role service_role;
do $$begin
 begin perform public.reserve_ai_consultation_budget(repeat('c',64),1001);raise exception 'Expected 250K input TPM cap';exception when raise_exception then if sqlerrm<>'AI_QUOTA_EXCEEDED' then raise;end if;end;
 if (select attempts from private.inquiry_rate_limits where rate_key like 'ai-google-day:%')<>100 then raise exception 'Denied token reservation consumed daily quota';end if;
 perform public.reserve_ai_consultation_budget(repeat('c',64),1000);
 if (select attempts from private.inquiry_rate_limits where rate_key like 'ai-google-token-units:%')<>250 then raise exception 'Token units were not rounded correctly';end if;
end $$;
reset role;
do $$begin
 if has_function_privilege('anon','public.reserve_ai_consultation_budget(text,integer)','execute') or has_function_privilege('authenticated','public.reserve_ai_consultation_budget(text,integer)','execute') then raise exception 'Browser can reserve quota';end if;
 if to_regprocedure('public.reserve_ai_consultation_budget(text)') is not null then raise exception 'Ambiguous legacy RPC overload';end if;
 if (select attempts from private.inquiry_rate_limits where rate_key='ip:existing-contact')<>2 then raise exception 'Contact throttle changed';end if;
end $$;
select 'Verified Free tier upgrade tests passed: 500 RPD / 15 RPM / 250K input TPM' as result;
