/* No provider calls, persistence or automatic lead submission. Prices require approved configuration. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)api.mount(root);})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const tiers={economy:'Tiết kiệm',balanced:'Khá',premium:'Cao cấp'};
 function calculate(input,config,now=Date.now()){
  const area=Number(input.area),bedrooms=Number(input.bedrooms),tier=input.tier;
  if(!String(input.area??'').trim()||!String(input.bedrooms??'').trim()||!Number.isFinite(area)||area<10||area>1000||!Number.isInteger(bedrooms)||bedrooms<0||bedrooms>10||!Object.hasOwn(tiers,tier))throw Error('Vui lòng nhập diện tích 10–1.000 m², số phòng ngủ 0–10 và chọn mức đầu tư.');
  const needs={area,bedrooms,tier,label:tiers[tier]};
  if(config?.enabled!==true||config.approved!==true||!config.version||!Number.isFinite(Date.parse(config.validUntil))||Date.parse(config.validUntil)<now)return{...needs,available:false};
  const rates=config.packages?.[tier];
  if(!rates||![rates.minPerM2,rates.maxPerM2,rates.perBedroom].every(x=>Number.isSafeInteger(x)&&x>=0)||rates.minPerM2<1||rates.maxPerM2<rates.minPerM2)return{...needs,available:false};
  const min=Math.round(area*rates.minPerM2+bedrooms*rates.perBedroom),max=Math.round(area*rates.maxPerM2+bedrooms*rates.perBedroom);
  if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max))throw Error('Nhu cầu vượt phạm vi tính toán. Vui lòng trao đổi trực tiếp để được tư vấn.');
  return{...needs,available:true,min,max,version:config.version};
 }
 function summary(result){return 'Nhu cầu thi công trọn gói: căn hộ '+result.area+' m²; '+result.bedrooms+' phòng ngủ; mức đầu tư '+result.label+'. '+(result.available?'Khoảng tham khảo '+result.min.toLocaleString('vi-VN')+'–'+result.max.toLocaleString('vi-VN')+' VND (bảng '+result.version+'). Chưa phải báo giá được duyệt.':'Chưa có đơn giá công khai; đề nghị khảo sát và báo giá theo hạng mục.');}
 function mount(win){
  const doc=win.document,form=doc.getElementById('estimate-form');if(!form)return;
  let config;try{config=JSON.parse(doc.getElementById('conversion-config').textContent);}catch{return;}
  const status=doc.getElementById('estimate-status'),handoff=doc.getElementById('estimate-handoff');let result=null;
  const section=doc.getElementById('estimate');if(section&&'IntersectionObserver' in win)new win.IntersectionObserver(entries=>doc.body.classList.toggle('estimate-visible',entries.some(entry=>entry.isIntersecting)),{threshold:0.05}).observe(section);
  const hero=doc.getElementById('home');if(hero&&'IntersectionObserver' in win)new win.IntersectionObserver(entries=>doc.body.classList.toggle('hero-visible',entries.some(entry=>entry.isIntersecting))).observe(hero);
  doc.getElementById('estimate-submit').disabled=false;
  form.addEventListener('input',()=>{result=null;handoff.hidden=true;status.textContent='Thông tin vừa thay đổi. Bấm Xem nhu cầu để cập nhật.';});
  form.addEventListener('submit',event=>{
   event.preventDefault();try{result=calculate({area:form.elements.area.value,bedrooms:form.elements.bedrooms.value,tier:form.elements.tier.value},config.estimate);status.textContent=summary(result);handoff.hidden=false;}catch(e){result=null;handoff.hidden=true;status.textContent=e.message;}
  });
  handoff.addEventListener('click',()=>{
   if(!result)return;
   const details=doc.getElementById('details'),service=doc.getElementById('service'),space=doc.getElementById('space'),text=summary(result);
   if(!details||!service||!space)return;
   if(details.disabled||service.disabled){status.textContent='Form đang xử lý hoặc đã tiếp nhận yêu cầu trước. Vui lòng hoàn tất hoặc bấm Gửi yêu cầu khác trước khi thêm nhu cầu.';return;}
   const combined=details.value.includes(text)?details.value:[details.value.trim(),text].filter(Boolean).join('\n');
   if(combined.length>details.maxLength){status.textContent='Phần mô tả hiện có gần đầy. Vui lòng rút gọn trước khi thêm nhu cầu; nội dung cũ được giữ nguyên.';return;}
   details.value=combined;service.value='Thi công trọn gói';space.value='Căn hộ';
   const note=doc.getElementById('requested-service-note');if(note&&!note.hidden)note.textContent='Nhu cầu thi công trọn gói đã được chuyển từ công cụ chuẩn bị dự toán.';
   for(const element of [details,service,space])element.dispatchEvent(new win.Event('input',{bubbles:true}));
   doc.getElementById('contact').scrollIntoView({behavior:win.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   doc.getElementById('full-name').focus({preventScroll:true});status.textContent='Đã điền nhu cầu vào form tư vấn. Vui lòng nhập liên hệ, đọc chính sách và hoàn tất xác minh trước khi gửi.';
  });
  const button=doc.getElementById('hero-video-toggle'),video=doc.getElementById('hero-video'),caption=doc.getElementById('hero-video-caption');
  const media=config.heroVideo;
  if(button&&video&&media?.rightsConfirmed===true&&media.realFootageConfirmed===true&&typeof media.src==='string'&&(/^(?:assets\/media\/[\w/-]+\.(?:mp4|webm)|https:\/\/[^\s<>"']+)$/i.test(media.src))){
   button.hidden=false;button.addEventListener('click',async()=>{
    if(!video.hidden){video.pause();video.hidden=true;caption.hidden=true;button.textContent='Xem video công trình';button.setAttribute('aria-pressed','false');return;}
    video.src=media.src;video.hidden=false;caption.textContent=media.caption;caption.hidden=false;button.textContent='Ẩn video';button.setAttribute('aria-pressed','true');
    try{await video.play();}catch{video.hidden=true;caption.hidden=true;button.textContent='Video chưa tải được. Thử lại';button.setAttribute('aria-pressed','false');}
   });
  }
 }
 return{calculate,summary,mount};
});
