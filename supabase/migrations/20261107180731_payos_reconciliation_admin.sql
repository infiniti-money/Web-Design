-- Generated foundation: quote guard + ledger + reconciliation. Apply once to a project without a payOS ledger.
-- PR #18 carry-forward for the current v1.20 schema.
-- Preserve the original data and current commercial_action RPC.
-- Apply only after a verified, restorable backup and an independent staging test.
-- A revised quote must always INSERT a new version, never overwrite history.
CREATE OR REPLACE FUNCTION private.commercial_quote_version_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $guard$
BEGIN
  RAISE EXCEPTION 'QUOTE_VERSION_IMMUTABLE'
    USING ERRCODE = '23514',
          HINT = 'Create a new quote version via commercial_action instead of editing history';
END;
$guard$;

REVOKE ALL ON FUNCTION private.commercial_quote_version_append_only()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS commercial_quote_version_append_only
  ON public.customer_quote_versions;
CREATE TRIGGER commercial_quote_version_append_only
  BEFORE UPDATE OR DELETE ON public.customer_quote_versions
  FOR EACH ROW EXECUTE FUNCTION private.commercial_quote_version_append_only();

-- Generated locally by CLI as 20261107164123_payos_deposit_ledger, held OUTSIDE migrations.
-- STAGING ONLY until independent production backup/restore + business/UAT signoff.
do $$ begin
 if not exists(select 1 from pg_trigger where tgrelid='public.customer_quote_versions'::regclass
   and tgname='commercial_quote_version_append_only' and tgenabled='O' and not tgisinternal) then
   raise exception 'PAYOS_QUOTE_HISTORY_UNPROTECTED';
 end if;
end $$;
create sequence public.payos_order_code_seq as bigint minvalue 7000000000000 maxvalue 9007199254740991 start 7000000000000;
revoke all on sequence public.payos_order_code_seq from public,anon,authenticated,service_role;
create table public.payos_deposit_intents(
 id uuid primary key default gen_random_uuid(),request_key uuid not null unique,
 quote_id uuid not null,quote_version_id uuid not null,snapshot jsonb not null,
 amount bigint not null check(amount>0 and amount<=9007199254740991),
 order_code bigint not null unique default nextval('public.payos_order_code_seq'),
 state text not null default 'reserved' check(state in ('reserved','ready','unknown','review','paid')),
 payment_link_id text unique,checkout_url text,created_by uuid not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index on public.payos_deposit_intents(quote_id,state);
create table public.payos_receipts(
 id bigint generated always as identity primary key,intent_id uuid references public.payos_deposit_intents(id),
 order_code bigint not null,reference text not null check(length(reference) between 1 and 200),
 amount bigint not null check(amount>0 and amount<=9007199254740991),currency text not null,
 payment_link_id text not null,result text not null,created_at timestamptz not null default now(),
 unique(order_code,reference)
);
revoke all on public.payos_deposit_intents,public.payos_receipts from public,anon,authenticated,service_role;
alter table public.payos_deposit_intents enable row level security;
alter table public.payos_receipts enable row level security;
grant select on public.payos_deposit_intents,public.payos_receipts to authenticated;
create policy payos_admin_read on public.payos_deposit_intents for select to authenticated using((select private.current_staff_role())='admin');
create policy payos_admin_read on public.payos_receipts for select to authenticated using((select private.current_staff_role())='admin');

create function private.payos_immutable_fields() returns trigger language plpgsql set search_path='' as $$ begin
 if tg_op='DELETE' or tg_table_name='payos_receipts' then raise exception 'PAYOS_LEDGER_IMMUTABLE';end if;
 if row(new.id,new.request_key,new.quote_id,new.quote_version_id,new.snapshot,new.amount,new.order_code,new.created_by,new.created_at)
   is distinct from row(old.id,old.request_key,old.quote_id,old.quote_version_id,old.snapshot,old.amount,old.order_code,old.created_by,old.created_at)
 then raise exception 'PAYOS_LEDGER_IMMUTABLE';end if;
 if old.state='paid' and new.state<>'paid' then raise exception 'PAYOS_PAID_IMMUTABLE';end if;
 if old.payment_link_id is not null and new.payment_link_id is distinct from old.payment_link_id then raise exception 'PAYOS_LINK_IMMUTABLE';end if;
 new.updated_at=now();return new;
end $$;
revoke all on function private.payos_immutable_fields() from public,anon,authenticated,service_role;
create trigger payos_intent_guard before update or delete on public.payos_deposit_intents for each row execute function private.payos_immutable_fields();
create trigger payos_receipt_guard before update or delete on public.payos_receipts for each row execute function private.payos_immutable_fields();

create function public.payos_reserve_deposit(p_actor uuid,p_quote uuid,p_key uuid,p_amount bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q record;v record;i public.payos_deposit_intents;reserved numeric;pilot record;
begin
 if not exists(select 1 from public.staff_profiles sp join auth.users u on u.id=sp.user_id where sp.user_id=p_actor and sp.active and sp.role='admin' and u.raw_app_meta_data->>'role'='admin') then raise exception 'PAYOS_ADMIN_REQUIRED';end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.customer_quote_versions'::regclass and tgname='commercial_quote_version_append_only' and tgenabled='O' and not tgisinternal) then raise exception 'PAYOS_QUOTE_HISTORY_UNPROTECTED';end if;
 select * into q from public.customer_quotes where id=p_quote for update;
 if not found or q.status<>'accepted' or q.approved_by is null or q.approved_version_id is null then raise exception 'PAYOS_QUOTE_NOT_ACCEPTED';end if;
 select * into i from public.payos_deposit_intents where request_key=p_key;
 if found then
   if i.quote_id<>p_quote or i.amount<>p_amount or i.created_by<>p_actor then raise exception 'PAYOS_REQUEST_KEY_REUSED';end if;
   return to_jsonb(i)||jsonb_build_object('fresh',false);
 end if;
 if to_regclass('private.payos_pilot_policy') is not null then
   select * into pilot from private.payos_pilot_policy where singleton;
   if not found or not pilot.enabled then raise exception 'PAYOS_PILOT_DISABLED';end if;
   if pilot.quote_id is distinct from p_quote or pilot.amount is distinct from p_amount then raise exception 'PAYOS_PILOT_SCOPE_ONLY';end if;
   if exists(select 1 from public.payos_deposit_intents where quote_id=p_quote) then raise exception 'PAYOS_PILOT_ALREADY_CREATED';end if;
   if not exists(select 1 from public.payos_admin_events where kind='webhook_confirmed') then raise exception 'PAYOS_WEBHOOK_NOT_CONFIRMED';end if;
 end if;
 select * into v from public.customer_quote_versions where id=q.approved_version_id and quote_id=p_quote;
 if not found or v.total_amount is null or v.total_amount<>trunc(v.total_amount) or v.total_amount>9007199254740991 or p_amount is null or p_amount<=0 then raise exception 'PAYOS_AMOUNT_EXCEEDS_BALANCE';end if;
 if exists(select 1 from public.payos_deposit_intents where quote_id=p_quote and state in('reserved','ready','unknown','review')) then raise exception 'PAYOS_ACTIVE_PAYMENT';end if;
 select coalesce(sum(amount),0) into reserved from public.payos_deposit_intents where quote_id=p_quote and state<>'cancelled';
 if p_amount>v.total_amount-reserved then raise exception 'PAYOS_AMOUNT_EXCEEDS_BALANCE';end if;
 insert into public.payos_deposit_intents(request_key,quote_id,quote_version_id,amount,created_by,snapshot)
 values(p_key,p_quote,v.id,p_amount,p_actor,jsonb_build_object('version_no',v.version_no,'total_amount',v.total_amount,'content_sha256',encode(extensions.digest(v.content::text,'sha256'),'hex'))) returning * into i;
 return to_jsonb(i)||jsonb_build_object('fresh',true);
end $$;

create function public.payos_finish_deposit_link(p_id uuid,p_link text,p_url text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.payos_deposit_intents;
begin
 if p_link is null or length(p_link) not between 1 and 100 or p_url is null or length(p_url)>2048 or p_url!~'^https://pay\.payos\.vn/' then raise exception 'PAYOS_INVALID_PROVIDER_LINK';end if;
 select * into i from public.payos_deposit_intents where id=p_id for update;
 if not found or (i.payment_link_id is not null and i.payment_link_id<>p_link) then raise exception 'PAYOS_LINK_CONFLICT';end if;
 update public.payos_deposit_intents set payment_link_id=p_link,checkout_url=p_url,state=case when state='reserved' then 'ready' else state end where id=p_id returning * into i;
 return jsonb_build_object('state',i.state);
end $$;
create function public.payos_mark_deposit_unknown(p_id uuid) returns void
language sql security definer set search_path='' as $$
 update public.payos_deposit_intents set state='unknown' where id=p_id and state in('reserved','ready');
$$;

create function public.payos_apply_receipt(p_order bigint,p_reference text,p_amount bigint,p_currency text,p_link text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.payos_deposit_intents;e public.payos_receipts;r text;
begin
 -- Serializes replay and conflicting retries, including unmatched signed events.
 perform pg_advisory_xact_lock(hashtextextended(p_order::text||':'||p_reference,0));
 select * into e from public.payos_receipts where order_code=p_order and reference=p_reference;
 if found then
  if row(e.amount,e.currency,e.payment_link_id) is distinct from row(p_amount,p_currency,p_link) then raise exception 'PAYOS_EVENT_CONFLICT';end if;
  return jsonb_build_object('status',e.result,'duplicate',true);
 end if;
 select * into i from public.payos_deposit_intents where order_code=p_order for update;
 if not found then r='unmatched';
 elsif i.state in('paid','review','cancelled') or i.payment_link_id is null or i.payment_link_id<>p_link or i.amount<>p_amount or p_currency<>'VND' then
  r='needs_review';if i.state<>'paid' then update public.payos_deposit_intents set state='review' where id=i.id;end if;
 else r='paid';update public.payos_deposit_intents set state='paid' where id=i.id;
 end if;
 insert into public.payos_receipts(intent_id,order_code,reference,amount,currency,payment_link_id,result) values(i.id,p_order,p_reference,p_amount,p_currency,p_link,r);
 return jsonb_build_object('status',r,'duplicate',false);
end $$;
revoke all on function public.payos_reserve_deposit(uuid,uuid,uuid,bigint),public.payos_finish_deposit_link(uuid,text,text),public.payos_mark_deposit_unknown(uuid),public.payos_apply_receipt(bigint,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.payos_reserve_deposit(uuid,uuid,uuid,bigint),public.payos_finish_deposit_link(uuid,text,text),public.payos_mark_deposit_unknown(uuid),public.payos_apply_receipt(bigint,text,bigint,text,text) to service_role;

-- Included in the generated reconciliation migration; service-only financial writes.
alter table public.payos_deposit_intents drop constraint payos_deposit_intents_state_check;
alter table public.payos_deposit_intents add constraint payos_deposit_intents_state_check check(state in('reserved','ready','unknown','review','paid','cancelled'));
create table private.payos_pilot_policy(singleton boolean primary key default true check(singleton),enabled boolean not null default false,quote_id uuid,amount bigint check(amount>0));
alter table private.payos_pilot_policy enable row level security;
revoke all on private.payos_pilot_policy from public,anon,authenticated,service_role;
insert into private.payos_pilot_policy(singleton) values(true);

create table public.payos_admin_events(
 id bigint generated always as identity primary key,actor_id uuid not null,intent_id uuid,receipt_id bigint,
 kind text not null check(kind in('note','handled_externally','reopen','bank_confirmed','webhook_confirmed','provider_sync')),
 reason text not null check(length(btrim(reason)) between 5 and 1000),details jsonb not null default '{}',created_at timestamptz not null default now()
);
create index on public.payos_admin_events(intent_id,created_at desc);
create index on public.payos_admin_events(receipt_id,created_at desc);
alter table public.payos_admin_events enable row level security;
revoke all on public.payos_admin_events from public,anon,authenticated,service_role;
grant select on public.payos_admin_events to authenticated;
create policy payos_admin_events_read on public.payos_admin_events for select to authenticated using((select private.current_staff_role())='admin');
create function private.payos_event_append_only() returns trigger language plpgsql set search_path='' as $$begin raise exception 'PAYOS_AUDIT_IMMUTABLE';end$$;
revoke all on function private.payos_event_append_only() from public,anon,authenticated,service_role;
create trigger payos_event_guard before update or delete on public.payos_admin_events for each row execute function private.payos_event_append_only();

create function private.payos_require_admin(p_actor uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.staff_profiles sp join auth.users u on u.id=sp.user_id where sp.user_id=p_actor and sp.active and sp.role='admin' and u.raw_app_meta_data->>'role'='admin') then raise exception 'PAYOS_ADMIN_REQUIRED';end if;
end$$;
revoke all on function private.payos_require_admin(uuid) from public,anon,authenticated,service_role;

create function public.payos_admin_intent(p_actor uuid,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare i public.payos_deposit_intents;begin
 perform private.payos_require_admin(p_actor);
 select * into i from public.payos_deposit_intents where id=p_id;
 if not found then raise exception 'PAYOS_INTENT_NOT_FOUND';end if;
 return jsonb_build_object('id',i.id,'orderCode',i.order_code,'amount',i.amount,'paymentLinkId',i.payment_link_id,'state',i.state);
end$$;

create function public.payos_record_review(p_actor uuid,p_intent uuid,p_receipt bigint,p_kind text,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$declare eid bigint;linked uuid;begin
 perform private.payos_require_admin(p_actor);
 if p_kind not in('note','handled_externally','reopen','bank_confirmed','webhook_confirmed') or p_reason is null or length(btrim(p_reason)) not between 5 and 1000 then raise exception 'PAYOS_INVALID_REVIEW';end if;
 if p_intent is not null and not exists(select 1 from public.payos_deposit_intents where id=p_intent) then raise exception 'PAYOS_INTENT_NOT_FOUND';end if;
 if p_receipt is not null then
   select intent_id into linked from public.payos_receipts where id=p_receipt;
   if not found or (p_intent is not null and linked is distinct from p_intent) then raise exception 'PAYOS_INVALID_REVIEW';end if;
   p_intent:=coalesce(p_intent,linked);
 end if;
 if p_kind='webhook_confirmed' then
   if p_intent is not null or p_receipt is not null then raise exception 'PAYOS_INVALID_REVIEW';end if;
 elsif p_intent is null and p_receipt is null then raise exception 'PAYOS_INVALID_REVIEW';end if;
 if p_kind='bank_confirmed' and (p_receipt is not null or not exists(select 1 from public.payos_deposit_intents where id=p_intent and state='paid')) then raise exception 'PAYOS_BANK_CONFIRM_REQUIRES_PAID';end if;
 insert into public.payos_admin_events(actor_id,intent_id,receipt_id,kind,reason) values(p_actor,p_intent,p_receipt,p_kind,btrim(p_reason)) returning id into eid;
 return jsonb_build_object('eventId',eid,'recorded',true);
end$$;

create function public.payos_sync_provider(p_actor uuid,p_intent uuid,p_snapshot jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.payos_deposit_intents;source_quote uuid;s text;link text;total bigint;received bigint;remaining bigint;tx jsonb;txsum numeric;outcome text;clean jsonb;
begin
 perform private.payos_require_admin(p_actor);
 if p_reason is null or length(btrim(p_reason)) not between 5 and 1000 then raise exception 'PAYOS_INVALID_REVIEW';end if;
 select quote_id into source_quote from public.payos_deposit_intents where id=p_intent;
 if not found then raise exception 'PAYOS_INTENT_NOT_FOUND';end if;
 -- Same lock order as reservation: quote, then intent.
 perform 1 from public.customer_quotes where id=source_quote for update;
 select * into i from public.payos_deposit_intents where id=p_intent for update;
 link:=p_snapshot->>'paymentLinkId';s:=p_snapshot->>'status';
 total:=(p_snapshot->>'amount')::bigint;received:=(p_snapshot->>'amountPaid')::bigint;remaining:=(p_snapshot->>'amountRemaining')::bigint;tx:=p_snapshot->'transactions';
 if (p_snapshot->>'orderCode')::bigint is distinct from i.order_code or total is distinct from i.amount or link is null or length(link) not between 1 and 100 or link!~'^[a-zA-Z0-9_-]+$' or (i.payment_link_id is not null and i.payment_link_id<>link) or received is null or remaining is null or received<0 or remaining<0 or s is null or s not in('PENDING','PAID','UNDERPAID','CANCELLED','EXPIRED','PROCESSING','FAILED') or jsonb_typeof(tx) is distinct from 'array' or jsonb_array_length(tx)>100 then raise exception 'PAYOS_PROVIDER_MISMATCH';end if;
 if exists(select 1 from jsonb_array_elements(tx) t where jsonb_typeof(t->'amount') is distinct from 'number' or (t->>'amount')::numeric<>trunc((t->>'amount')::numeric) or (t->>'amount')::numeric<=0 or length(coalesce(t->>'reference','')) not between 1 and 200) then raise exception 'PAYOS_PROVIDER_MISMATCH';end if;
 select coalesce(sum((t->>'amount')::numeric),0) into txsum from jsonb_array_elements(tx) t;
 clean:=jsonb_build_object('paymentLinkId',link,'orderCode',i.order_code,'amount',total,'amountPaid',received,'amountRemaining',remaining,'status',s,'transactions',coalesce((select jsonb_agg(jsonb_build_object('reference',t->>'reference','amount',(t->>'amount')::numeric)) from jsonb_array_elements(tx) t),'[]'::jsonb));
 if i.state<>'cancelled' and s='PAID' and received=i.amount and remaining=0 and txsum=received and jsonb_array_length(tx)>0 and (select count(distinct t->>'reference') from jsonb_array_elements(tx) t)=jsonb_array_length(tx)
   and (select coalesce(sum(amount),0) from public.payos_deposit_intents where quote_id=i.quote_id and id<>i.id and state<>'cancelled')+i.amount<=(i.snapshot->>'total_amount')::numeric then
   outcome:='confirmed_paid';update public.payos_deposit_intents set payment_link_id=link,state='paid' where id=i.id;
 elsif i.state<>'paid' and received=0 and remaining=i.amount and txsum=0 and not exists(select 1 from public.payos_receipts where intent_id=i.id) and s in('CANCELLED','EXPIRED') then
   outcome:='confirmed_cancelled';update public.payos_deposit_intents set payment_link_id=link,state='cancelled' where id=i.id;
 elsif i.state in('reserved','unknown','ready') and received=0 and remaining=i.amount and txsum=0 and s='PENDING' and not exists(select 1 from public.payos_receipts where intent_id=i.id) then
   outcome:='link_recovered';update public.payos_deposit_intents set payment_link_id=link,checkout_url='https://pay.payos.vn/web/'||link,state='ready' where id=i.id;
 else
   outcome:='needs_review';if i.state<>'paid' then update public.payos_deposit_intents set payment_link_id=link,state='review' where id=i.id;end if;
 end if;
 insert into public.payos_admin_events(actor_id,intent_id,kind,reason,details) values(p_actor,i.id,'provider_sync',btrim(p_reason),jsonb_build_object('outcome',outcome,'provider',clean));
 return jsonb_build_object('outcome',outcome,'state',(select state from public.payos_deposit_intents where id=i.id));
end$$;

revoke all on function public.payos_admin_intent(uuid,uuid),public.payos_record_review(uuid,uuid,bigint,text,text),public.payos_sync_provider(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.payos_admin_intent(uuid,uuid),public.payos_record_review(uuid,uuid,bigint,text,text),public.payos_sync_provider(uuid,uuid,jsonb,text) to service_role;
