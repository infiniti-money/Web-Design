export class PaymentError extends Error {
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const money=value=>Number.isSafeInteger(value)&&value>0;
export function checkoutUrl(value){
  try{const url=new URL(value);if(url.protocol==='https:'&&url.hostname==='pay.payos.vn'&&!url.username&&!url.password&&url.port==='')return url.href;}catch{}
  throw new PaymentError('PROVIDER_RESULT_UNCONFIRMED',502);
}
export function paymentCore({enabled,auth,store,provider,now=()=>Date.now()}){
  function gate(){if(!enabled)throw new PaymentError('PAYMENTS_DISABLED',503);}
  return {
    async create(request,input){
      gate();const actor=await auth(request);
      if(!actor||actor.role!=='admin')throw new PaymentError('ADMIN_REQUIRED',403);
      if(!input||!uuid(input.quoteId)||!uuid(input.requestKey)||!money(input.amount))throw new PaymentError('INVALID_DEPOSIT_REQUEST');
      // The database rechecks live Admin, accepted quote, exact approved version and remaining amount under a row lock.
      const intent=await store.reserve({actorId:actor.id,quoteId:input.quoteId,requestKey:input.requestKey,amount:input.amount});
      if(!intent.fresh){
        if(intent.state==='ready')return{intentId:intent.id,state:intent.state,checkoutUrl:checkoutUrl(intent.checkout_url)};
        if(intent.state==='paid')return{intentId:intent.id,state:'paid'};
        throw new PaymentError('DEPOSIT_REQUIRES_RECONCILIATION',409);
      }
      try{
        const result=await provider.create({orderCode:intent.order_code,amount:intent.amount,description:'DH'+String(intent.order_code).slice(-7),returnUrl:'https://infiniti-money.github.io/Web-Design/payment-return.html',cancelUrl:'https://infiniti-money.github.io/Web-Design/payment-return.html',expiredAt:Math.floor(now()/1000)+1800});
        if(result.orderCode!==intent.order_code||result.amount!==intent.amount||result.currency!=='VND'||typeof result.paymentLinkId!=='string'||!result.paymentLinkId)throw new PaymentError('PROVIDER_RESULT_UNCONFIRMED',502);
        const url=checkoutUrl(result.checkoutUrl);
        const completed=await store.finish({id:intent.id,paymentLinkId:result.paymentLinkId,checkoutUrl:url});
        if(!completed?.state)throw new PaymentError('PROVIDER_RESULT_UNCONFIRMED',502);
        return{intentId:intent.id,state:completed.state,...(completed.state==='ready'?{checkoutUrl:url}:{})};
      }catch{
        // A timeout can happen AFTER the merchant created a real payment link. Never retry creation automatically.
        await store.unknown(intent.id).catch(()=>{});
        throw new PaymentError('PROVIDER_RESULT_UNCONFIRMED',502);
      }
    },
    async webhook(envelope){
      gate();let data;
      try{data=await provider.verify(envelope);}catch{throw new PaymentError('INVALID_WEBHOOK_SIGNATURE',403);}
      if(envelope?.success!==true||envelope.code!=='00'||data.code!=='00')return{status:'ignored'};
      if(!Number.isSafeInteger(data.orderCode)||data.orderCode<1||!money(data.amount)||typeof data.reference!=='string'||data.reference.length<1||data.reference.length>200||typeof data.currency!=='string'||data.currency.length>8||typeof data.paymentLinkId!=='string'||!data.paymentLinkId||data.paymentLinkId.length>100)throw new PaymentError('INVALID_WEBHOOK_DATA');
      // Persist only verified, allowlisted accounting fields, never raw bank/customer payloads.
      return store.receipt({orderCode:data.orderCode,amount:data.amount,reference:data.reference,currency:data.currency,paymentLinkId:data.paymentLinkId});
    }
  };
}
