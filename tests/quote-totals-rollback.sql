begin;
insert into auth.users(id,aud,role,email,raw_app_meta_data) values('d0a00000-0000-4000-8000-000000000004','authenticated','authenticated','quote-test@example.invalid','{"role":"admin"}');
insert into public.staff_profiles(user_id,email,full_name,role,active) values('d0a00000-0000-4000-8000-000000000004','quote-test@example.invalid','Quote test admin','admin',true);
insert into public.inquiries(id,full_name,phone,service) values('d0c00000-0000-4000-8000-000000000004','QUOTE ROLLBACK FIXTURE','0900000000','Thiết kế nội thất');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0a00000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ declare test_quote_id uuid; content jsonb:='{"schema_version":1,"currency":"VND","items":[{"description":"Hạng mục A","unit":"m2","quantity":2.5,"unit_price":12345,"amount":30863},{"description":"Hạng mục B","unit":"gói","quantity":1,"unit_price":10000,"amount":10000}],"subtotal":40863,"discount":1000,"tax_rate":8,"tax_amount":3189,"total":43052}'; begin
  test_quote_id:=public.commercial_action('quote','create',null,'d0c00000-0000-4000-8000-000000000004','QUOTE ROLLBACK');
  perform public.commercial_action('quote','revise',test_quote_id,null,null,43052,content);
  begin perform public.commercial_action('quote','revise',test_quote_id,null,null,43053,content);raise exception 'MISMATCHED_TOTAL_ACCEPTED';exception when check_violation then null;end;
  begin perform public.commercial_action('quote','revise',test_quote_id,null,null,43052,jsonb_set(content,'{items,0,amount}','30862'));raise exception 'MISMATCHED_LINE_ACCEPTED';exception when check_violation then null;end;
  begin perform public.commercial_action('quote','revise',test_quote_id,null,null,43052,jsonb_set(content,'{discount}','999999'));raise exception 'INVALID_DISCOUNT_ACCEPTED';exception when check_violation then null;end;
  if (select count(*) from public.customer_quote_versions v where v.quote_id=test_quote_id)<>1 then raise exception 'INVALID_VERSION_PERSISTED';end if;
end $$;
reset role;
select 'Structured quotation totals verified against PostgreSQL; fixtures rolled back' as result;
rollback;
