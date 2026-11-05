const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const base = "https://infiniti-money.github.io/Web-Design";
const pages = [
  { file: "index.html", url: `${base}/`, schemaType: ["WebSite", "WebPage"] },
  { file: "dich-vu/index.html", url: `${base}/dich-vu/`, schemaType: ["CollectionPage"], favicon: "../assets/favicon.svg" },
  { file: "dich-vu/thiet-ke-noi-that.html", url: `${base}/dich-vu/thiet-ke-noi-that.html`, schemaType: ["WebPage"], favicon: "../assets/favicon.svg" },
  { file: "dich-vu/thi-cong-noi-that.html", url: `${base}/dich-vu/thi-cong-noi-that.html`, schemaType: ["WebPage"], favicon: "../assets/favicon.svg" },
  { file: "dich-vu/tu-van-trang-tri.html", url: `${base}/dich-vu/tu-van-trang-tri.html`, schemaType: ["WebPage"], favicon: "../assets/favicon.svg" },
  { file: "catalog.html", url: `${base}/catalog.html`, schemaType: ["CollectionPage"] },
  { file: "privacy.html", url: `${base}/privacy.html`, schemaType: ["WebPage"] },
];

const read = file => fs.readFileSync(file, "utf8");

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function metaValue(html, key, value) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attr(tag[0], key) === value) return attr(tag[0], "content");
  }
  return null;
}

function schemaTypes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaTypes);
  if (!value || typeof value !== "object") return [];
  return [value["@type"], ...Object.values(value).flatMap(schemaTypes)].filter(Boolean);
}

const generatedFiles = JSON.parse(read("du-an/_generated.json"));
for (const file of generatedFiles) {
  if ((metaValue(read(file), "name", "robots") || "").includes("noindex")) continue;
  pages.push({ file, url: `${base}/${file.replace(/index\.html$/, "")}`, schemaType: [file === "du-an/index.html" ? "CollectionPage" : "WebPage"], favicon: "../".repeat(file.split("/").length - 1) + "assets/favicon.svg", customSocialImage: file !== "du-an/index.html" });
}

test("Indexable public pages have canonical URLs, social metadata, and valid JSON-LD", () => {
  const titles = new Set();
  for (const page of pages) {
    const html = read(page.file);
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const description = metaValue(html, "name", "description");
    assert.ok(title, `${page.file} must have a title`);
    assert.ok(description && description.length >= 40, `${page.file} must have a useful description`);
    assert.ok(!titles.has(title), `duplicate title: ${title}`);
    titles.add(title);

    assert.equal(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0] &&
      attr(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)[0], "href"), page.url);
    assert.equal(metaValue(html, "property", "og:url"), page.url);
    assert.ok(metaValue(html, "property", "og:title"), `${page.file} must have og:title`);
    assert.ok(metaValue(html, "property", "og:description"), `${page.file} must have og:description`);
    const socialImage = metaValue(html, "property", "og:image");
    assert.ok(socialImage && new URL(socialImage).protocol === "https:");
    if (!page.customSocialImage) assert.equal(socialImage, `${base}/assets/og-card.png`);
    assert.equal(metaValue(html, "name", "twitter:card"), "summary_large_image");
    const faviconTag = [...html.matchAll(/<link\b[^>]*>/gi)].find(match => attr(match[0], "rel") === "icon");
    assert.equal(faviconTag && attr(faviconTag[0], "href"), page.favicon || "./assets/favicon.svg");
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${page.file} must have one H1`);

    const jsonLd = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(jsonLd.length, `${page.file} must have JSON-LD`);
    const parsed = jsonLd.map(match => JSON.parse(match[1]));
    const types = schemaTypes(parsed);
    for (const requiredType of page.schemaType) {
      assert.ok(types.includes(requiredType), `${page.file} must include schema type ${requiredType}`);
    }
  }
});

test("robots.txt and sitemap expose only canonical public routes", () => {
  const robots = read("robots.txt");
  assert.match(robots, /^User-agent: \*/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/sitemap\\.xml$`, "m"));

  const sitemap = read("sitemap.xml");
  assert.match(sitemap, /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations, pages.map(page => page.url));
  for (const file of ["admin.html", "admin-catalog.html", "commercial.html", "register.html", "reset-password.html", "set-password.html", "notifications.html", "reports-advanced.html", "complete-profile.html"]) {
    assert.ok(!locations.some(url => url.endsWith(`/${file}`)), `${file} must stay out of the sitemap`);
  }
});

test("Authentication and administration pages request no indexing", () => {
  const privatePages = ["admin.html", "admin-catalog.html", "commercial.html", "register.html", "reset-password.html", "set-password.html", "notifications.html", "reports-advanced.html", "complete-profile.html"];
  for (const file of privatePages) {
    const html = read(file);
    assert.match(html, /<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']/i, `${file} must be noindex`);
  }
});

test("Internal links in SEO pages resolve to local files and anchors", () => {
  const htmlFiles = [...new Set([...fs.readdirSync(".").filter(file => file.endsWith(".html")), ...pages.map(page => page.file), ...generatedFiles])];
  for (const file of htmlFiles) {
    const html = read(file);
    for (const [, reference] of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) continue;
      const resolved = new URL(reference, `https://audit.invalid/${file}`);
      let relative = decodeURIComponent(resolved.pathname).replace(/^\//, "");
      if (!relative || relative.endsWith("/")) relative += "index.html";
      assert.ok(fs.existsSync(path.resolve(relative)), `${file} references missing file: ${reference}`);
      if (resolved.hash) {
        const target = read(relative);
        const id = decodeURIComponent(resolved.hash.slice(1));
        assert.match(target, new RegExp(`(?:\\bid|\\bname)=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`), `${file} references missing anchor: ${reference}`);
      }
    }
  }
});

test("Favicon and Open Graph image assets are present and correctly sized", () => {
  assert.match(read("assets/favicon.svg"), /<svg\b/);
  const png = fs.readFileSync("assets/og-card.png");
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test("Hero and project images use priority and lazy-loading appropriately", () => {
  const html = read("index.html");
  assert.match(html, /class="hero-photo"[^>]*srcset=/);
  assert.match(html, /class="hero-photo"[^>]*fetchpriority="high"/);
  assert.match(html, /id="turnstile-container"[^>]*role="group"/);
  assert.match(html, /img\.loading="lazy";img\.decoding="async"/);
  assert.match(html, /url\.hostname!=="images\.unsplash\.com"/);
  assert.match(html, /url\.searchParams\.set\("q","70"\)/);
});

test("Turnstile script waits until visitors approach or interact with the form", () => {
  const backend = read("site-backend.js");
  assert.match(backend, /const loadCaptcha = \(\) =>/);
  assert.match(backend, /new IntersectionObserver/);
  assert.match(backend, /form\?\.addEventListener\("focusin", loadCaptcha\)/);
  assert.match(backend, /form\?\.addEventListener\("pointerdown", loadCaptcha\)/);
  assert.ok(backend.indexOf("document.head.appendChild(script)") > backend.indexOf("const loadCaptcha = () =>"));
});

test("Public Supabase project reads use the lightweight REST API and wait until the portfolio nears view", () => {
  const html = read("index.html");
  const backend = read("site-backend.js");
  assert.doesNotMatch(html, /@supabase\/supabase-js/);
  assert.match(backend, /\/rest\/v1\/projects/);
  assert.match(backend, /headers:\s*\{\s*apikey:\s*cfg\.supabasePublishableKey\s*\}/);
  assert.match(backend, /new IntersectionObserver/);
  assert.match(backend, /observer\.observe\(projectSection\)/);
});

test("Service pages have stable routes and consultation CTAs preselect the matching service", () => {
  const routes = [
    ["dich-vu/thiet-ke-noi-that.html", "design", "Thiết kế nội thất"],
    ["dich-vu/thi-cong-noi-that.html", "build", "Thi công trọn gói"],
    ["dich-vu/tu-van-trang-tri.html", "styling", "Tư vấn & trang trí"],
  ];
  for (const [file, key, label] of routes) {
    const html = read(file);
    assert.match(html, new RegExp(`\\?service=${key}#contact`));
    assert.match(html, /<main\b/);
    assert.match(html, /<nav\b[^>]*aria-label=["']Breadcrumb["']/);
    assert.ok(html.includes(label), `${file} should name its service`);
  }
  assert.match(read("index.html"), /requestedService=.*URLSearchParams\(location\.search\)/);
});
