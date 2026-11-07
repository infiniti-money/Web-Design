import {PaymentError} from './payos-core.mjs';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
export function providerSnapshot(info,intent){
 if(!info||info.orderCode!==intent.orderCode||info.amount!==intent.amount||typeof info.id!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(info.id)||(intent.paymentLinkId&&intent.paymentLinkId!==info.id)||!integer(info.amountPaid)||!integer(info.amountRemaining)||!['PENDING','PAID','UNDERPAID','CANCELLED','EXPIRED','PROCESSING','FAILED'].includes(info.status)||!Array.isArray(info.transactions)||info.transactions.length>100)throw new PaymentError('PROVIDER_RESULT_UNCONFIRMED',502);
 const transactions=info.transactions.map(tx=>{
  if(!tx||!integer(tx.amount)||tx.amount===0||typeof tx.reference!=='string'||tx.reference.length<1||tx.reference.length>200)throw new PaymentError('PROVIDER_RESULT_UNCONFIRMED',502);
  return{reference:tx.reference,amount:tx.amount};
 });
 return{orderCode:info.orderCode,paymentLinkId:info.id,amount:info.amount,amountPaid:info.amountPaid,amountRemaining:info.amountRemaining,status:info.status,transactions};
}
export function reconciliationCore({auth,rpc,provider,webhookUrl,status={}}){
 return async(request,input)=>{
  const actor=await auth(request);
  if(!input||typeof input.action!=='string')throw new PaymentError('INVALID_ADMIN_REQUEST');
  if(input.action==='status')return status;
  const reason=typeof input.reason==='string'?input.reason.trim():'';
  if(reason.length<5||reason.length>1000)throw new PaymentError('PAYOS_INVALID_REVIEW');
  if(input.action==='confirm_webhook'){
   let result;try{result=await provider.confirm(webhookUrl);}catch{throw new PaymentError('MERCHANT_WEBHOOK_CHECK_FAILED',502);}
   if(result?.webhookUrl!==webhookUrl)throw new PaymentError('MERCHANT_WEBHOOK_CHECK_FAILED',502);
   await rpc('payos_record_review',{p_actor:actor.id,p_intent:null,p_receipt:null,p_kind:'webhook_confirmed',p_reason:reason});
   return{webhookConfirmed:true,webhookUrl};
  }
  const intentId=input.intentId??null,receiptId=input.receiptId??null;
  if(intentId!==null&&!uuid(intentId)||receiptId!==null&&(!Number.isSafeInteger(receiptId)||receiptId<1))throw new PaymentError('INVALID_ADMIN_REQUEST');
  if(input.action==='sync'){
   if(!uuid(intentId)||receiptId!==null)throw new PaymentError('INVALID_ADMIN_REQUEST');
   const intent=await rpc('payos_admin_intent',{p_actor:actor.id,p_id:intentId});
   let info;try{info=await provider.get(intent.orderCode);}catch{throw new PaymentError('MERCHANT_LOOKUP_FAILED',502);}
   const snapshot=providerSnapshot(info,intent);
   return rpc('payos_sync_provider',{p_actor:actor.id,p_intent:intentId,p_snapshot:snapshot,p_reason:reason});
  }
  if(input.action==='review'&&['note','handled_externally','reopen','bank_confirmed'].includes(input.kind)){
   return rpc('payos_record_review',{p_actor:actor.id,p_intent:intentId,p_receipt:receiptId,p_kind:input.kind,p_reason:reason});
  }
  throw new PaymentError('INVALID_ADMIN_REQUEST');
 };
}
