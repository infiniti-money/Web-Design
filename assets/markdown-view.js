(() => {
  "use strict";
  window.AtelierMarkdown = {
    render(target, value) {
      if(!window.marked || !window.DOMPurify) { target.textContent=value||""; return; }
      target.innerHTML=window.DOMPurify.sanitize(window.marked.parse(String(value||""),{gfm:true,breaks:false}),{
        USE_PROFILES:{html:true},FORBID_TAGS:["style","iframe","object","embed","form","input","button","textarea","select"],FORBID_ATTR:["style"]
      });
      target.querySelectorAll("h1").forEach(heading=>{const h2=document.createElement("h2");h2.replaceChildren(...heading.childNodes);heading.replaceWith(h2);});
      target.querySelectorAll("a").forEach(link=>{const href=link.getAttribute("href")||"";if(!/^(https:\/\/|mailto:|#)/i.test(href))link.removeAttribute("href");link.target="_blank";link.rel="noopener noreferrer";});
      target.querySelectorAll("img").forEach(img=>{if(!/^https:\/\//i.test(img.getAttribute("src")||"")){img.remove();return;}img.loading="lazy";img.decoding="async";});
    }
  };
})();
