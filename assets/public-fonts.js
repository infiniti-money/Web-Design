/* Compatibility for cached older HTML: fonts must never wait for a photograph. */
(() => {
  "use strict";
  const sheet=document.getElementById("home-fonts");
  if(!sheet)return;
  sheet.media="all";
})();
