/* Browser-level smoke tests against deployed GitHub Pages.
 * Read-only test: never submits personal data or changes project content.
 * Run with: npm install --no-save playwright@1.56.1 && npx playwright install chromium
 *           node tests/browser-smoke.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium, devices } = require("playwright");

const origin = (process.env.SITE_URL || "https://infiniti-money.github.io/Web-Design/").replace(/\/+$/, "/");
const out = process.env.SCREENSHOT_DIR || "screenshots";
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const consoleErrors = [];
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
    desktop.on("pageerror", error => consoleErrors.push("home: " + error.message));
    const projectsResponse = desktop.waitForResponse(
      r => r.url().includes("/rest/v1/projects?") && r.request().method() === "GET",
      { timeout: 45000 }
    );
    const response = await desktop.goto(origin, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(response?.status(), 200, "GitHub Pages must return HTTP 200 for homepage");
    const api = await projectsResponse;
    assert.equal(api.status(), 200, "Live project query must return HTTP 200");
    await desktop.locator("#project-grid article.project").first().waitFor({ timeout: 15000 });
    const projects = await desktop.locator("#project-grid article.project").count();
    assert.equal(projects, 6, "Expected six published sample projects");
    assert.equal(await desktop.locator("#admin-live-link").isVisible(), true, "Admin link should show in live mode");
    assert.equal(await desktop.locator("#admin-toggle").isVisible(), false, "Publicly accessible demo lead panel must be hidden in live mode");
    assert.equal(await desktop.locator("#lead-form").count(), 1);
    await desktop.screenshot({ path: out + "/atelier-desktop.png", fullPage: true });
    console.log("HOME: HTTP", response.status(), "| Supabase API", api.status(), "| projects", projects);

    // Verify category filter and keyboard modal interactions.
    const apartment = desktop.locator('.filter[data-filter="apartment"]');
    await apartment.click();
    const filtered = await desktop.locator("#project-grid article.project").count();
    assert.ok(filtered >= 1 && filtered < projects, "Apartment filter should narrow the results");
    await desktop.locator("#project-grid article.project").first().press("Enter");
    assert.equal(await desktop.locator("#project-modal").getAttribute("aria-hidden"), "false");
    await desktop.keyboard.press("Escape");
    assert.equal(await desktop.locator("#project-modal").getAttribute("aria-hidden"), "true");
    console.log("INTERACTION: category filter and modal keyboard controls passed");

    // Exercise the real consultation form without storing synthetic customer PII.
    const intercepted = [];
    await desktop.route("**/functions/v1/submit-inquiry", async route => {
      const payload = route.request().postDataJSON();
      intercepted.push(payload);
      assert.equal(route.request().method(), "POST");
      await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({ok:true})});
    });
    await desktop.locator("#full-name").fill("Người kiểm thử");
    await desktop.locator("#phone").fill("0900000000");
    await desktop.locator("#service").selectOption({label:"Thiết kế nội thất"});
    await desktop.locator("#consent").check();
    await desktop.locator("#lead-form [type=submit]").click();
    await desktop.locator("#form-feedback").getByText("Yêu cầu đã được hệ thống ghi nhận").waitFor();
    assert.equal(intercepted.length,1,"Form must use Edge Function exactly once");
    assert.equal(intercepted[0].full_name,"Người kiểm thử");
    console.log("CONSULTATION: Edge Function request sent; mocked success without writing customer data");

    const admin = await browser.newPage({ viewport: { width: 1280, height: 850 }, locale: "vi-VN" });
    admin.on("pageerror", error => consoleErrors.push("admin: " + error.message));
    const ar = await admin.goto(new URL("admin.html", origin).toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(ar?.status(), 200, "Admin page must be reachable");
    await admin.locator("#login-panel:not(.hide)").waitFor({ timeout: 25000 });
    assert.equal(await admin.locator("#setup-panel").isVisible(), false, "Admin should have valid Supabase configuration");
    await admin.screenshot({ path: out + "/atelier-admin-login.png", fullPage: true });
    console.log("ADMIN: HTTP", ar.status(), "| login form visible; no credentials submitted");

    const mobile = await browser.newPage({ ...devices["iPhone 13"], locale: "vi-VN" });
    mobile.on("pageerror", error => consoleErrors.push("mobile: " + error.message));
    const mr = await mobile.goto(origin, { waitUntil: "domcontentloaded", timeout: 45000 });
    assert.equal(mr?.status(), 200, "Mobile homepage must load");
    await mobile.locator("#project-grid article.project").first().waitFor({ timeout: 15000 });
    await mobile.screenshot({ path: out + "/atelier-mobile.png", fullPage: true });
    const overflow = await mobile.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 3
    );
    assert.equal(overflow, false, "Homepage should not overflow horizontally at mobile width");
    console.log("MOBILE: loaded; no horizontal overflow");

    // If the CDN fails on a LIVE site, never silently save a local demo lead.
    const disconnected = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await disconnected.route("**/cdn.jsdelivr.net/npm/@supabase/**", route => route.abort());
    await disconnected.goto(origin, { waitUntil: "domcontentloaded", timeout: 45000 });
    await disconnected.locator("#form-feedback").getByText("Kết nối tạm gián đoạn").waitFor({ timeout: 15000 });
    assert.equal(await disconnected.locator("#lead-form [type=submit]").isDisabled(), true,
      "Production form must be disabled if Supabase SDK fails");
    assert.equal(await disconnected.locator("#admin-toggle").isVisible(), false,
      "Demo leads panel must stay hidden in configured production");
    console.log("OUTAGE: consultation submission safely disabled (no silent demo fallback)");

    assert.deepEqual(consoleErrors, [], "Browser JavaScript exceptions: " + consoleErrors.join("; "));
    console.log("Browser smoke tests passed.");
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
