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
declare q record;v record;i public.payos_deposit_intents;reserved numeric;
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
 select * into v from public.customer_quote_versions where id=q.approved_version_id and quote_id=p_quote;
 if not found or v.total_amount is null or v.total_amount<>trunc(v.total_amount) or v.total_amount>9007199254740991 or p_amount is null or p_amount<=0 then raise exception 'PAYOS_AMOUNT_EXCEEDS_BALANCE';end if;
 if exists(select 1 from public.payos_deposit_intents where quote_id=p_quote and state in('reserved','ready','unknown','review')) then raise exception 'PAYOS_ACTIVE_PAYMENT';end if;
 select coalesce(sum(amount),0) into reserved from public.payos_deposit_intents where quote_id=p_quote;
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
 elsif i.state='paid' or i.payment_link_id is null or i.payment_link_id<>p_link or i.amount<>p_amount or p_currency<>'VND' or i.state='review' then
  r='needs_review';if i.state<>'paid' then update public.payos_deposit_intents set state='review' where id=i.id;end if;
 else r='paid';update public.payos_deposit_intents set state='paid' where id=i.id;
 end if;
 insert into public.payos_receipts(intent_id,order_code,reference,amount,currency,payment_link_id,result) values(i.id,p_order,p_reference,p_amount,p_currency,p_link,r);
 return jsonb_build_object('status',r,'duplicate',false);
end $$;
revoke all on function public.payos_reserve_deposit(uuid,uuid,uuid,bigint),public.payos_finish_deposit_link(uuid,text,text),public.payos_mark_deposit_unknown(uuid),public.payos_apply_receipt(bigint,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.payos_reserve_deposit(uuid,uuid,uuid,bigint),public.payos_finish_deposit_link(uuid,text,text),public.payos_mark_deposit_unknown(uuid),public.payos_apply_receipt(bigint,text,bigint,text,text) to service_role;
