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
  const sdkReady = !!window.supabase?.createClient;
  let client = null;

  if (configIsValid && sdkReady) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  } else {
    const text = configIsValid
      ? "Kết nối tạm gián đoạn. Không thể gửi yêu cầu lúc này. Vui lòng tải lại trang sau."
      : "Hệ thống chưa được cấu hình đúng. Chưa thể tiếp nhận yêu cầu.";
    if (feedback) feedback.textContent = text;
    if (submit) submit.disabled = true;
    console.error("Supabase consultation form is unavailable:", configIsValid ? "sdk_unavailable" : "invalid_config");
  }

  async function loadProjects() {
    if (!client) return;
    const { data, error } = await client.from("projects")
      .select("title,category,area,style,image_url,summary")
      .eq("published", true).order("sort_order", { ascending: true });
    if (error) {
      console.error("Không tải được dự án trực tuyến:", error.code || "query_failed");
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
    if (typeof window.ATELIER_SET_PROJECTS === "function") {
      window.ATELIER_SET_PROJECTS((data || []).map(row => ({
        title: row.title, type: row.category,
        label: ({apartment:"Căn hộ", villa:"Biệt thự", house:"Nhà phố",
          commercial:"Thương mại"})[row.category] || "Dự án",
        area: row.area || "—", style: row.style || "Nội thất",
        img: row.image_url, desc: row.summary || ""
      })));
    }
  }

  // Capture before v1.0.0's bubble-phase demo submission handler.
  // This listener is always present for a configured LIVE site, even if SDK fails.
  let pending = false;
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!client) {
      if (feedback) feedback.textContent = "Không thể gửi: kết nối chưa sẵn sàng. Dữ liệu chưa được lưu.";
      return;
    }
    if (pending || !form.reportValidity()) return;
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
    if (submit) submit.disabled = true;
    if (feedback) feedback.textContent = "Đang gửi yêu cầu...";
    try {
      const response = await fetch(cfg.supabaseUrl.replace(/\/$/,"") + "/functions/v1/submit-inquiry", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...inquiry, website: String(values.get("website") || "")}),
      });
      if (!response.ok) {
        if (response.status === 429) {
          if (feedback) feedback.textContent =
            "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.";
          return;
        }
        throw new Error("gateway_http_" + response.status);
      }
      const receipt = await response.json();
      if (receipt?.ok !== true) throw new Error("invalid_gateway_receipt");
      form.reset();
      if (feedback) feedback.textContent =
        "Yêu cầu đã được hệ thống ghi nhận. Chúng tôi sẽ liên hệ theo số điện thoại bạn cung cấp.";
    } catch (error) {
      console.error("Không thể ghi nhận yêu cầu:", error.code || "network_error");
      if (feedback) feedback.textContent =
        "Gửi yêu cầu chưa thành công. Dữ liệu chưa được lưu. Vui lòng thử lại sau.";
    } finally {
      pending = false;
      if (submit) submit.disabled = false;
    }
  }, true);

  loadProjects().catch(error => {
    console.error("Không thể đồng bộ dự án:", error?.message || "network_error");
  });
})();
