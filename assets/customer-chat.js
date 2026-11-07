(() => {
  "use strict";
  const config=window.ATELIER_INTEGRATIONS?.tawk,target=document.querySelector(".consult-copy");
  if(!target||config?.enabled!==true||!/^[a-f0-9]{24}$/.test(config.propertyId)||!/^[a-zA-Z0-9]{6,32}$/.test(config.widgetId))return;
  const box=document.createElement("div"),button=document.createElement("button"),notice=document.createElement("p"),status=document.createElement("p");
  button.type="button";button.className="btn";button.textContent="Chat trực tiếp với nhân viên";
  notice.textContent="Khi mở chat, dịch vụ tawk.to sẽ được tải. Bạn vẫn có thể dùng biểu mẫu hoặc email tại mục Liên hệ khi nhân viên chưa trực.";
  status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.style.fontSize=notice.style.fontSize="13px";
  box.append(notice,button,status);target.append(box);
  let pending=false,ready=false,attempt=0;
  button.addEventListener("click",()=>{
    if(pending)return;
    if(ready){window.Tawk_API.showWidget();window.Tawk_API.maximize();return;}
    pending=true;button.disabled=true;button.setAttribute("aria-busy","true");status.textContent="Đang mở kênh chat…";
    const current=++attempt,script=document.createElement("script");
    const finish=()=>{pending=false;button.disabled=false;button.removeAttribute("aria-busy");};
    const fail=()=>{if(current!==attempt||!pending)return;clearTimeout(timer);++attempt;finish();script.remove();status.textContent="Chưa kết nối được chat. Bạn có thể thử lại hoặc dùng biểu mẫu/email hiện có.";};
    const timer=setTimeout(fail,15000);
    window.Tawk_API=window.Tawk_API||{};
    window.Tawk_API.onLoad=()=>{
      if(current!==attempt){window.Tawk_API.hideWidget?.();return;}
      if(typeof window.Tawk_API.maximize!=="function"||typeof window.Tawk_API.showWidget!=="function"){fail();return;}
      clearTimeout(timer);ready=true;finish();status.textContent="Kênh chat đã mở. Nếu nhân viên chưa trực, hãy để lại lời nhắn hoặc gửi yêu cầu tư vấn.";
      window.Tawk_API.showWidget();window.Tawk_API.maximize();
    };
    window.Tawk_API.onChatMinimized=()=>window.Tawk_API.hideWidget?.();
    script.async=true;script.charset="UTF-8";script.crossOrigin="anonymous";script.src=`https://embed.tawk.to/${config.propertyId}/${config.widgetId}`;script.referrerPolicy="strict-origin-when-cross-origin";script.onerror=fail;document.head.append(script);
  });
})();
