(async()=>{
 'use strict';const $=id=>document.getElementById(id),cfg=window.ATELIER_CONFIG;
 const labels={reserved:'Đang tạo link',ready:'Chờ thanh toán',unknown:'Chưa rõ kết quả',review:'Cần đối soát',paid:'Đã ghi nhận thu',cancelled:'Đã hủy / hết hạn',unmatched:'Chưa khớp yêu cầu',needs_review:'Cần xem xét'};
 const eventNames={note:'Ghi chú',handled_externally:'Đã xử lý bên ngoài',reopen:'Mở lại xem xét',bank_confirmed:'Admin xác nhận đã kiểm tra ngân hàng',webhook_confirmed:'payOS xác minh webhook',provider_sync:'Truy vấn từ payOS'};
 const errors={PAYMENTS_DISABLED:'Chức năng tạo link chưa mở.',MANAGEMENT_DISABLED:'Chức năng đối soát chưa sẵn sàng.',AUTH_REQUIRED:'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',ADMIN_REQUIRED:'Tài khoản không còn quyền quản trị.',PAYOS_ADMIN_REQUIRED:'Tài khoản không còn quyền quản trị.',PAYOS_PILOT_SCOPE_ONLY:'Đợt kiểm chứng chỉ hỗ trợ báo giá và số tiền đã chọn.',PAYOS_PILOT_ALREADY_CREATED:'Đã có yêu cầu cho đợt kiểm chứng. Mở yêu cầu đó để đối soát.',PAYOS_WEBHOOK_NOT_CONFIRMED:'Cần xác minh webhook payOS trước khi tạo link.',PAYOS_PILOT_DISABLED:'Đợt kiểm chứng chưa được mở.',PAYOS_ACTIVE_PAYMENT:'Báo giá đã có khoản đang xử lý.',PAYOS_AMOUNT_EXCEEDS_BALANCE:'Số tiền vượt phần còn lại của báo giá.',DEPOSIT_REQUIRES_RECONCILIATION:'Yêu cầu đã tồn tại và cần kiểm tra lại trạng thái.',PROVIDER_RESULT_UNCONFIRMED:'Chưa xác nhận được kết quả từ payOS. Giữ nguyên yêu cầu và kiểm tra đối soát.',MERCHANT_WEBHOOK_CHECK_FAILED:'payOS chưa xác minh được webhook. Kiểm tra kênh merchant và cấu hình khóa trên máy chủ.',MERCHANT_LOOKUP_FAILED:'Chưa truy vấn được từ payOS. Không thay đổi trạng thái tiền.',PAYOS_BANK_CONFIRM_REQUIRES_PAID:'Chỉ xác nhận ngân hàng sau khi hệ thống đã ghi nhận thu.',PAYOS_INVALID_REVIEW:'Nhập lý do từ 5 đến 1000 ký tự.',LEDGER_UNAVAILABLE:'Chưa tải được sổ giao dịch. Thử tải lại sau.'};
 const money=value=>new Intl.NumberFormat('vi-VN').format(Number(value))+' ₫',node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let db,health={},quotes=[],intents=[],receipts=[],selected=null,busy=false,page=0,receiptPage=0,loadSequence=0,detailSequence=0,pending=null;
 const message=text=>{$('payment-status').textContent=text;};
 function checkout(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='pay.payos.vn'&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}}
 function setBusy(value){busy=value;document.querySelectorAll('#payment-app button').forEach(b=>b.disabled=value);if(!value){$('create-deposit').disabled=!health.paymentsEnabled||!quotes.length;$('create-deposit').textContent=pending?'Kiểm tra lại yêu cầu':'Tạo link đặt cọc';$('intents-prev').disabled=page===0;$('intents-next').disabled=intents.length<25;$('receipts-prev').disabled=receiptPage===0;$('receipts-next').disabled=receipts.length<25;if(selected){$('sync-provider').hidden=!selected.intent;$('confirm-bank').hidden=!selected.intent||selected.row.state!=='paid';}}}
 function showLink(url){const safe=checkout(url);$('checkout-link').hidden=!safe;if(safe)$('checkout-link').href=safe;else $('checkout-link').removeAttribute('href');}
 async function call(fn,body){
  const session=await db.auth.getSession();if(session.error||!session.data?.session?.access_token)throw Error('AUTH_REQUIRED');
  const response=await fetch(cfg.supabaseUrl+'/functions/v1/'+fn,{method:'POST',headers:{apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+session.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'LEDGER_UNAVAILABLE');return data;
 }
 function failure(error){return errors[error?.message]||'Kết nối chưa rõ kết quả. Tải lại dữ liệu và kiểm tra trước khi thực hiện lại.';}
 function optionSummary(){const q=quotes.find(q=>q.id===$('deposit-quote').value);$('quote-amount').textContent=q?'Tổng phiên bản được duyệt: '+money(q.total):'Chưa có báo giá đủ điều kiện.';}
 function clearPrivate(){intents=[];receipts=[];quotes=[];selected=null;detailSequence++;$('payment-intents').replaceChildren();$('payment-receipts').replaceChildren();$('payment-history').replaceChildren();$('payment-detail-summary').replaceChildren();if($('payment-detail').open)$('payment-detail').close();$('deposit-quote').replaceChildren();showLink(null);}
 async function load(){
  const seq=++loadSequence;message('Đang tải sổ giao dịch…');
  try{
   const filter=$('payment-filter').value;let iq=db.from('payos_deposit_intents').select('id,quote_id,amount,order_code,state,checkout_url,created_at,request_key').order('created_at',{ascending:false}).range(page*25,page*25+24);
   if(filter==='review')iq=iq.in('state',['reserved','unknown','review']);else if(filter!=='all')iq=iq.eq('state',filter);
   const requests=await Promise.all([iq,db.from('payos_receipts').select('id,intent_id,order_code,amount,currency,reference,result,created_at').in('result',['needs_review','unmatched']).order('created_at',{ascending:false}).range(receiptPage*25,receiptPage*25+24),db.from('customer_quotes').select('id,title,approved_version_id').eq('status','accepted').order('created_at',{ascending:false}).limit(100),call('payos-admin',{action:'status'})]);
   if(seq!==loadSequence)return false;if(requests.slice(0,3).some(r=>r.error))throw Error('LEDGER_UNAVAILABLE');
   const qRows=requests[2].data||[],ids=qRows.map(q=>q.approved_version_id).filter(Boolean);
   const versions=ids.length?await db.from('customer_quote_versions').select('id,total_amount').in('id',ids):{data:[]};
   if(seq!==loadSequence)return false;if(versions.error)throw Error('LEDGER_UNAVAILABLE');
   health=requests[3];intents=requests[0].data||[];receipts=requests[1].data||[];
   quotes=qRows.map(q=>({...q,total:versions.data?.find(v=>v.id===q.approved_version_id)?.total_amount})).filter(q=>Number.isFinite(Number(q.total))&&Number(q.total)>0&&(!health.pilotOnly||q.id===health.pilotQuoteId));
   const old=$('deposit-quote').value;$('deposit-quote').replaceChildren(...quotes.map(q=>{const o=node('option',q.title+' · '+money(q.total));o.value=q.id;return o;}));if(quotes.some(q=>q.id===old))$('deposit-quote').value=old;
   if(health.pilotOnly){$('pilot-scope').textContent='Đợt kiểm chứng: một yêu cầu '+money(health.pilotAmount||0)+' cho báo giá đã chọn.';$('deposit-amount').value=health.pilotAmount||'';$('deposit-amount').readOnly=true;}
   $('payment-connection').textContent=health.paymentsEnabled?(health.pilotOnly?'Đang mở đợt kiểm chứng giới hạn.':'Đang mở tạo yêu cầu đặt cọc.'):'Tạo link thanh toán đang tắt. Có thể kiểm tra cấu hình và xem sổ giao dịch.';
   optionSummary();render();message('Đã tải dữ liệu. Trạng thái thu tiền lấy từ máy chủ.');return true;
  }catch(error){if(seq!==loadSequence)return false;clearPrivate();health={};message(failure(error));return false;}finally{if(seq===loadSequence)setBusy(busy);}
 }
 function render(){
  $('payment-intents').replaceChildren(...intents.map(r=>card(r,true)));$('payment-receipts').replaceChildren(...receipts.map(r=>card(r,false)));
  if(!intents.length)$('payment-intents').append(node('p','Không có yêu cầu trong bộ lọc này.','payment-muted'));
  if(!receipts.length)$('payment-receipts').append(node('p','Chưa có webhook cần xem xét.','payment-muted'));
  $('intents-page').textContent='Trang '+(page+1)+' · tối đa 25 yêu cầu';$('receipts-page').textContent='Trang '+(receiptPage+1)+' · tối đa 25 giao dịch';
 }
 function card(row,intent){const c=node('article',undefined,'payment-card'),state=intent?row.state:row.result;c.append(node('h3','Mã đơn '+row.order_code),node('span',labels[state]||state,'payment-badge '+state),node('p',money(row.amount)+(intent?'':' · '+row.currency)),node('p',new Date(row.created_at).toLocaleString('vi-VN'),'payment-muted'));if(!intent)c.append(node('p','Mã giao dịch: '+row.reference));const b=node('button','Xem & xử lý','payment-secondary');b.type='button';b.onclick=()=>openDetail(row,intent);c.append(b);return c;}
 async function openDetail(row,intent){
  if(busy)return;const seq=++detailSequence;selected={row,intent};$('payment-reason').value='';$('payment-detail-status').textContent='';$('payment-history').replaceChildren(node('p','Đang tải lịch sử…'));
  $('payment-detail-summary').replaceChildren(node('p','Mã đơn '+row.order_code+' · '+money(row.amount)),node('p',labels[intent?row.state:row.result]||row.result));
  if(intent&&row.state==='ready'&&checkout(row.checkout_url)){const a=node('a','Mở link payOS');a.href=checkout(row.checkout_url);a.target='_blank';a.rel='noopener noreferrer';$('payment-detail-summary').append(a);}
  $('payment-detail').showModal();setBusy(false);
  try{let query=db.from('payos_admin_events').select('id,kind,reason,details,created_at').order('created_at',{ascending:false}).limit(30);query=intent?query.eq('intent_id',row.id):query.eq('receipt_id',row.id);const result=await query;if(seq!==detailSequence)return;if(result.error)throw Error();$('payment-history').replaceChildren(...(result.data||[]).map(e=>{const item=node('div',undefined,'payment-history-item');item.append(node('strong',eventNames[e.kind]||e.kind),node('p',e.reason),node('p',new Date(e.created_at).toLocaleString('vi-VN'),'payment-muted'));if(e.details?.outcome)item.append(node('p','Kết quả: '+e.details.outcome));return item;}));if(!result.data?.length)$('payment-history').append(node('p','Chưa có lịch sử xử lý.'));}catch{if(seq===detailSequence)$('payment-history').replaceChildren(node('p','Không tải được lịch sử. Đóng và mở lại để thử.'));}
 }
 async function detailAction(action,kind){
  if(busy||!selected)return;const reason=$('payment-reason').value.trim();if(reason.length<5||reason.length>1000){$('payment-detail-status').textContent='Nhập lý do từ 5 đến 1000 ký tự.';$('payment-reason').focus();return;}
  const choice=selected;setBusy(true);$('payment-detail-status').textContent='Đang xác minh và lưu thao tác…';
  try{const result=await call('payos-admin',{action,kind,reason,...(choice.intent?{intentId:choice.row.id}:{receiptId:choice.row.id})});const refreshed=await load();if(!refreshed)return;$('payment-detail').close();detailSequence++;$('payment-status').tabIndex=-1;$('payment-status').focus();message(result.outcome==='confirmed_paid'?'payOS xác nhận đã nhận đủ tiền. Hãy kiểm tra thêm tại ngân hàng.':result.outcome==='needs_review'?'Thông tin chưa khớp; yêu cầu tiếp tục chờ xử lý.':kind==='bank_confirmed'?'Đã lưu xác nhận kiểm tra ngân hàng của Admin.':'Đã lưu thao tác và nhật ký xử lý.');}catch(error){$('payment-detail-status').textContent=failure(error);}finally{setBusy(false);}
 }
 try{
  if(!cfg?.supabaseUrl||!window.supabase?.createClient)throw Error();db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,window.ATELIER_CLIENT_OPTIONS||{});
  const auth=await db.auth.getUser();if(auth.error||!auth.data?.user){message('Vui lòng đăng nhập tại trang Quản trị rồi mở lại mục này.');return;}
  const profile=await db.from('staff_profiles').select('role,active').eq('user_id',auth.data.user.id).single();if(profile.error||!profile.data?.active||profile.data.role!=='admin'||auth.data.user.app_metadata?.role!=='admin'){message('Chỉ Quản trị viên đang hoạt động được truy cập đối soát.');return;}
  $('payment-app').hidden=false;
  $('deposit-quote').onchange=optionSummary;$('refresh-payments').onclick=()=>{if(!busy)load();};$('payment-filter').onchange=()=>{if(!busy){page=0;load();}};
  for(const [id,delta,receipt] of [['intents-prev',-1,false],['intents-next',1,false],['receipts-prev',-1,true],['receipts-next',1,true]])$(id).onclick=()=>{if(!busy){if(receipt)receiptPage=Math.max(0,receiptPage+delta);else page=Math.max(0,page+delta);load();}};
  $('close-payment-detail').onclick=()=>{if(!busy){detailSequence++;selected=null;$('payment-detail').close();}};$('payment-detail').addEventListener('cancel',event=>{if(busy)event.preventDefault();else{detailSequence++;selected=null;}});
  $('sync-provider').onclick=()=>detailAction('sync');$('save-review').onclick=()=>detailAction('review','note');$('external-review').onclick=()=>detailAction('review','handled_externally');$('reopen-review').onclick=()=>detailAction('review','reopen');$('confirm-bank').onclick=()=>detailAction('review','bank_confirmed');
  $('confirm-webhook').onclick=async()=>{if(busy)return;if(!confirm('Đăng ký và kiểm tra webhook của website này cho kênh payOS? Thao tác có thể thay webhook đang cấu hình trên kênh.'))return;setBusy(true);try{await call('payos-admin',{action:'confirm_webhook',reason:'Admin yêu cầu đăng ký và xác minh webhook của ATELIER HOME'});await load();message('payOS đã xác minh webhook. Đây chưa phải xác nhận tiền vào ngân hàng.');}catch(error){message(failure(error));}finally{setBusy(false);}};
  $('deposit-form').onsubmit=async event=>{event.preventDefault();if(busy)return;const amount=Number($('deposit-amount').value),quoteId=$('deposit-quote').value;if(!Number.isSafeInteger(amount)||amount<=0||!quoteId){message('Chọn báo giá và nhập số tiền VND nguyên dương.');return;}
   if(!confirm('Tạo link đặt cọc '+money(amount)+' cho báo giá đã chọn?'))return;
   if(!pending)pending={quoteId,amount,requestKey:crypto.randomUUID()};setBusy(true);showLink(null);$('deposit-result').textContent='Đang tạo yêu cầu…';
   try{const result=await call('payos-deposits',pending);pending=null;await load();showLink(result.checkoutUrl);$('deposit-result').textContent=result.state==='ready'?'Đã tạo link. Kiểm tra thông tin người nhận trên payOS trước khi chuyển khoản.':result.state==='paid'?'Máy chủ đã ghi nhận thu tiền.':'Yêu cầu cần đối soát. Mở bộ lọc Tất cả để kiểm tra.';}catch(error){$('deposit-result').textContent=failure(error);$('payment-filter').value='all';await load();}finally{setBusy(false);}
  };
  await load();
 }catch{clearPrivate();message('Không xác minh được tài khoản hoặc kết nối. Vui lòng đăng nhập lại và thử tải trang.');}
})();
