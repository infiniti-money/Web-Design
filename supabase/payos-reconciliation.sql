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
