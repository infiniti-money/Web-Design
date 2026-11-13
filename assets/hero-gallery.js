/* Progressive enhancement: original priority hero image stays visible without JS. */
(()=>{
  "use strict";
  const hero=document.getElementById("home");
  if(!hero||!hero.classList.contains("hero"))return;
  const slides=[...hero.querySelectorAll(".hero-slide")];
  const controls=hero.querySelector(".hero-carousel-controls");
  const indicator=hero.querySelector(".hero-indicator");
  const announcement=hero.querySelector(".hero-carousel-announcement");
  if(slides.length!==2||!controls||!indicator)return;
  const previous=controls.querySelector("[data-hero-prev]");
  const next=controls.querySelector("[data-hero-next]");
  const toggle=controls.querySelector("[data-hero-toggle]");
  if(!previous||!next||!toggle)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const requests=new Map();
  const labels=["Không gian phòng khách","Vật liệu và phong cách","Thiết kế căn hộ"];
  const prefix=number=>String(number).padStart(2,"0");
  let index=0,serial=0,timer=null,isIntersecting=true,userPaused=false;
  function eligible(){
    return !reduced.matches&&!navigator.connection?.saveData&&!userPaused
      &&!document.hidden&&isIntersecting&&!hero.matches(":hover")
      &&!hero.matches(":focus-within")&&hero.querySelector("#hero-video")?.hidden!==false;
  }
  function schedule(){
    window.clearTimeout(timer);
    if(eligible())timer=window.setTimeout(()=>change((index+1)%3,false),7500);
  }
  function load(number){
    if(number===0)return Promise.resolve(true);
    const slide=slides[number-1];
    if(slide.dataset.loaded==="true")return Promise.resolve(true);
    if(!requests.has(number)){
      const image=new Image();
      image.decoding="async";
      image.fetchPriority="low";
      const url=new URL(slide.dataset.heroSrc,document.baseURI);
      const width=Math.max(640,Math.min(1920,Math.ceil(window.innerWidth*Math.min(devicePixelRatio||1,1.5)/320)*320));
      url.searchParams.set("w",String(width));
      const ready=new Promise(resolve=>{
        image.onload=()=>resolve(true);
        image.onerror=()=>resolve(false);
        image.src=url.href;
      }).then(ok=>{
        if(ok){slide.style.backgroundImage='url("'+url.href+'")';slide.dataset.loaded="true";}
        else requests.delete(number);
        return ok;
      });
      requests.set(number,ready);
    }
    return requests.get(number);
  }
  async function change(target,manual){
    const request=++serial;
    window.clearTimeout(timer);
    const position=(target+3)%3;
    const loaded=await load(position);
    if(request!==serial)return;
    if(!loaded){
      if(manual)announcement.textContent="Không tải được ảnh, vui lòng thử lại.";
      schedule();
      return;
    }
    index=position;
    slides.forEach((slide,slideIndex)=>slide.classList.toggle("is-active",slideIndex===index-1));
    hero.dataset.heroActive=String(index+1);
    indicator.textContent=prefix(index+1)+" / 03 — INTERIOR DESIGN";
    if(manual)announcement.textContent="Ảnh "+(index+1)+" trên 3: "+labels[index];
    schedule();
  }
  function setPause(paused){
    userPaused=paused;
    toggle.setAttribute("aria-pressed",String(paused));
    toggle.textContent=paused?"Phát tiếp":"Tạm dừng";
    toggle.setAttribute("aria-label",paused?"Tiếp tục tự chuyển ảnh":"Tạm dừng tự chuyển ảnh");
    schedule();
  }
  previous.addEventListener("click",()=>change(index-1,true));
  next.addEventListener("click",()=>change(index+1,true));
  toggle.addEventListener("click",()=>setPause(!userPaused));
  hero.addEventListener("mouseenter",schedule);
  hero.addEventListener("mouseleave",schedule);
  hero.addEventListener("focusin",schedule);
  hero.addEventListener("focusout",()=>window.setTimeout(schedule,0));
  document.addEventListener("visibilitychange",schedule);
  window.addEventListener("pageshow",schedule);
  window.addEventListener("pagehide",()=>window.clearTimeout(timer));
  reduced.addEventListener?.("change",schedule);
  const video=hero.querySelector("#hero-video");
  if(video&&window.MutationObserver){
    const observer=new MutationObserver(schedule);
    observer.observe(video,{attributes:true,attributeFilter:["hidden"]});
  }
  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{
      isIntersecting=entries[0].isIntersecting;schedule();
    },{threshold:0.2});
    observer.observe(hero);
  }
  hero.dataset.heroActive="1";
  document.documentElement.classList.add("hero-gallery-ready");
  schedule();
})();
