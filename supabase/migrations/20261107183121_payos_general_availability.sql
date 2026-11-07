-- Broaden only by explicit policy; preserve pilot by default and keep all ledger data.
alter table private.payos_pilot_policy add column general_availability boolean not null default false;
create function public.payos_quote_balances(p_actor uuid,p_quotes uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 perform private.payos_require_admin(p_actor);
 if p_quotes is null or cardinality(p_quotes)>100 then raise exception 'PAYOS_INVALID_REVIEW';end if;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from (
   select q.id as quote_id,v.total_amount as total,coalesce(a.held,0) as committed,
     greatest(v.total_amount-coalesce(a.held,0),0) as remaining,coalesce(a.active,false) as active
   from public.customer_quotes q join public.customer_quote_versions v on v.id=q.approved_version_id and v.quote_id=q.id
   left join lateral (select sum(i.amount) as held,bool_or(i.state in('reserved','ready','unknown','review')) as active from public.payos_deposit_intents i where i.quote_id=q.id and i.state<>'cancelled') a on true
   where q.id=any(p_quotes) and q.status='accepted' and q.approved_by is not null
 ) t;
 return result;
end$$;
revoke all on function public.payos_quote_balances(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.payos_quote_balances(uuid,uuid[]) to service_role;
create or replace function public.payos_reserve_deposit(p_actor uuid,p_quote uuid,p_key uuid,p_amount bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q record;v record;i public.payos_deposit_intents;reserved numeric;pilot record;
begin
 if not exists(select 1 from public.staff_profiles sp join auth.users u on u.id=sp.user_id where sp.user_id=p_actor and sp.active and sp.role='admin' and u.raw_app_meta_data->>'role'='admin') then raise exception 'PAYOS_ADMIN_REQUIRED';end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.customer_quote_versions'::regclass and tgname='commercial_quote_version_append_only' and tgenabled='O' and not tgisinternal) then raise exception 'PAYOS_QUOTE_HISTORY_UNPROTECTED';end if;
 perform pg_advisory_xact_lock(hashtextextended('payos:create:'||p_key::text,0));
 select * into q from public.customer_quotes where id=p_quote for update;
 if not found or q.status<>'accepted' or q.approved_by is null or q.approved_version_id is null then raise exception 'PAYOS_QUOTE_NOT_ACCEPTED';end if;
 perform private.payos_require_admin(p_actor);
 select * into i from public.payos_deposit_intents where request_key=p_key;
 if found then
   if i.quote_id<>p_quote or i.amount<>p_amount or i.created_by<>p_actor then raise exception 'PAYOS_REQUEST_KEY_REUSED';end if;
   return to_jsonb(i)||jsonb_build_object('fresh',false);
 end if;
 if to_regclass('private.payos_pilot_policy') is not null then
   select * into pilot from private.payos_pilot_policy where singleton;
   if not found or not pilot.enabled then raise exception 'PAYOS_COLLECTION_DISABLED';end if;
   if not pilot.general_availability then
   if pilot.quote_id is distinct from p_quote or pilot.amount is distinct from p_amount then raise exception 'PAYOS_PILOT_SCOPE_ONLY';end if;
   if exists(select 1 from public.payos_deposit_intents where quote_id=p_quote) then raise exception 'PAYOS_PILOT_ALREADY_CREATED';end if;
   end if;
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

create or replace function public.payos_apply_receipt(p_order bigint,p_reference text,p_amount bigint,p_currency text,p_link text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.payos_deposit_intents;e public.payos_receipts;r text;source_quote uuid;
begin
 -- Serializes replay and conflicting retries, including unmatched signed events.
 perform pg_advisory_xact_lock(hashtextextended(p_order::text||':'||p_reference,0));
 select * into e from public.payos_receipts where order_code=p_order and reference=p_reference;
 if found then
  if row(e.amount,e.currency,e.payment_link_id) is distinct from row(p_amount,p_currency,p_link) then raise exception 'PAYOS_EVENT_CONFLICT';end if;
  return jsonb_build_object('status',e.result,'duplicate',true);
 end if;
 select quote_id into source_quote from public.payos_deposit_intents where order_code=p_order;
 if found then perform 1 from public.customer_quotes where id=source_quote for update;end if;
 select * into i from public.payos_deposit_intents where order_code=p_order for update;
 if not found then r='unmatched';
 elsif i.state in('paid','review','cancelled') or i.payment_link_id is null or i.payment_link_id<>p_link or i.amount<>p_amount or p_currency<>'VND' then
  r='needs_review';if i.state<>'paid' then update public.payos_deposit_intents set state='review' where id=i.id;end if;
 else r='paid';update public.payos_deposit_intents set state='paid' where id=i.id;
 end if;
 insert into public.payos_receipts(intent_id,order_code,reference,amount,currency,payment_link_id,result) values(i.id,p_order,p_reference,p_amount,p_currency,p_link,r);
 return jsonb_build_object('status',r,'duplicate',false);
end $$;
