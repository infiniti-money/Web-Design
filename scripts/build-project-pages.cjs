"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {publicHeader,fontLinks}=require('./public-shell.cjs');
const marker = "<!-- ATELIER GENERATED PROJECT PAGE -->";
const categoryLabels = { apartment: "Căn hộ", villa: "Biệt thự", house: "Nhà phố", commercial: "Thương mại" };
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const jsonLd = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));

function requiredText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label}: cần nội dung.`);
  return value.trim();
}

function validateImage(image, label, rootDir) {
  if (!image || image.rightsConfirmed !== true) throw new Error(`${label}: chưa xác nhận quyền sử dụng ảnh.`);
  requiredText(image.alt, `${label}.alt`);
  requiredText(image.credit, `${label}.credit`);
  const src = requiredText(image.src, `${label}.src`);
  if (/^https:\/\//i.test(src)) {
    const url = new URL(src);
    if (url.username || url.password || /[\s<>"']/.test(src)) throw new Error(`${label}: URL ảnh không hợp lệ.`);
  } else {
    if (!/^assets\/projects\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:avif|webp|jpe?g|png)$/i.test(src) || src.includes("..")) {
      throw new Error(`${label}: ảnh local phải nằm trong assets/projects/.`);
    }
    const assetPath = path.resolve(rootDir, src);
    if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) throw new Error(`${label}: chưa có file ảnh ${src}.`);
  }
  if (![image.width, image.height].every(value => Number.isInteger(value) && value > 0 && value <= 20000)) {
    throw new Error(`${label}: cần kích thước ảnh hợp lệ.`);
  }
}

function validateProjects(data, rootDir) {
  if (!data || !Array.isArray(data.projects)) throw new Error("projects.json cần mảng projects.");
  const slugs = new Set();
  for (const project of data.projects) {
    if (!project || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug || "") || project.slug.length > 100) {
      throw new Error("Slug dự án chỉ dùng chữ thường, số và dấu gạch ngang.");
    }
    if (slugs.has(project.slug)) throw new Error(`Trùng slug: ${project.slug}.`);
    slugs.add(project.slug);
    if (typeof project.published !== "boolean") throw new Error(`${project.slug}: published phải là boolean.`);
    if (!project.published) continue;
    if (project.realProjectConfirmed !== true) throw new Error(`${project.slug}: chưa xác nhận đây là công trình thật.`);
    requiredText(project.title, `${project.slug}.title`);
    requiredText(project.summary, `${project.slug}.summary`);
    if (!Object.hasOwn(categoryLabels, project.category)) throw new Error(`${project.slug}: category không hợp lệ.`);
    validateImage(project.cover, `${project.slug}.cover`, rootDir);
    if(project.featured!==undefined&&typeof project.featured!=="boolean")throw new Error("featured phải là boolean");
    if(project.budget!==undefined&&(project.budgetPublicConfirmed!==true||typeof project.budget!=="string"||!project.budget.trim()||project.budget.length>120))throw new Error("Chi phí cần nội dung và xác nhận được phép công khai");
    if(project.materials!==undefined&&(!Array.isArray(project.materials)||project.materials.length>12||project.materials.some(s=>typeof s!=="string"||!s.trim()||s.length>140)))throw new Error("Vật liệu phải là danh sách tên đã xác minh");
    if(project.journal!==undefined&&(!Array.isArray(project.journal)||project.journal.length>20))throw new Error("Nhật ký tối đa 20 mốc");
    for(const entry of project.journal||[]){requiredText(entry?.heading,"journal.heading");requiredText(entry.description,"journal.description");if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)||!Number.isFinite(Date.parse(entry.date)))throw new Error("Ngày nhật ký không hợp lệ");if(entry.image)validateImage(entry.image,"journal.image",rootDir);}
    if (!Array.isArray(project.sections) || !project.sections.length) throw new Error(`${project.slug}: thiếu bài viết công trình.`);
    for (const section of project.sections) {
      requiredText(section?.heading, `${project.slug}.heading`);
      if (!Array.isArray(section.paragraphs) || !section.paragraphs.length) throw new Error(`${project.slug}: thiếu nội dung đoạn.`);
      for (const paragraph of section.paragraphs) requiredText(paragraph, `${project.slug}.paragraph`);
    }
    if (project.gallery !== undefined && !Array.isArray(project.gallery)) throw new Error(`${project.slug}: gallery phải là mảng.`);
    for (const image of project.gallery || []) validateImage(image, `${project.slug}.gallery`, rootDir);
    if (project.beforeAfter) {
      if(project.beforeAfter.type!==undefined&&!["before-after","design-real"].includes(project.beforeAfter.type))throw new Error("Loại ảnh đối chiếu không hợp lệ");
      if(project.beforeAfter.sameViewConfirmed!==undefined&&typeof project.beforeAfter.sameViewConfirmed!=="boolean")throw new Error("sameViewConfirmed phải là boolean");
      validateImage(project.beforeAfter.before, `${project.slug}.before`, rootDir);
      validateImage(project.beforeAfter.after, `${project.slug}.after`, rootDir);
    }
  }
  return data.projects.filter(project => project.published);
}

const imageSrc = (src, prefix) => /^https:\/\//i.test(src) ? src : prefix + src;
const absoluteImage = (src, baseUrl) => new URL(src, baseUrl).href;
function renderImage(image, prefix, priority = false) {
  return `<img src="${escapeHtml(imageSrc(image.src, prefix))}" alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}" ${priority ? 'fetchpriority="high" class="project-cover"' : 'loading="lazy"'} decoding="async">`;
}

function navigation(prefix) {
  return `<a href="${prefix}index.html#about">Về chúng tôi</a><a href="${prefix}du-an/">Dự án</a><a href="${prefix}dich-vu/">Dịch vụ</a><a href="${prefix}catalog.html">Catalog</a><a href="${prefix}index.html#contact">Liên hệ</a>`;
}

function renderPage({ site, title, description, route, prefix, image, schema, noindex = false, content, generatedMarker = marker }) {
  const url = new URL(route, site.baseUrl).href;
  const socialImage = image ? absoluteImage(image.src, site.baseUrl) : new URL("assets/og-card.png", site.baseUrl).href;
  return `${generatedMarker}
<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1e2c27">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">${noindex ? '\n<meta name="robots" content="noindex,follow">' : ""}
<link rel="canonical" href="${url}"><link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<meta property="og:site_name" content="${escapeHtml(site.name)}"><meta property="og:locale" content="vi_VN"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${escapeHtml(socialImage)}"><meta property="og:image:alt" content="${escapeHtml(image?.alt || site.name)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(socialImage)}">
<script type="application/ld+json">${jsonLd({ "@context": "https://schema.org", "@graph": schema })}</script>
<link rel="stylesheet" href="${prefix}assets/service-pages.css"><link rel="stylesheet" href="${prefix}assets/project-pages.css">
${fontLinks(prefix)}</head><body class="public-page"><a class="skip" href="#main">Bỏ qua điều hướng</a>
${publicHeader(prefix,{active:route.startsWith("catalog")?"catalog":"projects"})}
${content}
<footer class="footer"><div class="wrap footer-inner"><p><strong>${escapeHtml(site.name)}</strong><br>Thiết kế nội thất · Thi công · Tư vấn trang trí</p><nav class="footer-links" aria-label="Liên kết cuối trang"><a href="${prefix}index.html">Trang chủ</a><a href="${prefix}dich-vu/">Dịch vụ</a><a href="${prefix}privacy.html">Quyền riêng tư</a></nav></div></footer></body></html>
`;
}

function renderIndex(site, projects) {
  const url = new URL("du-an/", site.baseUrl).href;
  const cards = projects.map(project => `<article class="project-card"><a href="./${project.slug}/">${renderImage(project.cover, "../")}<div class="card"><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.summary)}</p><span class="text-link">Xem công trình ↗</span></div></a></article>`).join("\n");
  return renderPage({ site, title: `Công trình nội thất | ${site.name}`, description: "Hồ sơ công trình nội thất của ATELIER HOME: nhu cầu, giải pháp thiết kế, vật liệu và hình ảnh hoàn thiện.", route: "du-an/", prefix: "../", noindex: !projects.length,
    schema: [{ "@type": "CollectionPage", url, name: `Công trình nội thất | ${site.name}`, inLanguage: "vi-VN", mainEntity: { "@type": "ItemList", itemListElement: projects.map((project, index) => ({ "@type": "ListItem", position: index + 1, url: new URL(`du-an/${project.slug}/`, site.baseUrl).href, name: project.title })) } }],
    content: `<nav class="breadcrumb wrap" aria-label="Breadcrumb"><ol><li><a href="../index.html">Trang chủ</a></li><li aria-current="page">Công trình</li></ol></nav><main id="main"><section class="hero"><div class="wrap hero-copy"><p class="eyebrow">ATELIER HOME · CÔNG TRÌNH</p><h1>Không gian và câu chuyện thiết kế</h1><p>Tìm hiểu nhu cầu, giải pháp và hình ảnh của từng công trình.</p></div></section><section class="section"><div class="wrap">${projects.length ? `<div class="cards">${cards}</div>` : '<div class="project-empty"><h2>Hồ sơ công trình đang được cập nhật</h2><p>Bạn có thể tìm hiểu dịch vụ hoặc chia sẻ nhu cầu không gian để được tư vấn.</p><a class="button" href="../dich-vu/">Khám phá dịch vụ ↗</a></div>'}</div></section></main>` });
}

function renderProject(site, project) {
  const url = new URL(`du-an/${project.slug}/`, site.baseUrl).href;
  const facts = [["Loại không gian", categoryLabels[project.category]], ["Diện tích", project.area], ["Phong cách", project.style], ["Khu vực", project.location], ["Chi phí công khai",project.budget], ["Vật liệu chủ đạo",project.materials?.join(", ")]].filter(([, value]) => value);
  const gallery = (project.gallery || []).map(image => `<figure><a href="${escapeHtml(imageSrc(image.src, "../../"))}">${renderImage(image, "../../")}</a><figcaption>${escapeHtml(image.caption || image.alt)} · ${escapeHtml(image.credit)}</figcaption></figure>`).join("\n");
  const pair=project.beforeAfter,labels=pair?.type==='design-real'?['Thiết kế 3D','Thực tế bàn giao']:['Trước','Sau'];
  const comparison=pair?`<section class="section soft"><div class="wrap"><h2>${pair.type==='design-real'?'Thiết kế và thực tế':'Trước và sau'}</h2><p>Đối chiếu hình ảnh trong hồ sơ; phạm vi thực hiện cần xem cùng tài liệu dự án.</p><div class="project-gallery" ${pair.sameViewConfirmed===true?'data-comparison data-labels="'+escapeHtml(JSON.stringify(labels))+'" data-ratio="'+pair.before.width+'/'+pair.before.height+'"':''}>${[[labels[0],pair.before],[labels[1],pair.after]].map(([label,image])=>'<figure>'+renderImage(image,'../../')+'<figcaption><strong>'+label+'</strong> · '+escapeHtml(image.alt)+' · '+escapeHtml(image.credit)+'</figcaption></figure>').join('')}</div>${pair.sameViewConfirmed===true?'<div data-comparison-controls hidden><label for="project-comparison-range">Kéo để đối chiếu '+labels.join(' / ')+'</label><input id="project-comparison-range" type="range" min="0" max="100" value="50" step="1"><p class="project-credit">Dùng phím mũi tên để điều chỉnh. Hai ảnh đã được xác nhận cùng góc tham chiếu.</p></div>':''}</div></section>`:'';
  const journal=project.journal?.length?`<section class="section"><div class="wrap"><h2>Nhật ký thực hiện</h2><ol class="project-journal">${project.journal.map(entry=>'<li><time datetime="'+escapeHtml(entry.date)+'">'+escapeHtml(entry.date)+'</time><h3>'+escapeHtml(entry.heading)+'</h3><p>'+escapeHtml(entry.description)+'</p>'+(entry.image?'<figure>'+renderImage(entry.image,'../../')+'<figcaption>'+escapeHtml(entry.image.credit)+'</figcaption></figure>':'')+'</li>').join('')}</ol></div></section>`:'';
  const html = renderPage({ site, title: `${project.title} | ${site.name}`, description: project.summary, route: `du-an/${project.slug}/`, prefix: "../../", image: project.cover,
    schema: [{ "@type": "WebPage", url, name: project.title, description: project.summary, inLanguage: "vi-VN", primaryImageOfPage: { "@type": "ImageObject", contentUrl: absoluteImage(project.cover.src, site.baseUrl), caption: project.cover.alt } }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Trang chủ", item: site.baseUrl }, { "@type": "ListItem", position: 2, name: "Công trình", item: new URL("du-an/", site.baseUrl).href }, { "@type": "ListItem", position: 3, name: project.title, item: url }] }],
    content: `<nav class="breadcrumb wrap" aria-label="Breadcrumb"><ol><li><a href="../../index.html">Trang chủ</a></li><li><a href="../">Công trình</a></li><li aria-current="page">${escapeHtml(project.title)}</li></ol></nav><main id="main"><section class="section"><div class="wrap"><p class="eyebrow">${escapeHtml(categoryLabels[project.category])}</p><h1>${escapeHtml(project.title)}</h1><p class="intro">${escapeHtml(project.summary)}</p><dl class="project-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></div></section><div class="wrap">${renderImage(project.cover, "../../", true)}<p class="project-credit">Ảnh: ${escapeHtml(project.cover.credit)}</p></div><section class="section"><div class="wrap project-copy">${project.sections.map(section => `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("")}</div></section>${gallery ? `<section class="section soft"><div class="wrap"><h2>Hình ảnh công trình</h2><div class="project-gallery">${gallery}</div></div></section>` : ""}${comparison}${journal}<section class="cta"><div class="wrap cta-inner"><div><h2>Trao đổi về không gian của bạn</h2><p>Chia sẻ nhu cầu, hiện trạng và các ưu tiên để bắt đầu buổi tư vấn.</p></div><a class="button" href="../../index.html#contact">Gửi yêu cầu ↗</a></div></section></main>` });
  return project.beforeAfter?.sameViewConfirmed===true?html.replace('</body>','<script src="../../assets/project-comparison.js" defer></script></body>'):html;
}

function safeTarget(rootDir, relative) {
  if (!/^du-an\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?index\.html$/.test(relative) && relative !== "du-an/_generated.json") throw new Error(`Đường dẫn sinh không hợp lệ: ${relative}`);
  const target = path.resolve(rootDir, relative);
  // Refuse symlink/junction parents before writing or removing generated files.
  let current = path.dirname(target);
  while (current !== rootDir) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Không ghi qua symlink: ${relative}`);
    current = path.dirname(current);
  }
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error(`Không ghi qua symlink: ${relative}`);
  return target;
}

function buildProjectPages({ rootDir, site, data, check = false }) {
  rootDir = fs.realpathSync(rootDir);
  if (!site || site.name !== "ATELIER HOME" || site.baseUrl !== "https://infiniti-money.github.io/Web-Design/") throw new Error("Cấu hình thương hiệu/domain không khớp lựa chọn đã xác nhận.");
  const projects = validateProjects(data, rootDir);
  const outputs = new Map([["du-an/index.html", renderIndex(site, projects)]]);
  for (const project of projects) outputs.set(`du-an/${project.slug}/index.html`, renderProject(site, project));
  const manifestPath = safeTarget(rootDir, "du-an/_generated.json");
  const previous = fs.existsSync(manifestPath) ? readJson(manifestPath) : [];
  if (!Array.isArray(previous) || previous.some(value => typeof value !== "string")) throw new Error("Manifest trang sinh không hợp lệ.");
  const stale = previous.filter(file => !outputs.has(file));
  // Validate every affected file before writing anything. Manual files are preserved.
  for (const file of new Set([...outputs.keys(), ...previous])) {
    const target = safeTarget(rootDir, file);
    if (fs.existsSync(target) && !fs.readFileSync(target, "utf8").startsWith(marker)) throw new Error(`File chưa được quản lý bởi generator: ${file}`);
  }
  if (!Array.isArray(site.publicPages)) throw new Error("Thiếu danh sách URL công khai.");
  for (const page of site.publicPages) {
    const url = new URL(page.path, site.baseUrl);
    if (typeof page.path !== "string" || !/^[a-z0-9./-]*$/.test(page.path) || url.href !== site.baseUrl + page.path) throw new Error("URL công khai phải nằm trong domain/path đã xác nhận.");
  }
  const sitemapPath = path.join(rootDir, "sitemap.xml");
  if (fs.existsSync(sitemapPath) && fs.lstatSync(sitemapPath).isSymbolicLink()) throw new Error("Không ghi sitemap qua symlink.");
  const projectRoutes = projects.length ? ["du-an/", ...projects.map(project => `du-an/${project.slug}/`)] : [];
  const urls = [...site.publicPages.map(page => new URL(page.path, site.baseUrl).href), ...projectRoutes.map(route => new URL(route, site.baseUrl).href)];
  if (new Set(urls).size !== urls.length) throw new Error("URL sitemap bị trùng.");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
  const manifest = JSON.stringify([...outputs.keys()], null, 2) + "\n";
  if (check) {
    for (const [file, html] of [...outputs, ["sitemap.xml", sitemap], ["du-an/_generated.json", manifest]]) {
      const target = path.join(rootDir, file);
      if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== html) throw new Error(`${file} cần được tạo lại bằng node scripts/build-project-pages.cjs.`);
    }
    if (stale.length) throw new Error("Còn trang dự án đã bỏ xuất bản; cần tạo lại HTML.");
  } else {
    for (const [file, html] of outputs) {
      const target = safeTarget(rootDir, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html);
    }
    for (const file of stale) {
      const target = safeTarget(rootDir, file);
      if (fs.existsSync(target)) fs.unlinkSync(target);
      const directory = path.dirname(target);
      if (directory !== path.join(rootDir, "du-an") && fs.existsSync(directory) && !fs.readdirSync(directory).length) fs.rmdirSync(directory);
    }
    fs.writeFileSync(manifestPath, manifest);
    fs.writeFileSync(sitemapPath, sitemap);
  }
  return { projects: projects.length, pages: outputs.size, urls };
}

if (require.main === module) {
  try {
    if (process.argv.slice(2).some(arg => arg !== "--check")) throw new Error("Chỉ hỗ trợ tùy chọn --check.");
    const rootDir = path.resolve(__dirname, "..");
    const result = buildProjectPages({ rootDir, site: readJson(path.join(rootDir, "content/site.json")), data: readJson(path.join(rootDir, "content/projects.json")), check: process.argv.includes("--check") });
    console.log(`ATELIER HOME: ${result.projects} công trình đã xác nhận, ${result.pages} trang HTML.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildProjectPages, validateProjects, renderPage };
