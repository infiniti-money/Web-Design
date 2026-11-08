/* Progressive enhancement: both labelled images remain readable without JavaScript. */
document.querySelectorAll('[data-comparison]').forEach(stage=>{
 const section=stage.closest('section'),control=section.querySelector('input[type="range"]'),controls=section.querySelector('[data-comparison-controls]');
 if(!control||!controls)return;
 const labels=JSON.parse(stage.dataset.labels),update=()=>{const value=Math.min(100,Math.max(0,Number(control.value)));stage.style.setProperty('--compare-position',value+'%');control.setAttribute('aria-valuetext',value+'% '+labels[0]+', '+(100-value)+'% '+labels[1]);};
 stage.style.aspectRatio=stage.dataset.ratio;stage.classList.add('comparison-ready');controls.hidden=false;update();control.addEventListener('input',update);
});
