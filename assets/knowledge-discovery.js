(() => {
  "use strict";
  const form=document.getElementById("knowledge-filters");
  if(!form)return;
  const query=document.getElementById("knowledge-query"),category=document.getElementById("knowledge-category"),status=document.getElementById("knowledge-results"),empty=document.getElementById("knowledge-empty");
  const normalize=value=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[đĐ]/g,"d").toLocaleLowerCase("vi").replace(/\s+/g," ").trim();
  const cards=[...document.querySelectorAll("#knowledge-list .knowledge-card")].map(node=>({node,category:node.dataset.category,text:normalize([...node.querySelectorAll("h2,p")].map(part=>part.textContent).join(" "))}));
  let timer;
  function render(updateUrl=false){
    clearTimeout(timer);
    const terms=normalize(query.value).split(" ").filter(Boolean);let count=0;
    for(const card of cards){const show=(!category.value||card.category===category.value)&&terms.every(term=>card.text.includes(term));card.node.hidden=!show;if(show)count++;}
    status.textContent=`${count} / ${cards.length} bài hướng dẫn`;
    empty.hidden=count!==0;
    if(updateUrl){
      const url=new URL(location.href),value=query.value.trim();
      if(value)url.searchParams.set("q",value);else url.searchParams.delete("q");
      if(category.value)url.searchParams.set("category",category.value);else url.searchParams.delete("category");
      history.replaceState(null,"",url);
    }
  }
  function restore(){
    const params=new URL(location.href).searchParams;
    query.value=(params.get("q")||"").slice(0,160);
    const value=params.get("category")||"";
    category.value=[...category.options].some(option=>option.value===value)?value:"";
    render();
  }
  query.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>render(true),180);});
  category.addEventListener("change",()=>render(true));
  form.addEventListener("submit",event=>{event.preventDefault();render(true);});
  document.getElementById("knowledge-clear").addEventListener("click",()=>{query.value="";category.value="";render(true);query.focus();});
  addEventListener("popstate",restore);
  restore();form.hidden=false;status.hidden=false;
})();
