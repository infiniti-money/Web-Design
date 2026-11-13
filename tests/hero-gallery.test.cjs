"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8");
const css=fs.readFileSync("assets/hero-gallery.css","utf8");
const js=fs.readFileSync("assets/hero-gallery.js","utf8");
test("Hero remains fully indexable and uses the original highest-priority image",()=>{
  assert.match(html,/<section class="hero" id="home"><img class="hero-photo"[^>]*fetchpriority="high"[^>]*>/);
  assert.match(html,/<h1>Không gian của bạn\.<br>Hành trình rõ ràng\.<\/h1>/);
  assert.match(html,/<link rel="canonical" href="https:\/\/infiniti-money\.github\.io\/Web-Design\/">/);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html,/<script type="application\/ld\+json">/);
});
test("Gallery has clear controls, progressive enhancement and no external script dependency",()=>{
  for(const prop of ["data-hero-prev","data-hero-next","data-hero-toggle","hero-carousel-announcement","hero-gallery.css","hero-gallery.js"])assert.ok(html.includes(prop),prop);
  assert.equal((html.match(/class="hero-slide"/g)||[]).length,2);
  assert.match(js,/document\.hidden/);
  assert.match(js,/navigator\.connection\?\.saveData/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/IntersectionObserver/);
  assert.match(js,/aria-pressed/);
  assert.doesNotMatch(js,/\.innerHTML\s*=/);
  assert.match(css,/html:not\(\.hero-gallery-ready\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/100svh/);
  assert.match(css,/@media\(max-width:600px\)/);
});
