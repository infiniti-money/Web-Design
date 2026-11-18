/* Presentation enhancement only: no API, cookies, storage, routing or lead writes. */
(()=>{'use strict';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 // Native menus remain usable without this keyboard/outside-click enhancement.
 const menu=document.querySelector('.public-menu'),hamb=document.querySelector('#hamb'),homeMenu=document.querySelector('#site-menu');
 function closeMenu(focus=false){if(menu?.open){menu.open=false;if(focus)menu.querySelector('summary').focus();}if(homeMenu?.classList.contains('menu-open')){homeMenu.classList.remove('menu-open');hamb?.setAttribute('aria-expanded','false');if(focus)hamb?.focus();}}
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu(true);});
 document.addEventListener('click',event=>{if(menu?.open&&!menu.contains(event.target))closeMenu();if(homeMenu?.classList.contains('menu-open')&&!homeMenu.contains(event.target)&&!hamb?.contains(event.target))closeMenu();if(event.target.closest('.public-menu nav a'))closeMenu();});
 // Trigger inside the viewport, not before the visitor can see the transition.
 let observer,imageObserver;const reveal=el=>{el.dataset.atelierReveal='done';observer?.unobserve(el);};
 if(!motion.matches&&'IntersectionObserver'in window){
  observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target);}),{rootMargin:'0px 0px -8% 0px',threshold:0.12});
  const candidates=[...document.querySelectorAll('.intro-copy,.section-head,.turnkey-heading,.estimate-copy,.consult-copy,.process .step,.advantage-grid>article,.public-page .cards>*,.public-page .split>*,.public-page .faq>details')].filter(el=>el.getBoundingClientRect().top>innerHeight);
  candidates.forEach((el,index)=>{el.style.setProperty('--atelier-reveal-delay',(index%3)*70+'ms');el.dataset.atelierReveal='pending';observer.observe(el);});
 }
 // Frames clip image zoom without moving captions or changing image sources/dimensions.
 // Keep the priority hero/gallery images outside this enhancement.
 const imageSelector='.intro-photo>img,.service img,.project .image img,.mosaic img,.atelier-service-visual img,.project-gallery img,.project-card img,.featured-card img,.public-page .item img,.article-cover,.project-cover,.knowledge-card img';
 const registered=new WeakSet(),queuedFrames=new Set();
 if('IntersectionObserver'in window)imageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const ratio=entry.intersectionRatio;
  if(ratio>=0.22)entry.target.dataset.atelierImageState='shown';
  else if(!entry.isIntersecting)entry.target.dataset.atelierImageState='waiting';
 }),{threshold:[0,0.22],rootMargin:'0px 0px -6% 0px'});
 function registerImage(image){
  if(registered.has(image)||!image.matches(imageSelector)||image.closest('[data-comparison]'))return;registered.add(image);
  let frame=image.parentElement;
  if(!frame.matches('.intro-photo,.service,.image,.atelier-media')){
   frame=document.createElement('div');frame.className='atelier-media';
   if(image.classList.contains('article-cover'))frame.classList.add('atelier-article-media');
   image.before(frame);frame.append(image);
  }
  frame.classList.add('atelier-media');frame.setAttribute('data-atelier-media','');
  queuedFrames.add(frame);
 }
 // Read geometry in one batch after wrapping, then write states. Interleaving
 // each image's DOM writes and layout reads forces a full page layout per image.
 function flushImages(){const frames=[...queuedFrames];queuedFrames.clear();const waiting=frames.map(frame=>frame.getBoundingClientRect().top>=innerHeight);frames.forEach((frame,index)=>{frame.dataset.atelierImageState=waiting[index]?'waiting':'shown';if(!motion.matches)imageObserver?.observe(frame);});}
 document.querySelectorAll(imageSelector).forEach(registerImage);
 flushImages();
 const main=document.querySelector('main');if(main)new MutationObserver(records=>{records.forEach(record=>{
  record.removedNodes.forEach(node=>{if(node.nodeType!==1||node.isConnected)return;if(node.matches('[data-atelier-media]'))imageObserver?.unobserve(node);node.querySelectorAll('[data-atelier-media]').forEach(frame=>imageObserver?.unobserve(frame));});
  record.addedNodes.forEach(node=>{if(node.nodeType!==1)return;if(node.matches('img'))registerImage(node);node.querySelectorAll('img').forEach(registerImage);});
 });flushImages();}).observe(main,{childList:true,subtree:true});
 function showAll(){observer?.disconnect();imageObserver?.disconnect();document.querySelectorAll('[data-atelier-reveal=pending]').forEach(el=>reveal(el));document.querySelectorAll('[data-atelier-media]').forEach(el=>{el.dataset.atelierImageState='shown';});}
 const observeImages=()=>document.querySelectorAll('[data-atelier-media]').forEach(el=>imageObserver?.observe(el));
 motion.addEventListener?.('change',event=>{if(event.matches)showAll();else observeImages();});
 addEventListener('pageshow',event=>{if(event.persisted){showAll();if(!motion.matches)observeImages();}});
 document.addEventListener('focusin',event=>{const group=event.target.closest('[data-atelier-reveal=pending]');if(group)reveal(group);});
 // Native overflow/snap handles touch, trackpads and keyboard. Buttons add a visible alternative.
 document.querySelectorAll('.atelier-home .service-grid,.atelier-home .project-grid,.atelier-home .mosaic').forEach((rail,index)=>{
  const labels=['Các dịch vụ','Ý tưởng không gian','Góc cảm hứng'];const name=rail.classList.contains('service-grid')?labels[0]:rail.classList.contains('project-grid')?labels[1]:labels[2];
  const controls=document.createElement('div');controls.className='atelier-rail-controls';controls.hidden=true;controls.setAttribute('aria-label',name+' — điều khiển');
  if(!rail.id)rail.id='atelier-rail-'+index;
  const buttons=[['←','Xem trước',-1],['→','Xem tiếp',1]].map(([text,label,direction])=>{const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label+': '+name.toLowerCase());button.setAttribute('aria-controls',rail.id);button.addEventListener('click',()=>rail.scrollBy({left:direction*rail.clientWidth*.88,behavior:motion.matches?'instant':'smooth'}));controls.append(button);return button;});
  rail.after(controls);
  function update(){const overflow=rail.scrollWidth>rail.clientWidth+4;controls.hidden=!overflow;if(overflow){rail.tabIndex=0;rail.setAttribute('role','region');rail.setAttribute('aria-label',name+' — vuốt hoặc dùng nút để khám phá');}else{rail.removeAttribute('tabindex');rail.removeAttribute('role');rail.removeAttribute('aria-label');}buttons[0].disabled=rail.scrollLeft<4;buttons[1].disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-4;}
  rail.addEventListener('scroll',update,{passive:true});if('ResizeObserver'in window)new ResizeObserver(update).observe(rail);else addEventListener('resize',update,{passive:true});
  new MutationObserver(update).observe(rail,{childList:true});update();
 });
})();
