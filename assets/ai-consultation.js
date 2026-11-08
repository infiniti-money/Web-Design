/* Structured, opt-in Gemini consultation. No contact details or free text sent to AI. */
(()=>{
 'use strict';const doc=document,dialog=doc.getElementById('ai-dialog'),open=doc.getElementById('ai-open');if(!dialog||!open)return;
 const by=id=>doc.getElementById(id),form=by('ai-form'),status=by('ai-status'),answer=by('ai-answer'),send=by('ai-send'),consent=by('ai-consent');
 const cfg=window.ATELIER_CONFIG||{};if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.supabaseUrl||''))return;
 const endpoint=cfg.supabaseUrl+'/functions/v1/ai-consultation';let generation=0,enabled=false,token='',widget,controller,pending=false;
 open.disabled=false;
 const needs=()=>Object.fromEntries(['space','style','priority','topic','budget','area','bedrooms'].map(key=>[key,['area','bedrooms'].includes(key)?Number(form.elements[key].value):form.elements[key].value]));
 const update=()=>{send.disabled=!enabled||!consent.checked||!token||pending;send.setAttribute('aria-busy',String(pending));};
 const clearCaptcha=()=>{token='';if(widget!==undefined)window.turnstile?.remove?.(widget);widget=undefined;by('ai-captcha').replaceChildren();update();};
 async function sdk(){
  if(window.turnstile?.render)return;
  await new Promise((resolve,reject)=>{let timer;const done=()=>{clearTimeout(timer);window.turnstile?.render?resolve():reject(Error('captcha'));},fail=()=>{clearTimeout(timer);reject(Error('captcha'));};let script=doc.querySelector('script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]');if(!script){script=doc.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;doc.head.append(script);}script.addEventListener('load',done,{once:true});script.addEventListener('error',fail,{once:true});timer=setTimeout(fail,12000);});
 }
 async function captcha(){
  clearCaptcha();if(!enabled||!consent.checked||!dialog.open)return;
  const current=generation;status.textContent='Đang chuẩn bị xác minh chống bot…';
  try{await sdk();if(current!==generation||!dialog.open||!consent.checked)return;widget=window.turnstile.render(by('ai-captcha'),{sitekey:cfg.turnstileSiteKey,action:'ai_consultation',callback:value=>{if(current!==generation||!dialog.open||!consent.checked)return;token=value;status.textContent='Đã xác minh. Bấm Nhận tư vấn AI để gửi các lựa chọn của bạn.';update();},'expired-callback':()=>{if(current!==generation)return;token='';status.textContent='Xác minh hết hạn. Bấm Xác minh lại.';update();},'error-callback':()=>{if(current!==generation)return;token='';status.textContent='Chưa xác minh được. Bấm Xác minh lại hoặc chuyển sang nhân viên.';update();}});}catch{if(current===generation)status.textContent='Không tải được xác minh. Bạn có thể thử lại hoặc chuyển sang nhân viên.';}
 }
 open.addEventListener('click',async()=>{
  if(dialog.open)return;dialog.showModal();const current=++generation;enabled=false;answer.textContent='';status.textContent='Đang kiểm tra khả năng tư vấn…';update();
  try{const r=await fetch(endpoint+'/health',{signal:AbortSignal.timeout(8000)}),data=await r.json();if(current!==generation||!dialog.open)return;enabled=r.ok&&data.ok===true&&data.enabled===true;status.textContent=enabled?'Chọn nhu cầu và đọc điều kiện trước khi gửi tới Gemini.':'Trợ lý AI chưa được kích hoạt hoặc đang tạm dừng. Bạn vẫn có thể chuyển nhu cầu sang nhân viên.';update();}catch{if(current===generation)status.textContent='Chưa kết nối được trợ lý AI. Có thể thử mở lại hoặc chuyển nhu cầu sang nhân viên.';}
 });
 by('ai-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{generation++;controller?.abort();pending=false;enabled=false;for(const element of form.elements)element.disabled=false;consent.checked=false;answer.textContent='';clearCaptcha();});
 consent.addEventListener('change',()=>{if(consent.checked)captcha();else clearCaptcha();});by('ai-captcha-retry').addEventListener('click',captcha);
 form.addEventListener('change',event=>{if(event.target!==consent){answer.textContent='';status.textContent='Nhu cầu đã thay đổi. Kết quả mới sẽ dựa trên lựa chọn hiện tại.';}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(pending||!enabled||!consent.checked||!token)return;
  const current=generation;controller=new AbortController();const timer=setTimeout(()=>controller.abort(),40000);const payload={...needs(),consent:true,turnstile_token:token};pending=true;answer.textContent='';status.textContent='AI đang tổng hợp tư vấn tham khảo…';update();
  for(const element of form.elements)element.disabled=true;
  try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});const data=await r.json();if(current!==generation||!dialog.open)return;
   if(!r.ok||data.ok!==true||typeof data.answer!=='string'||!data.answer.trim()||data.answer.length>14000)throw Error(data.code||'AI_UNAVAILABLE');
   answer.textContent=data.answer;status.textContent='Đã nhận tư vấn AI. Đây là gợi ý tham khảo, cần khảo sát và xác nhận với nhân viên trước khi thực hiện.';answer.focus();
  }catch(e){if(current!==generation)return;status.textContent=e.message==='AI_LIMIT_REACHED'?'Đã chạm hạn mức AI. Không tự gửi lại; bạn có thể chuyển sang nhân viên.':e.message==='CAPTCHA_FAILED'||e.message==='CAPTCHA_REQUIRED'?'Xác minh chưa hợp lệ. Bấm Xác minh lại.':'AI chưa trả lời được hoặc đã hết thời gian chờ. Bạn có thể thử lại sau hoặc chuyển sang nhân viên.';}
  finally{clearTimeout(timer);if(current===generation){pending=false;for(const element of form.elements)element.disabled=false;clearCaptcha();}}
 });
 by('ai-human').addEventListener('click',()=>{
  const n=needs();if(!Number.isFinite(n.area)||n.area<10||n.area>1000)return form.elements.area.reportValidity();
  const label=key=>form.elements[key].selectedOptions[0].textContent;
  const summary=`Nhu cầu tư vấn nội thất: ${label('space')}, ${n.area} m², ${n.bedrooms} phòng ngủ; phong cách ${label('style')}; ưu tiên ${label('priority')}; mức đầu tư ${label('budget')}; chủ đề ${label('topic')}. Đề nghị nhân viên trao đổi, chưa phải báo giá.`;
  const details=by('details');if(!details||details.disabled){status.textContent='Form tư vấn đang xử lý hoặc đã tiếp nhận yêu cầu. Vui lòng hoàn tất trước khi thêm nhu cầu.';return;}
  const combined=details.value.includes(summary)?details.value:[details.value.trim(),summary].filter(Boolean).join('\n');if(combined.length>details.maxLength){status.textContent='Mô tả hiện có gần đầy. Vui lòng rút gọn trước; nội dung cũ được giữ nguyên.';return;}
  details.value=combined;details.dispatchEvent(new Event('input',{bubbles:true}));dialog.close();by('contact').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});by('full-name').focus({preventScroll:true});
 });
})();
