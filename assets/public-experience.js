/* Presentation enhancement only: no API, cookies, storage, routing or lead writes. */
(()=>{'use strict';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 // Native menus remain usable without this keyboard/outside-click enhancement.
 const menu=document.querySelector('.public-menu'),hamb=document.querySelector('#hamb'),homeMenu=document.querySelector('#site-menu');
 function closeMenu(focus=false){if(menu?.open){menu.open=false;if(focus)menu.querySelector('summary').focus();}if(homeMenu?.classList.contains('menu-open')){homeMenu.classList.remove('menu-open');hamb?.setAttribute('aria-expanded','false');if(focus)hamb?.focus();}}
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu(true);});
 document.addEventListener('click',event=>{if(menu?.open&&!menu.contains(event.target))closeMenu();if(homeMenu?.classList.contains('menu-open')&&!homeMenu.contains(event.target)&&!hamb?.contains(event.target))closeMenu();if(event.target.closest('.public-menu nav a'))closeMenu();});
 // Do not animate above-the-fold content or hide anything until observers exist.
 let observer;const reveal=el=>{el.dataset.atelierReveal='done';observer?.unobserve(el);};
 if(!motion.matches&&'IntersectionObserver'in window){
  observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)reveal(entry.target);}),{rootMargin:'0px 0px 80px 0px',threshold:0});
  document.querySelectorAll('.intro-grid,.section-head,.service-grid,.mosaic,.process-steps,.advantage-grid,.public-page .cards,.public-page .split,.public-page .faq,.project-gallery').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight+40){el.dataset.atelierReveal='pending';observer.observe(el);}});
 }
 function showAll(){observer?.disconnect();document.querySelectorAll('[data-atelier-reveal=pending]').forEach(el=>reveal(el));}
 motion.addEventListener?.('change',event=>{if(event.matches)showAll();});
 addEventListener('pageshow',event=>{if(event.persisted)showAll();});
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
