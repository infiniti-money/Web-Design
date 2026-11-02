-- Regression only. Run inside BEGIN after v1.18 SQL/lock and always ROLLBACK.
-- Uses real staff IDs only as JWT claim fixtures. Does NOT authenticate real browser sessions.
DO $test$
DECLARE
 admin_id uuid; manager_id uuid; inquiry_id uuid; quote_id uuid; version_id uuid; contract_id uuid;
 computed numeric; item_content jsonb;
BEGIN
 SELECT user_id INTO admin_id FROM public.staff_profiles WHERE active AND role='admin' LIMIT 1;
 SELECT user_id INTO manager_id FROM public.staff_profiles WHERE active AND role='manager' LIMIT 1;
 SELECT id INTO inquiry_id FROM public.inquiries LIMIT 1;
 IF admin_id IS NULL OR manager_id IS NULL OR inquiry_id IS NULL THEN
   RAISE EXCEPTION 'TEST_NEEDS_EXISTING_ADMIN_MANAGER_AND_INQUIRY';
 END IF;
 item_content:='{"items":[{"group":"Vật liệu","name":"Tấm ốp gỗ công nghiệp","unit":"m²","quantity":"2.5","unit_price":"175000"},{"group":"Thi công","name":"Lắp đặt và hoàn thiện","unit":"công","quantity":"3","unit_price":"320000"}],"discount":100000,"vat_rate":10}'::jsonb;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',manager_id::text,'role','authenticated','app_metadata',jsonb_build_object('role','manager'))::text,true);
 quote_id:=public.commercial_action(p_kind=>'quote',p_action=>'create',p_inquiry=>inquiry_id,p_title=>'CHECK_V118_ROLLBACK_ONLY');
 PERFORM public.commercial_action(p_kind=>'quote',p_action=>'revise',p_id=>quote_id,p_amount=>1427250,p_content=>item_content);
 SELECT id,total_amount INTO version_id,computed FROM public.customer_quote_versions WHERE quote_id=quote_id ORDER BY version_no DESC LIMIT 1;
 IF computed <> 1427250 THEN RAISE EXCEPTION 'WRONG_CALCULATED_TOTAL';END IF;
 BEGIN
   PERFORM public.commercial_action(p_kind=>'quote',p_action=>'revise',p_id=>quote_id,p_amount=>123,p_content=>item_content);
   RAISE EXCEPTION 'TOTAL_MISMATCH_BYPASSED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'TOTAL_MISMATCH' THEN RAISE;END IF;
 END;
 PERFORM public.commercial_action(p_kind=>'quote',p_action=>'submit',p_id=>quote_id);
 BEGIN
   PERFORM public.commercial_action(p_kind=>'quote',p_action=>'approve',p_id=>quote_id);
   RAISE EXCEPTION 'MANAGER_APPROVAL_ALLOWED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'INVALID_QUOTE_TRANSITION' THEN RAISE;END IF;
 END;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id::text,'role','authenticated','app_metadata',jsonb_build_object('role','admin'))::text,true);
 PERFORM public.commercial_action(p_kind=>'quote',p_action=>'approve',p_id=>quote_id);
 IF (SELECT approved_version_id FROM public.customer_quotes WHERE id=quote_id) IS DISTINCT FROM version_id THEN RAISE EXCEPTION 'APPROVED_VERSION_MISMATCH'; END IF;
 BEGIN
   UPDATE public.customer_quote_versions SET content=content WHERE id=version_id;
   RAISE EXCEPTION 'APPROVED_VERSION_MUTABLE';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'QUOTE_VERSION_IMMUTABLE' THEN RAISE;END IF;
 END;
 BEGIN
   DELETE FROM public.customer_quote_versions WHERE id=version_id;
   RAISE EXCEPTION 'APPROVED_VERSION_DELETABLE';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'QUOTE_VERSION_IMMUTABLE' THEN RAISE;END IF;
 END;
 BEGIN
   PERFORM public.commercial_action(p_kind=>'quote',p_action=>'revise',p_id=>quote_id,p_amount=>1427250,p_content=>item_content);
   RAISE EXCEPTION 'APPROVED_QUOTE_REVISION_ALLOWED';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'REVISION_NOT_ALLOWED' THEN RAISE;END IF;
 END;
 PERFORM public.commercial_action(p_kind=>'quote',p_action=>'send',p_id=>quote_id);
 PERFORM public.commercial_action(p_kind=>'quote',p_action=>'accept',p_id=>quote_id,p_content=>'{"method":"email","note":"Chỉ giả lập SQL, không phải xác nhận của khách hàng"}'::jsonb);
 contract_id:=public.commercial_action(p_kind=>'contract',p_action=>'create',p_inquiry=>inquiry_id,p_title=>'HD-V118-ROLLBACK-CHECK',p_content=>jsonb_build_object('quote_id',quote_id,'quote_version_id',version_id));
 IF (SELECT quote_version_id FROM public.customer_contracts WHERE id=contract_id) IS DISTINCT FROM version_id THEN RAISE EXCEPTION 'CONTRACT_NOT_LINKED_TO_APPROVED_VERSION'; END IF;
END $test$;
