/* ATELIER HOME — live Supabase adapter for the public website.
   If no project is configured, the existing local demo remains functional. */
(() => {
  "use strict";
  const cfg = window.ATELIER_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) return;
  const feedback = document.getElementById("form-feedback");
  const form = document.getElementById("lead-form");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl) ||
      !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(cfg.supabasePublishableKey)) {
    if (feedback) feedback.textContent = "Cấu hình Supabase không hợp lệ. Website đang ở chế độ demo.";
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    if (feedback) feedback.textContent = "Không tải được thư viện kết nối dữ liệu. Website đang ở chế độ demo.";
    return;
  }
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  const modeDesc = document.getElementById("consult-mode-desc");
  const formFoot = form?.querySelector(".form-foot");
  if (modeDesc) modeDesc.textContent =
    "Chia sẻ nhu cầu của bạn. Khi gửi, thông tin sẽ được ghi nhận vào hệ thống để bộ phận tư vấn xử lý.";
  if (formFoot) formFoot.textContent =
    "Thông tin được lưu vào cơ sở dữ liệu. Không cung cấp mật khẩu hoặc dữ liệu nhạy cảm trong biểu mẫu.";
  const adminLink = document.getElementById("admin-live-link");
  if (adminLink) adminLink.hidden = false;
  const demoToggle = document.getElementById("admin-toggle");
  if (demoToggle) demoToggle.hidden = true;

  async function loadProjects() {
    const { data, error } = await client.from("projects")
      .select("title,category,area,style,image_url,summary")
      .eq("published", true).order("sort_order", { ascending: true });
    if (error) {
      console.error("Không tải được danh sách dự án:", error.code || "query_failed");
      return;
    }
    if (typeof window.ATELIER_SET_PROJECTS === "function") {
      window.ATELIER_SET_PROJECTS((data || []).map(row => ({
        title: row.title, type: row.category,
        label: ({ apartment:"Căn hộ", villa:"Biệt thự", house:"Nhà phố",
          commercial:"Thương mại" })[row.category] || "Dự án",
        area: row.area || "—", style: row.style || "Nội thất",
        img: row.image_url, desc: row.summary || ""
      })));
    }
  }

  // Runs in target capture phase before v1.0.0's demo-only submit handler.
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
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
        inquiry.details.length > 1000) {
      if (feedback) feedback.textContent = "Vui lòng kiểm tra lại thông tin.";
      return;
    }
    if (submit) submit.disabled = true;
    if (feedback) feedback.textContent = "Đang gửi yêu cầu...";
    try {
      const { error } = await client.from("inquiries").insert(inquiry);
      if (error) throw error;
      form.reset();
      if (feedback) feedback.textContent = "Yêu cầu đã được ghi nhận vào hệ thống. Chúng tôi sẽ liên hệ qua số điện thoại bạn cung cấp.";
    } catch (error) {
      console.error("Không lưu được yêu cầu:", error.code || "network_error");
      if (feedback) feedback.textContent = "Chưa thể gửi yêu cầu. Vui lòng thử lại sau.";
    } finally {
      if (submit) submit.disabled = false;
    }
  }, true);

  loadProjects();
})();
