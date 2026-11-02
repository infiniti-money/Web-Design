-- Tân Design v1.18: server-calculated line-item snapshots, additive to v1.17.
-- PostgreSQL numeric math is authoritative; browser totals are display previews.
-- No existing quote/version/contract rows are mutated by this migration.
create or replace function public.commercial_quote_totals(p_content jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $calc$
declare
  v_item jsonb;
  v_items jsonb;
  v_name text;v_unit text;v_group text;
  v_qty_text text;v_price_text text;v_discount_text text;v_rate_text text;
  v_qty numeric;v_price numeric;v_discount numeric;v_rate numeric;
  v_subtotal numeric:=0;v_vat numeric;v_total numeric;v_count integer:=0;
begin
  if p_content is null or jsonb_typeof(p_content)<>'object'
     or length(p_content::text)>90000 then raise exception 'INVALID_QUOTE_ITEMS';end if;
  v_items:=p_content->'items';
  if jsonb_typeof(v_items) is distinct from 'array' then raise exception 'INVALID_QUOTE_ITEMS';end if;
  if jsonb_array_length(v_items) not between 1 and 80 then raise exception 'INVALID_QUOTE_ITEMS';end if;
  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_count:=v_count+1;
    if jsonb_typeof(v_item) is distinct from 'object' then raise exception 'INVALID_QUOTE_ITEM_%',v_count;end if;
    v_name:=btrim(coalesce(v_item->>'name',''));
    v_unit:=btrim(coalesce(v_item->>'unit',''));
    v_group:=btrim(coalesce(v_item->>'group',''));
    v_qty_text:=v_item->>'quantity';
    v_price_text:=v_item->>'unit_price';
    if length(v_name) not between 2 and 160 or length(v_unit) not between 1 and 30
       or length(v_group)>100
       or v_qty_text is null or v_qty_text !~ '^[0-9]{1,6}(\.[0-9]{1,3})?$'
       or v_price_text is null or v_price_text !~ '^(0|[1-9][0-9]{0,11})$'
    then raise exception 'INVALID_QUOTE_ITEM_%',v_count;end if;
    v_qty:=v_qty_text::numeric;v_price:=v_price_text::numeric;
    if v_qty<=0 or v_qty>100000 then raise exception 'INVALID_QUOTE_QUANTITY_%',v_count;end if;
    v_subtotal:=v_subtotal+round(v_qty*v_price,0);
    if v_subtotal>99999999999999 then raise exception 'QUOTE_TOO_LARGE';end if;
  end loop;
  v_discount_text:=coalesce(p_content->>'discount','0');
  v_rate_text:=coalesce(p_content->>'vat_rate','0');
  if v_discount_text !~ '^(0|[1-9][0-9]{0,14})$'
     or v_rate_text not in ('0','5','8','10') then raise exception 'INVALID_QUOTE_DISCOUNT_OR_VAT';end if;
  v_discount:=v_discount_text::numeric;v_rate:=v_rate_text::numeric;
  if v_discount>v_subtotal then raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL';end if;
  v_vat:=round((v_subtotal-v_discount)*v_rate/100,0);
  v_total:=v_subtotal-v_discount+v_vat;
  if v_total>99999999999999 then raise exception 'QUOTE_TOO_LARGE';end if;
  return jsonb_build_object('subtotal',v_subtotal,'discount',v_discount,'vat_rate',v_rate,
    'vat_amount',v_vat,'total',v_total,'line_count',v_count);
end;
$calc$;
-- Internal helper; only the authenticated, role-checked commercial_action may use it.
revoke all on function public.commercial_quote_totals(jsonb) from public,anon,authenticated;

create or replace function public.commercial_action(p_kind text,p_action text,p_id uuid default null,p_inquiry uuid default null,p_title text default null,p_amount numeric default null,p_content jsonb default null)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_role text;v_id uuid;v_status text;v_inquiry uuid;v_quote uuid;v_n integer;v_calculated jsonb;v_saved_content jsonb;v_final_amount numeric;
begin
 select s.role into v_role from public.staff_profiles s where s.user_id=auth.uid() and s.active and s.role in ('admin','manager') and s.role=auth.jwt()->'app_metadata'->>'role';
 if v_role is null then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if p_kind not in ('quote','contract') then raise exception 'INVALID_KIND';end if;
 if p_kind='quote' then
  if p_action='create' then
   if p_inquiry is null or length(trim(coalesce(p_title,''))) not between 3 and 180 then raise exception 'INVALID_QUOTE';end if;
   insert into public.customer_quotes(inquiry_id,title,created_by) values(p_inquiry,trim(p_title),auth.uid()) returning id into v_id;
  elsif p_action='revise' then
   select status into v_status from public.customer_quotes where id=p_id for update;
   if v_status not in ('draft','rejected') then raise exception 'REVISION_NOT_ALLOWED';end if;
   if p_content is null or jsonb_typeof(p_content)<>'object' then raise exception 'INVALID_VERSION';end if;
   v_saved_content:=p_content;
   v_final_amount:=p_amount;
   if p_content ? 'items' then
     v_calculated:=public.commercial_quote_totals(p_content);
     v_final_amount:=(v_calculated->>'total')::numeric;
     if p_amount is not null and p_amount<>v_final_amount then raise exception 'TOTAL_MISMATCH';end if;
     v_saved_content:=p_content || v_calculated || jsonb_build_object('format_version',2);
   else
     -- Old v1.17 revisions remain valid; no rewriting historical quotes.
     if p_amount is null or p_amount<0 then raise exception 'INVALID_VERSION';end if;
   end if;
   select coalesce(max(version_no),0)+1 into v_n from public.customer_quote_versions where quote_id=p_id;
   insert into public.customer_quote_versions(quote_id,version_no,total_amount,content,created_by)
   values(p_id,v_n,v_final_amount,v_saved_content,auth.uid());
   v_id:=p_id;
  else
   select status into v_status from public.customer_quotes where id=p_id for update;
   if v_status is null then raise exception 'QUOTE_NOT_FOUND';end if;
   if p_action='reject' and (p_content is null or length(btrim(coalesce(p_content->>'reason',''))) not between 5 and 1000)
   then raise exception 'REJECTION_REASON_REQUIRED';end if;
   if p_action='accept' and
      (p_content is null or coalesce(p_content->>'method','') not in ('email','phone','in_person','other')
       or length(btrim(coalesce(p_content->>'note',''))) not between 5 and 1000)
   then raise exception 'CUSTOMER_ACCEPTANCE_EVIDENCE_REQUIRED';end if;
   if (p_action='submit' and v_status in ('draft','rejected') and exists(select 1 from public.customer_quote_versions where quote_id=p_id))
   or (p_action='approve' and v_status='submitted' and v_role='admin')
   or (p_action='reject' and v_status='submitted' and v_role='admin')
   or (p_action='send' and v_status='approved')
   or (p_action='accept' and v_status='sent') then
    update public.customer_quotes set status=case p_action when 'submit' then 'submitted' when 'approve' then 'approved' when 'reject' then 'rejected' when 'send' then 'sent' else 'accepted' end,
    approved_by=case when p_action='approve' then auth.uid() else approved_by end,
    approved_version_id=case when p_action='approve' then
      (select v.id from public.customer_quote_versions v where v.quote_id=p_id order by v.version_no desc limit 1)
      else approved_version_id end where id=p_id;
    v_id:=p_id;
   else raise exception 'INVALID_QUOTE_TRANSITION'; end if;
  end if;
 else
  if p_action='create' then
   if p_inquiry is null or length(trim(coalesce(p_title,''))) not between 3 and 90 then raise exception 'INVALID_CONTRACT';end if;
   if p_content is null or p_content->>'quote_id' is null or p_content->>'quote_version_id' is null then raise exception 'ACCEPTED_QUOTE_REQUIRED';end if;
   insert into public.customer_contracts(inquiry_id,contract_number,description,quote_id,quote_version_id,created_by)
   values(p_inquiry,trim(p_title),left(coalesce(p_content->>'description',''),2000),(p_content->>'quote_id')::uuid,(p_content->>'quote_version_id')::uuid,auth.uid()) returning id into v_id;
  else
   select status into v_status from public.customer_contracts where id=p_id for update;
   if v_status is null then raise exception 'CONTRACT_NOT_FOUND';end if;
   if (p_action='review' and v_status='draft') or (p_action='sign' and v_status='review' and v_role='admin')
   or (p_action='activate' and v_status='signed' and v_role='admin')
   or (p_action='complete' and v_status='active' and v_role='admin') then
    update public.customer_contracts set status=case p_action when 'review' then 'review' when 'sign' then 'signed' when 'activate' then 'active' else 'completed' end,
    signed_at=case when p_action='sign' then now() else signed_at end where id=p_id;
    v_id:=p_id;
   else raise exception 'INVALID_CONTRACT_TRANSITION';end if;
  end if;
 end if;
 insert into public.commercial_audit(entity_kind,entity_id,action,actor_id,details) values(p_kind,v_id,p_action,auth.uid(),jsonb_build_object('amount',v_final_amount,'version_no',v_n,'reason',case when p_action='reject' then left(p_content->>'reason',1000) end,'method',case when p_action='accept' then p_content->>'method' end,'evidence',case when p_action='accept' then left(p_content->>'note',1000) end));
 return v_id;
end;
$fn$;
revoke all on function public.commercial_action(text,text,uuid,uuid,text,numeric,jsonb) from public,anon;
grant execute on function public.commercial_action(text,text,uuid,uuid,text,numeric,jsonb) to authenticated;

