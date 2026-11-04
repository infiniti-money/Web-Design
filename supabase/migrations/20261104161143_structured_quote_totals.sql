-- Validate new structured quotations without altering historical free-text versions.
create or replace function private.validate_structured_quote()
returns trigger language plpgsql set search_path='' as $$
declare item jsonb; quantity numeric; price numeric; line_amount numeric; subtotal numeric:=0;
  reduction numeric; rate numeric; tax numeric; total numeric;
begin
  if new.content->>'schema_version' is distinct from '1' then return new; end if;
  if new.content->>'currency' is distinct from 'VND'
    or jsonb_typeof(new.content->'items') is distinct from 'array'
    or jsonb_array_length(new.content->'items') not between 1 and 100 then
    raise exception 'QUOTE_ITEMS_INVALID' using errcode='23514';
  end if;
  for item in select value from jsonb_array_elements(new.content->'items') loop
    if jsonb_typeof(item->'quantity') is distinct from 'number'
      or jsonb_typeof(item->'unit_price') is distinct from 'number'
      or char_length(trim(coalesce(item->>'description',''))) not between 1 and 500 then
      raise exception 'QUOTE_ITEM_INVALID' using errcode='23514';
    end if;
    quantity:=(item->>'quantity')::numeric; price:=(item->>'unit_price')::numeric;
    if quantity<=0 or quantity>1000000 or quantity<>round(quantity,2)
      or price<0 or price>1000000000000 or price<>round(price,0) then
      raise exception 'QUOTE_ITEM_AMOUNT_INVALID' using errcode='23514';
    end if;
    line_amount:=round(quantity*price,0);
    if (item->>'amount')::numeric is distinct from line_amount then
      raise exception 'QUOTE_LINE_TOTAL_MISMATCH' using errcode='23514';
    end if;
    subtotal:=subtotal+line_amount;
  end loop;
  reduction:=(new.content->>'discount')::numeric;rate:=(new.content->>'tax_rate')::numeric;
  if reduction is null or rate is null or reduction<0 or reduction>subtotal
    or reduction<>round(reduction,0) or rate<0 or rate>100 or rate<>round(rate,2) then
    raise exception 'QUOTE_DISCOUNT_TAX_INVALID' using errcode='23514';
  end if;
  tax:=round((subtotal-reduction)*rate/100,0);total:=subtotal-reduction+tax;
  if total>90000000000000 or (new.content->>'subtotal')::numeric is distinct from subtotal
    or (new.content->>'tax_amount')::numeric is distinct from tax
    or (new.content->>'total')::numeric is distinct from total
    or new.total_amount is distinct from total then
    raise exception 'QUOTE_TOTAL_MISMATCH' using errcode='23514';
  end if;
  return new;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'QUOTE_AMOUNT_INVALID' using errcode='23514';
end;
$$;
revoke all on function private.validate_structured_quote() from public,anon,authenticated;
create trigger validate_structured_quote before insert on public.customer_quote_versions
  for each row execute function private.validate_structured_quote();
