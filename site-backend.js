/* ATELIER HOME — Public Supabase frontend.
 * In LIVE mode the consultation form FAILS CLOSED if Supabase cannot load.
 * Local demo submissions are only permitted when the project is unconfigured.
 */
(() => {
  "use strict";
  const cfg = window.ATELIER_CONFIG || {};
  if (!cfg.supabaseUrl && !cfg.supabasePublishableKey) return;

  const form = document.getElementById("lead-form");
  const feedback = document.getElementById("form-feedback");
  const modeDesc = document.getElementById("consult-mode-desc");
  const formFoot = form?.querySelector(".form-foot");
  const submit = form?.querySelector('[type="submit"]');

  // Always suppress the old localStorage demo handler when production is configured.
  const demoToggle = document.getElementById("admin-toggle");
  const demoArea = document.getElementById("admin-area");
  const adminLink = document.getElementById("admin-live-link");
  if (demoToggle) demoToggle.hidden = true;
  if (demoArea) demoArea.classList.remove("open");
  if (adminLink) adminLink.hidden = false;
  if (modeDesc) modeDesc.textContent =
    "Chia sẻ nhu cầu của bạn. Thông tin chỉ được gửi khi cơ sở dữ liệu xác nhận đã tiếp nhận.";
  if (formFoot) formFoot.textContent =
    "Thông tin gửi vào hệ thống để liên hệ tư vấn. Không nhập mật khẩu hoặc dữ liệu nhạy cảm.";

  const configIsValid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl || "") &&
    /^sb_publishable_[a-zA-Z0-9_-]+$/.test(cfg.supabasePublishableKey || "");
  const backendReady = configIsValid;
  const REQUEST_TIMEOUT_MS = 15000;
  const showFeedback = (message, kind = "info") => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.state = kind;
  };

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
  const informCaptcha = (message) => showFeedback(message);
  if (captchaActive && backendReady) {
    if (submit) submit.disabled = true;
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(captchaSiteKey) || !captchaHost) {
      informCaptcha("Cấu hình xác minh chống bot chưa hợp lệ. Chưa thể gửi yêu cầu.");
    } else {
      const loadCaptcha = () => {
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
                if (submit && backendReady && !pending) submit.disabled = false;
                informCaptcha("");
              },
              "expired-callback": () => {
                captchaToken = "";
                if (submit) submit.disabled = true;
                informCaptcha("Xác minh đã hết hạn. Vui lòng xác minh lại.");
              },
              "error-callback": () => {
                captchaToken = "";
                if (submit) submit.disabled = true;
                informCaptcha("Không xác minh được. Vui lòng tải lại trang.");
              }
            });
          } catch {
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
  let pending = false;
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!backendReady) {
      if (feedback) feedback.textContent = "Không thể gửi: kết nối chưa sẵn sàng. Dữ liệu chưa được lưu.";
      return;
    }
    if (pending || !form.reportValidity()) return;
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
    form.setAttribute("aria-busy", "true");
    if (submit) submit.disabled = true;
    showFeedback("Đang gửi yêu cầu...", "info");
    const requestController = new AbortController();
    const timeout = setTimeout(() => requestController.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(cfg.supabaseUrl.replace(/\/$/,"") + "/functions/v1/submit-inquiry", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        signal: requestController.signal,
        body: JSON.stringify({...inquiry, privacy_consent: document.getElementById("consent")?.checked === true, website: String(values.get("website") || ""), ...(captchaActive ? {turnstile_token: captchaToken} : {})}),
      });
      if (!response.ok) {
        if (response.status === 429) {
          showFeedback("Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.", "warning");
          return;
        }
        if (response.status === 403) {
          informCaptcha("Xác minh chống bot không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.");
          return;
        }
        throw new Error("gateway_http_" + response.status);
      }
      const receipt = await response.json();
      if (receipt?.ok !== true) throw new Error("invalid_gateway_receipt");
      form.reset();
      showFeedback("Yêu cầu đã được hệ thống ghi nhận. Chúng tôi sẽ liên hệ theo số điện thoại bạn cung cấp.", "success");
    } catch (error) {
      console.error("Không thể xác nhận tiếp nhận yêu cầu:", error?.name === "AbortError" ? "request_timeout" : error?.code || "network_error");
      showFeedback(error?.name === "AbortError"
        ? "Yêu cầu chưa có phản hồi sau 15 giây. Chưa thể xác nhận hệ thống đã nhận hay chưa. Nội dung vẫn được giữ trên biểu mẫu; vui lòng liên hệ email để kiểm tra trước khi gửi lại."
        : "Gửi yêu cầu chưa thành công. Chưa thể xác nhận hệ thống đã nhận hay chưa. Nội dung vẫn được giữ trên biểu mẫu; vui lòng kiểm tra trước khi gửi lại để tránh trùng.", "warning");
    } finally {
      clearTimeout(timeout);
      pending = false;
      form.setAttribute("aria-busy", "false");
      if (captchaActive) {
        captchaToken = "";
        try { if (captchaWidget !== null) window.turnstile.reset(captchaWidget); } catch {}
      }
      if (submit) submit.disabled = captchaActive || !backendReady;
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
