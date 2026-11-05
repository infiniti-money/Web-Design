/* ATELIER HOME — Public Supabase frontend.
 * In LIVE mode the consultation form FAILS CLOSED if Supabase cannot load.
 * Local demo submissions are only permitted when the project is unconfigured.
 */
(() => {
  "use strict";
  const cfg = window.ATELIER_CONFIG || {};
  if (!cfg.supabaseUrl && !cfg.supabasePublishableKey) return;
  const consultationStyles=document.getElementById("consultation-styles");
  if(consultationStyles){const activate=()=>{consultationStyles.media="all";};if(consultationStyles.sheet)activate();else consultationStyles.addEventListener("load",activate,{once:true});}

  const form = document.getElementById("lead-form");
  const feedback = document.getElementById("form-feedback");
  const modeDesc = document.getElementById("consult-mode-desc");
  const formFoot = form?.querySelector(".form-foot");
  const submit = form?.querySelector('[type="submit"]');
  let pending=false,complete=false,cooldownUntil=0,cooldownTimer=null;
  const controls=()=>form?[...form.elements]:[];
  const captchaRetry=document.createElement("button");captchaRetry.type="button";captchaRetry.id="captcha-retry";captchaRetry.className="form-secondary";captchaRetry.textContent="Thử lại xác minh";captchaRetry.hidden=true;
  const newRequest=document.createElement("button");newRequest.type="button";newRequest.id="new-consultation";newRequest.className="form-secondary";newRequest.textContent="Gửi yêu cầu khác";newRequest.hidden=true;
  feedback?.after(captchaRetry,newRequest);
  const showFeedback=(text,state="info")=>{if(feedback){feedback.textContent=text;feedback.dataset.state=state;feedback.tabIndex=-1;}};
  const focusFeedback=()=>feedback?.focus();
  const contact=document.getElementById("contact");
  if(contact&&"IntersectionObserver" in window){new IntersectionObserver(entries=>document.body.classList.toggle("consultation-visible",entries.some(entry=>entry.isIntersecting))).observe(contact);}

  // Always suppress the old localStorage demo handler when production is configured.
  const demoToggle = document.getElementById("admin-toggle");
  const demoArea = document.getElementById("admin-area");
  const adminLink = document.getElementById("admin-live-link");
  if (demoToggle) demoToggle.hidden = true;
  if (demoArea) demoArea.classList.remove("open");
  if (adminLink) adminLink.hidden = false;
  if (modeDesc) modeDesc.textContent =
    "Chia sẻ nhu cầu và số điện thoại để trao đổi về không gian của bạn. Sau khi gửi, hãy chờ thông báo xác nhận.";
  if (formFoot) formFoot.textContent =
    "Thông tin gửi vào hệ thống để liên hệ tư vấn. Không nhập mật khẩu hoặc dữ liệu nhạy cảm.";

  const configIsValid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl || "") &&
    /^sb_publishable_[a-zA-Z0-9_-]+$/.test(cfg.supabasePublishableKey || "");
  const backendReady = configIsValid;

  if (!backendReady) {
    const text = "Hệ thống chưa được cấu hình đúng. Chưa thể tiếp nhận yêu cầu.";
    if (feedback) feedback.textContent = text;
    if (submit) submit.disabled = true;
    console.error("Supabase consultation form is unavailable: invalid_config");
  }

  // Turnstile is activated ONLY once a real Cloudflare sitekey is configured.
  // The secret belongs in Supabase Edge Function secrets, never app-config.js.
  const captchaSiteKey = String(cfg.turnstileSiteKey || "").trim();
  const captchaActive = captchaSiteKey.length > 0;
  const captchaHost = document.getElementById("turnstile-container");
  let captchaWidget = null;
  let captchaToken = "";
  let captchaLoading = false;
  const refreshSubmit=()=>{if(submit)submit.disabled=pending||complete||!backendReady||Date.now()<cooldownUntil||(captchaActive&&!captchaToken);};
  const informCaptcha = (message) => {
    if(!pending&&!complete&&Date.now()>=cooldownUntil&&!(message===""&&feedback?.dataset.state==="error"))showFeedback(message);
  };
  if (captchaActive && backendReady) {
    if (submit) submit.disabled = true;
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(captchaSiteKey) || !captchaHost) {
      informCaptcha("Cấu hình xác minh chống bot chưa hợp lệ. Chưa thể gửi yêu cầu.");
    } else {
      const loadCaptcha = (event) => {
        if(event?.target===captchaRetry||pending||complete)return;
        if (captchaLoading || captchaWidget !== null || !backendReady) return;
        captchaLoading = true;
        captchaHost.hidden = false;
        informCaptcha("Đang tải xác minh chống bot...");
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onerror = () => {
          captchaLoading = false;
          script.remove();
          informCaptcha("Không thể tải xác minh chống bot. Chạm vào biểu mẫu để thử lại.");
          captchaRetry.hidden=false;
        };
        script.onload = () => {
          captchaLoading = false;
          try {
            captchaWidget = window.turnstile.render(captchaHost, {
              sitekey: captchaSiteKey,
              action: "consultation",
              theme: "light",
              callback: token => {
                captchaToken = token;
                captchaRetry.hidden=true;refreshSubmit();
                informCaptcha("");
              },
              "expired-callback": () => {
                captchaToken = "";
                captchaRetry.hidden=false;refreshSubmit();
                informCaptcha("Xác minh đã hết hạn. Vui lòng xác minh lại.");
              },
              "error-callback": () => {
                captchaToken = "";
                captchaRetry.hidden=false;refreshSubmit();
                informCaptcha("Không xác minh được. Vui lòng tải lại trang.");
              }
            });
          } catch {
            captchaRetry.hidden=false;
            informCaptcha("Không thể khởi tạo xác minh chống bot.");
          }
        };
        document.head.appendChild(script);
      };

      // Load shortly before the consultation form is needed. Form interaction remains
      // a fallback, and the Edge Function still requires server-verified Turnstile.
      informCaptcha("Xác minh chống bot sẽ tải khi bạn đến biểu mẫu.");
      form?.addEventListener("focusin", loadCaptcha);
      form?.addEventListener("pointerdown", loadCaptcha);
      captchaRetry.onclick=()=>{
        if(pending||complete)return;
        captchaToken="";refreshSubmit();
        if(captchaWidget!==null){try{window.turnstile.reset(captchaWidget);informCaptcha("Vui lòng hoàn tất xác minh mới.");}catch{informCaptcha("Không thể tải lại xác minh. Vui lòng tải lại trang.");}}
        else loadCaptcha();
      };
      if (form && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            loadCaptcha();
          }
        }, { rootMargin: "900px 0px" });
        observer.observe(form);
      } else {
        loadCaptcha();
      }
    }
  }

  async function loadProjects() {
    if (!backendReady) return;
    const projectsUrl = new URL(cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/projects");
    projectsUrl.searchParams.set("select", "title,category,area,style,image_url,summary");
    projectsUrl.searchParams.set("published", "eq.true");
    projectsUrl.searchParams.set("order", "sort_order.asc");
    const response = await fetch(projectsUrl, {
      headers: { apikey: cfg.supabasePublishableKey },
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Không tải được dự án trực tuyến:", "http_" + response.status);
      const grid = document.getElementById("project-grid");
      if (grid && !document.getElementById("portfolio-sync-warning")) {
        const notice = document.createElement("p");
        notice.id = "portfolio-sync-warning";
        notice.setAttribute("role", "status");
        notice.textContent = "Danh sách dự án trực tuyến hiện chưa cập nhật. Hình ảnh bên dưới chỉ mang tính minh họa.";
        grid.parentElement?.insertBefore(notice, grid);
      }
      return;
    }
    const data = await response.json();
    if (typeof window.ATELIER_SET_PROJECTS === "function") {
      window.ATELIER_SET_PROJECTS((Array.isArray(data) ? data : []).map(row => ({
        title: row.title, type: row.category,
        label: ({apartment:"Căn hộ", villa:"Biệt thự", house:"Nhà phố",
          commercial:"Thương mại"})[row.category] || "Dự án",
        area: row.area || "—", style: row.style || "Nội thất",
        img: row.image_url, desc: row.summary || ""
      })));
    }
  }

  // Capture before v1.0.0's bubble-phase demo submission handler.
  // This listener is always present for a configured LIVE site, even if project loading fails.
  newRequest.onclick=()=>{if(pending)return;complete=false;form?.removeAttribute("data-complete");newRequest.hidden=true;showFeedback("");if(captchaActive){captchaToken="";try{if(captchaWidget!==null)window.turnstile.reset(captchaWidget);}catch{captchaRetry.hidden=false;}}refreshSubmit();document.getElementById("full-name")?.focus();};
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!backendReady) {
      if (feedback) feedback.textContent = "Không thể gửi: kết nối chưa sẵn sàng. Dữ liệu chưa được lưu.";
      return;
    }
    if(pending||complete||Date.now()<cooldownUntil)return;
    if(!form.reportValidity())return;
    if (captchaActive && !captchaToken) {
      informCaptcha("Vui lòng hoàn tất xác minh chống bot trước khi gửi.");
      return;
    }
    const values = new FormData(form);
    if (String(values.get("website") || "").trim()) {
      if (feedback) feedback.textContent = "Yêu cầu không hợp lệ.";
      return;
    }
    const inquiry = {
      full_name: String(values.get("name") || "").trim(),
      phone: String(values.get("phone") || "").trim(),
      service: String(values.get("service") || ""),
      space: String(values.get("space") || "Khác"),
      details: String(values.get("details") || "").trim()
    };
    if (inquiry.full_name.length < 2 || inquiry.full_name.length > 100 ||
      !/^[0-9+(). -]{9,18}$/.test(inquiry.phone) ||
      inquiry.details.length > 1000 ||
      !["Thiết kế nội thất","Thi công trọn gói","Tư vấn & trang trí"].includes(inquiry.service)) {
      if (feedback) feedback.textContent = "Vui lòng kiểm tra lại thông tin.";
      return;
    }
    pending = true;
    const disabledBefore=controls().map(control=>[control,control.disabled]);
    for(const [control] of disabledBefore)control.disabled=true;
    form.setAttribute("aria-busy","true");refreshSubmit();
    showFeedback("Đang gửi yêu cầu. Vui lòng chờ xác nhận…");
    const controller=new AbortController();
    const requestTimeout=setTimeout(()=>controller.abort(),25000);
    try {
      const response = await fetch(cfg.supabaseUrl.replace(/\/$/,"") + "/functions/v1/submit-inquiry", {
        method: "POST",
        signal: controller.signal,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...inquiry, privacy_consent: document.getElementById("consent")?.checked === true, website: String(values.get("website") || ""), ...(captchaActive ? {turnstile_token: captchaToken} : {})}),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const raw=response.headers.get("Retry-After");
          const wait=raw&&/^[0-9]+$/.test(raw)?Number(raw)*1000:raw?Date.parse(raw)-Date.now():0;
          if(Number.isFinite(wait)&&wait>0&&wait<=86400000){
            cooldownUntil=Date.now()+wait;clearInterval(cooldownTimer);
            const tick=()=>{const seconds=Math.ceil((cooldownUntil-Date.now())/1000);if(seconds<=0){clearInterval(cooldownTimer);cooldownTimer=null;showFeedback("Bạn có thể thử lại sau khi hoàn tất xác minh mới.");refreshSubmit();}else showFeedback("Bạn đã gửi nhiều yêu cầu. Vui lòng chờ "+seconds+" giây. Nội dung vẫn được giữ lại.","error");};tick();cooldownTimer=setInterval(tick,1000);
          }else showFeedback("Bạn đã gửi nhiều yêu cầu. Nội dung vẫn được giữ lại. Vui lòng thử lại sau hoặc liên hệ qua email.","error");
          return;
        }
        if (response.status === 403) {
          informCaptcha("Xác minh chống bot không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.");
          showFeedback("Xác minh chống bot không hợp lệ hoặc đã hết hạn. Nội dung vẫn được giữ lại; hãy xác minh lại.","error");captchaRetry.hidden=false;
          return;
        }
        if(response.status===400||response.status===413||response.status===415){showFeedback("Thông tin chưa được chấp nhận. Hãy kiểm tra các trường và xác minh lại. Nội dung vẫn được giữ lại.","error");return;}
        throw new Error("gateway_http_" + response.status);
      }
      const receipt = await response.json();
      if (receipt?.ok !== true) throw new Error("invalid_gateway_receipt");
      form.reset();
      complete=true;form.dataset.complete="true";newRequest.hidden=false;captchaRetry.hidden=true;
      showFeedback("Yêu cầu đã được hệ thống ghi nhận. Chúng tôi sẽ liên hệ theo số điện thoại bạn cung cấp. Bạn không cần gửi lại cùng yêu cầu.","success");
    } catch (error) {
      console.error("Không thể ghi nhận yêu cầu:", error.code || "network_error");
      showFeedback("Gửi yêu cầu chưa thành công. Chưa nhận được xác nhận từ hệ thống; yêu cầu có thể đã được tiếp nhận. Vui lòng không gửi lặp ngay. Nội dung vẫn được giữ lại để bạn kiểm tra hoặc liên hệ qua email.","error");
    } finally {
      clearTimeout(requestTimeout);
      pending = false;
      for(const [control,disabled] of disabledBefore)control.disabled=disabled;
      form.setAttribute("aria-busy","false");
      if (captchaActive) {
        captchaToken = "";
        try { if (captchaWidget !== null) window.turnstile.reset(captchaWidget); } catch {}
      }
      refreshSubmit();focusFeedback();
    }
  }, true);

  const projectSection = document.getElementById("projects");
  if (projectSection && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        loadProjects().catch(error => {
          console.error("Không thể đồng bộ dự án:", error?.message || "network_error");
        });
      }
    }, { rootMargin: "900px 0px" });
    observer.observe(projectSection);
  } else {
    loadProjects().catch(error => {
      console.error("Không thể đồng bộ dự án:", error?.message || "network_error");
    });
  }
})();
