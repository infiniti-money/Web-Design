-- ONLY a fresh isolated CI database; never production.
\set ON_ERROR_STOP on
do $$ begin if current_database()<>'payos_test' or to_regclass('auth.users') is not null then raise exception 'ISOLATED_DATABASE_REQUIRED';end if;end $$;
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
\ir ../supabase/migrations/20261105093000_quote_version_immutability.sql
\ir ../supabase/payos-deposits-staging.sql
do $$ declare i jsonb;j jsonb;r jsonb;begin
 if has_function_privilege('anon','public.payos_reserve_deposit(uuid,uuid,uuid,bigint)','EXECUTE') or has_function_privilege('authenticated','public.payos_apply_receipt(bigint,text,bigint,text,text)','EXECUTE') then raise exception 'PUBLIC_RPC_EXPOSED';end if;
 i:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',300000);
 j:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc',300000);
 if j->>'id'<>i->>'id' or (j->>'fresh')::boolean then raise exception 'IDEMPOTENCY_BROKEN';end if;
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',100000);raise exception 'ACTIVE_DUPLICATE_ALLOWED';exception when raise_exception then if sqlerrm<>'PAYOS_ACTIVE_PAYMENT' then raise;end if;end;
 perform public.payos_finish_deposit_link((i->>'id')::uuid,'link-one','https://pay.payos.vn/web/link-one');
 r:=public.payos_apply_receipt((i->>'order_code')::bigint,'ref-one',300000,'VND','link-one');if r->>'status'<>'paid' then raise exception 'PAYMENT_NOT_RECORDED';end if;
 r:=public.payos_apply_receipt((i->>'order_code')::bigint,'ref-one',300000,'VND','link-one');if (r->>'duplicate')::boolean is not true then raise exception 'REPLAY_DUPLICATED';end if;
 begin perform public.payos_apply_receipt((i->>'order_code')::bigint,'ref-one',300001,'VND','link-one');raise exception 'ALTERED_REPLAY_ACCEPTED';exception when raise_exception then if sqlerrm<>'PAYOS_EVENT_CONFLICT' then raise;end if;end;
 begin perform public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',800000);raise exception 'OVER_COLLECTION_ALLOWED';exception when raise_exception then if sqlerrm<>'PAYOS_AMOUNT_EXCEEDS_BALANCE' then raise;end if;end;
 j:=public.payos_reserve_deposit('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','dddddddd-dddd-4ddd-8ddd-dddddddddddd',400000);
 perform public.payos_finish_deposit_link((j->>'id')::uuid,'link-two','https://pay.payos.vn/web/link-two');
 r:=public.payos_apply_receipt((j->>'order_code')::bigint,'partial',200000,'VND','link-two');if r->>'status'<>'needs_review' then raise exception 'PARTIAL_MARKED_PAID';end if;
 r:=public.payos_apply_receipt((j->>'order_code')::bigint,'currency',400000,'USD','link-two');if r->>'status'<>'needs_review' then raise exception 'WRONG_CURRENCY_PAID';end if;
 r:=public.payos_apply_receipt(7999999999999,'unmatched',1000,'VND','unknown');if r->>'status'<>'unmatched' then raise exception 'UNMATCHED_NOT_RECORDED';end if;
 begin perform public.payos_reserve_deposit('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',1);raise exception 'MANAGER_CREATED';exception when raise_exception then if sqlerrm<>'PAYOS_ADMIN_REQUIRED' then raise;end if;end;
 if (select count(*) from public.payos_receipts where reference='ref-one')<>1 or (select count(*) from public.payos_deposit_intents where state='paid')<>1 then raise exception 'LEDGER_COUNTS';end if;
 begin update public.payos_deposit_intents set amount=1;raise exception 'AMOUNT_MUTABLE';exception when raise_exception then if sqlerrm<>'PAYOS_LEDGER_IMMUTABLE' then raise;end if;end;
 begin delete from public.payos_receipts;raise exception 'RECEIPT_DELETABLE';exception when raise_exception then if sqlerrm<>'PAYOS_LEDGER_IMMUTABLE' then raise;end if;end;
end $$;
set local role anon;
do $$ begin begin perform 1 from public.payos_deposit_intents;raise exception 'ANON_READ';exception when insufficient_privilege then null;end;end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"role":"admin"}}',true);
do $$ begin if exists(select 1 from public.payos_deposit_intents) then raise exception 'MANAGER_READ';end if;end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111"}',true);
do $$ begin if (select count(*) from public.payos_deposit_intents)<>2 then raise exception 'ADMIN_READ';end if;end $$;
reset role;
update auth.users set raw_app_meta_data='{"role":"manager"}' where id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
do $$ begin if exists(select 1 from public.payos_deposit_intents) then raise exception 'REVOKED_READ';end if;end $$;
reset role;
select 'PASS: synthetic ledger, replay, remaining amount, receipt quarantine, immutable accounting fields and private RLS' as result;
rollback;
