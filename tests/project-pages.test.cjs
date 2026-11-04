const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildProjectPages } = require("../scripts/build-project-pages.cjs");
const site = require("../content/site.json");

function workspace(t) {
  const tempBase = fs.realpathSync(os.tmpdir());
  const rootDir = fs.mkdtempSync(path.join(tempBase, "atelier-project-test-"));
  t.after(() => {
    const resolved = path.resolve(rootDir);
    assert.equal(path.dirname(resolved), tempBase);
    assert.ok(path.basename(resolved).startsWith("atelier-project-test-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return rootDir;
}

function fixture() {
  const image = { src: "https://example.test/fixture.webp", alt: "Ảnh chỉ dùng kiểm thử", width: 1200, height: 800, credit: "Dữ liệu kiểm thử", rightsConfirmed: true };
  return { slug: "cong-trinh-kiem-thu", title: "Công trình kiểm thử", summary: "Nội dung giả lập để kiểm tra luồng dựng HTML trong thư mục tạm.", category: "house", area: "100 m²", style: "Kiểm thử", location: "Dữ liệu giả lập", published: true, realProjectConfirmed: true, cover: { ...image }, sections: [{ heading: "Giải pháp", paragraphs: ["Đoạn văn chỉ dùng cho kiểm thử."] }], gallery: [{ ...image, caption: "Ảnh kiểm thử" }], beforeAfter: { before: { ...image }, after: { ...image } } };
}

const read = (root, file) => fs.readFileSync(path.join(root, file), "utf8");
const build = (rootDir, projects, extra = {}) => buildProjectPages({ rootDir, site, data: { projects }, ...extra });

test("Published real projects produce static slug pages, crawlable listing, gallery, and canonical sitemap URLs", t => {
  const rootDir = workspace(t), project = fixture();
  const draft = { slug: "ban-nhap", published: false };
  const result = build(rootDir, [project, draft]);
  assert.equal(result.projects, 1);
  const index = read(rootDir, "du-an/index.html");
  assert.match(index, /href="\.\/cong-trinh-kiem-thu\/"/);
  assert.doesNotMatch(index, /noindex/);
  assert.ok(!fs.existsSync(path.join(rootDir, "du-an/ban-nhap/index.html")));
  const html = read(rootDir, "du-an/cong-trinh-kiem-thu/index.html");
  assert.match(html, /<h1>Công trình kiểm thử<\/h1>/);
  assert.ok(html.includes(project.sections[0].paragraphs[0]));
  assert.match(html, /<h2>Trước và sau<\/h2>/);
  assert.match(html, /width="1200" height="800" fetchpriority="high"/);
  const json = JSON.parse(html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json["@graph"][0].url, site.baseUrl + "du-an/cong-trinh-kiem-thu/");
  assert.match(read(rootDir, "sitemap.xml"), /<loc>https:\/\/infiniti-money.github.io\/Web-Design\/du-an\/cong-trinh-kiem-thu\/<\/loc>/);
});

test("Project text is escaped in HTML and structured data cannot close its script element", t => {
  const rootDir = workspace(t), project = fixture();
  project.title = 'Nhà <script>alert("x")</script> & ánh sáng';
  project.cover.alt = 'Ảnh " onerror="alert(1)';
  project.sections[0].paragraphs = ['</script><script>alert("x")</script>'];
  build(rootDir, [project]);
  const html = read(rootDir, "du-an/cong-trinh-kiem-thu/index.html");
  assert.doesNotMatch(html, /<script>alert|alt="Ảnh " onerror=/);
  assert.match(html, /Nhà &lt;script&gt;/);
  const schemas = [...html.matchAll(/application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(schemas.length, 1);
  assert.equal(JSON.parse(schemas[0][1])["@graph"][0].name, project.title);
});

test("Unverified projects, unsafe slugs, and images without rights or valid sources fail before file writes", t => {
  const rootDir = workspace(t);
  const cases = [
    p => { p.realProjectConfirmed = false; },
    p => { p.slug = "../outside"; },
    p => { p.cover.rightsConfirmed = false; },
    p => { p.cover.src = "javascript:alert(1)"; },
    p => { p.gallery[0].rightsConfirmed = false; },
    p => { p.beforeAfter.after.rightsConfirmed = false; },
    p => { p.cover.src = "assets/projects/missing.webp"; },
    p => { p.cover.width = 0; },
  ];
  for (const mutate of cases) {
    const project = fixture(); mutate(project);
    assert.throws(() => build(rootDir, [project]));
    assert.ok(!fs.existsSync(path.join(rootDir, "du-an")));
  }
  assert.throws(() => build(rootDir, [fixture(), fixture()]), /Trùng slug/);
});

test("Unpublishing removes only managed pages and removes project URLs from the sitemap", t => {
  const rootDir = workspace(t), project = fixture();
  build(rootDir, [project]);
  fs.writeFileSync(path.join(rootDir, "du-an/ghi-chu.txt"), "giữ lại");
  build(rootDir, [{ ...project, published: false }]);
  assert.ok(!fs.existsSync(path.join(rootDir, "du-an/cong-trinh-kiem-thu/index.html")));
  assert.equal(read(rootDir, "du-an/ghi-chu.txt"), "giữ lại");
  assert.match(read(rootDir, "du-an/index.html"), /name="robots" content="noindex,follow"/);
  assert.doesNotMatch(read(rootDir, "sitemap.xml"), /<loc>[^<]*du-an\//);
});

test("Generator refuses to overwrite manual content or follow a tampered output manifest", t => {
  const rootDir = workspace(t), project = fixture();
  build(rootDir, [project]);
  const detail = "du-an/cong-trinh-kiem-thu/index.html";
  fs.writeFileSync(path.join(rootDir, detail), "Nội dung viết tay");
  assert.throws(() => build(rootDir, [project]), /chưa được quản lý/);
  assert.equal(read(rootDir, detail), "Nội dung viết tay");
  fs.writeFileSync(path.join(rootDir, "unrelated.html"), "không được sửa");
  fs.writeFileSync(path.join(rootDir, "du-an/_generated.json"), JSON.stringify(["../unrelated.html"]));
  assert.throws(() => build(rootDir, []), /Đường dẫn sinh không hợp lệ/);
  assert.equal(read(rootDir, "unrelated.html"), "không được sửa");
});

test("CI check detects stale output without changing files and rejects off-domain sitemap routes", t => {
  const rootDir = workspace(t);
  build(rootDir, []);
  assert.doesNotThrow(() => build(rootDir, [], { check: true }));
  const stale = read(rootDir, "du-an/index.html") + "\n<!-- drift -->";
  fs.writeFileSync(path.join(rootDir, "du-an/index.html"), stale);
  assert.throws(() => build(rootDir, [], { check: true }), /cần được tạo lại/);
  assert.equal(read(rootDir, "du-an/index.html"), stale);
  assert.throws(() => build(rootDir, [], { site: { ...site, publicPages: [{ path: "https://example.test/" }] } }), /domain\/path/);
});
