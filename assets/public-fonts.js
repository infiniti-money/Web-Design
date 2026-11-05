/* Print media keeps the external font stylesheet out of the initial render path. */
(() => {
  "use strict";
  const sheet=document.getElementById("home-fonts");
  if(!sheet)return;
  const activate=()=>{
    const hero=document.querySelector("img.hero-photo"),apply=()=>{sheet.media="all";};
    // Let the main photograph finish before starting web-font file downloads.
    if(!hero||hero.complete)apply();
    else{hero.addEventListener("load",apply,{once:true});hero.addEventListener("error",apply,{once:true});}
  };
  // A cached stylesheet may have loaded before this deferred script executes.
  if(sheet.sheet)activate();
  else sheet.addEventListener("load",activate,{once:true});
  // On network errors the CSS font stacks continue to render with system fonts.
})();
