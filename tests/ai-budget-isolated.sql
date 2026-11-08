\set ON_ERROR_STOP on
do $$declare role_name text;begin for role_name in select unnest(array['anon','authenticated','service_role']) loop if not exists(select 1 from pg_roles where rolname=role_name) then execute format('create role %I',role_name);end if;end loop;end $$;
create schema private;
create table private.inquiry_rate_limits(rate_key text primary key,attempts integer check(attempts between 0 and 1000),expires_at timestamptz);
alter table private.inquiry_rate_limits enable row level security;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.inquiry_rate_limits to service_role;
create policy server_only on private.inquiry_rate_limits to service_role using(true) with check(true);
\ir ../supabase/migrations/20261108015706_ai_consultation_budget.sql
insert into private.inquiry_rate_limits values('ip:existing-contact',2,now()+interval '1 hour');
set role service_role;
do $$begin
 for i in 1..5 loop perform public.reserve_ai_consultation_budget(repeat('a',64));end loop;
 begin perform public.reserve_ai_consultation_budget(repeat('a',64));raise exception 'Expected network cap';exception when raise_exception then if sqlerrm<>'AI_QUOTA_EXCEEDED' then raise;end if;end;
 if (select attempts from private.inquiry_rate_limits where rate_key like 'ai-global:%')<>5 then raise exception 'Failed request consumed global count';end if;
 for i in 1..15 loop perform public.reserve_ai_consultation_budget(md5(i::text)||md5(i::text));end loop;
 begin perform public.reserve_ai_consultation_budget(repeat('b',64));raise exception 'Expected global cap';exception when raise_exception then if sqlerrm<>'AI_QUOTA_EXCEEDED' then raise;end if;end;
 if (select attempts from private.inquiry_rate_limits where rate_key='ip:existing-contact')<>2 then raise exception 'Contact throttle changed';end if;
end $$;
reset role;
do $$begin
 if has_function_privilege('anon','public.reserve_ai_consultation_budget(text)','execute') or has_function_privilege('authenticated','public.reserve_ai_consultation_budget(text)','execute') then raise exception 'Browser can reserve budget';end if;
end $$;
select 'AI budget isolated checks passed' as result;
