-- Fresh synthetic database only.
\set ON_ERROR_STOP on
do $$ begin if current_database()<>'payos_general_test' or to_regclass('auth.users') is not null then raise exception 'FRESH_ISOLATED_DATABASE_REQUIRED';end if;end$$;
begin;
create role anon nologin;create role authenticated nologin;create role service_role nologin;
create schema auth;create schema private;create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key,raw_app_meta_data jsonb);
create table public.staff_profiles(user_id uuid primary key,role text,active boolean);
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create function private.current_staff_role() returns text language sql stable security definer set search_path='' as $$select sp.role from public.staff_profiles sp join auth.users u on u.id=sp.user_id where sp.user_id=auth.uid() and sp.active and sp.role=u.raw_app_meta_data->>'role'$$;
revoke all on function private.current_staff_role() from public,anon,authenticated,service_role;
grant usage on schema private,auth to authenticated;
grant execute on function private.current_staff_role() to authenticated;
create table public.customer_quotes(id uuid primary key,status text,approved_by uuid,approved_version_id uuid);
create table public.customer_quote_versions(id uuid primary key,quote_id uuid,version_no integer,total_amount numeric,content jsonb);
insert into auth.users values('11111111-1111-4111-8111-111111111111','{"role":"admin"}'),('22222222-2222-4222-8222-222222222222','{"role":"manager"}');
insert into public.staff_profiles values('11111111-1111-4111-8111-111111111111','admin',true),('22222222-2222-4222-8222-222222222222','manager',true);
insert into public.customer_quotes values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','accepted','11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.customer_quote_versions values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,1000000,'{"total":1000000}');
\ir ../supabase/migrations/20261107180731_payos_reconciliation_admin.sql
\ir ../supabase/migrations/20261107183121_payos_general_availability.sql
do $test$ declare i jsonb;j jsonb;r jsonb;b jsonb;begin
 update private.payos_pilot_policy set enabled=true,quote_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',amount=300000;
 perform public.payos_record_review('11111111-1111-4111-8111-111111111111',null,null,'webhook_confirmed','Synthetic verified provider URL');
 -- Retain a paid pilot before switching to general availability.
 i:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',300000);
 perform public.payos_finish_deposit_link((i->>'id')::uuid,'pilot','https://pay.payos.vn/web/pilot');
 perform public.payos_apply_receipt((i->>'order_code')::bigint,'pilot-bank',300000,'VND','pilot');
 update private.payos_pilot_policy set general_availability=true;
 i:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',350000);
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','88888888-8888-4888-8888-888888888888',1);raise exception 'ACTIVE_NOT_BLOCKED';exception when raise_exception then if sqlerrm<>'PAYOS_ACTIVE_PAYMENT' then raise;end if;end;
 perform public.payos_finish_deposit_link((i->>'id')::uuid,'second','https://pay.payos.vn/web/second');
 perform public.payos_apply_receipt((i->>'order_code')::bigint,'second-bank',350000,'VND','second');
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','88888888-8888-4888-8888-888888888888',350001);raise exception 'PILOT_NOT_COUNTED';exception when raise_exception then if sqlerrm<>'PAYOS_AMOUNT_EXCEEDS_BALANCE' then raise;end if;end;
 b:=public.payos_quote_balances('11111111-1111-4111-8111-111111111111',array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid]);
 if (b->0->>'remaining')::bigint<>350000 or (b->0->>'committed')::bigint<>650000 then raise exception 'BALANCE_WRONG';end if;
 i:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','88888888-8888-4888-8888-888888888888',350000);
 r:=public.payos_sync_provider('11111111-1111-4111-8111-111111111111',(i->>'id')::uuid,jsonb_build_object('paymentLinkId','cancelled','orderCode',(i->>'order_code')::bigint,'amount',350000,'amountPaid',0,'amountRemaining',350000,'status','CANCELLED','transactions','[]'::jsonb),'Signed zero cancellation');
 if r->>'state'<>'cancelled' then raise exception 'CANCELLATION_FAILED';end if;
 j:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','99999999-9999-4999-8999-999999999999',350000);
 perform public.payos_finish_deposit_link((j->>'id')::uuid,'final','https://pay.payos.vn/web/final');
 perform public.payos_apply_receipt((j->>'order_code')::bigint,'final-bank',350000,'VND','final');
 if (select sum(amount) from public.payos_deposit_intents where state='paid')<>1000000 then raise exception 'INCORRECT_PAID_TOTAL';end if;
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777',1);raise exception 'OVER_COLLECTION';exception when raise_exception then if sqlerrm<>'PAYOS_AMOUNT_EXCEEDS_BALANCE' then raise;end if;end;
 insert into public.customer_quotes values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','accepted','11111111-1111-4111-8111-111111111111','ffffffff-ffff-4fff-8fff-ffffffffffff');
 insert into public.customer_quote_versions values('ffffffff-ffff-4fff-8fff-ffffffffffff','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',1,2000000,'{"total":2000000}');
 i:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','77777777-7777-4777-8777-777777777777',120000);
 j:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','77777777-7777-4777-8777-777777777777',120000);
 if (j->>'fresh')::boolean or j->>'id'<>i->>'id' then raise exception 'REPLAY_CHANGED';end if;
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-7777-4777-8777-777777777777',120000);raise exception 'KEY_REUSE_ALLOWED';exception when raise_exception then if sqlerrm<>'PAYOS_REQUEST_KEY_REUSED' then raise;end if;end;
 update private.payos_pilot_policy set enabled=false;
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','66666666-6666-4666-8666-666666666666',1);raise exception 'STOP_NEW_BROKEN';exception when raise_exception then if sqlerrm<>'PAYOS_COLLECTION_DISABLED' then raise;end if;end;
 begin perform public.payos_quote_balances('22222222-2222-4222-8222-222222222222',array['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid]);raise exception 'MANAGER_BALANCE';exception when raise_exception then if sqlerrm<>'PAYOS_ADMIN_REQUIRED' then raise;end if;end;
 if has_function_privilege('authenticated','public.payos_quote_balances(uuid,uuid[])','EXECUTE') then raise exception 'PUBLIC_BALANCE_RPC';end if;
end $test$;
select 'PASS: general quotes/amounts, pilot retained, remaining balance, active reservation, cancellation, replay and stop-new policy' as result;
rollback;
