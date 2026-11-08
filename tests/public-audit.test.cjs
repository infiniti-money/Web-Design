const test=require('node:test'),assert=require('node:assert/strict');
const {audit,inspectHtml,sitemapUrls,inProject,pageKey}=require('../scripts/audit-public.cjs');
const base='https://example.test/Web-Design/';
function fixture(patch=()=>undefined){const calls=[];return{calls,fetcher:async(url,options)=>{
 calls.push({url,options});const overridden=patch(url,options);if(overridden)return overridden;
 if(url.endsWith('sitemap.xml'))return new Response('<urlset><url><loc>'+base+'</loc></url></urlset>');
 if(url.endsWith('catalog-publication.json'))return Response.json({schema:1,items:[]});
 if(url===new URL('/robots.txt',base).href||url.includes('__atelier_missing'))return new Response('missing',{status:404});
 if(url.endsWith('robots.txt'))return new Response('User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml');
 const noindex=url!==base;return new Response(`<html><head><title>${url}</title><meta name="description" content="Description"><link rel="canonical" href="${url}"><meta name="robots" content="${noindex?'noindex,follow':'index,follow'}"><meta property="og:title" content="Example"><meta property="og:image" content="${base}assets/brand.png"><script type="application/ld+json">{"@type":"WebPage"}</script></head><body><h1>Example</h1></body></html>`);
 }};}
test('Public audit is GET-only, checks publication policy and reports hostname robots as a warning',async()=>{
 const f=fixture(),r=await audit({base,fetcher:f.fetcher});assert.equal(r.summary.P1,0);assert.equal(r.summary.P2,1);assert.equal(r.issues[0].code,'root-robots');assert.ok(r.pages.length>15);for(const c of f.calls){assert.equal(c.options.method,'GET');assert.equal(c.options.redirect,'manual');assert.equal(c.options.headers.Authorization,undefined);assert.ok(inProject(c.url,base)||c.url===new URL('/robots.txt',base).href);}
});
test('Audit catches index leakage, wrong canonicals, invalid schema and broken fragments',async()=>{
 const f=fixture(url=>url===base?new Response(`<title>Home</title><meta name='description' content='Home'><link rel='canonical' href='${base}wrong'><meta name='robots' content='noindex'><h1>One</h1><script type='application/ld+json'>{oops}</script><a href='#missing'>Broken</a>`):undefined);
 const r=await audit({base,fetcher:f.fetcher});for(const code of ['index-policy','canonical','json-ld','broken-anchor','open-graph'])assert.ok(r.issues.some(x=>x.code===code),code);
});
test('Audit rejects offsite sitemap URLs and redirects without requesting their targets',async()=>{
 for(const body of ['<urlset><loc>https://evil.test/</loc></urlset>','<!DOCTYPE x [<!ENTITY y SYSTEM "file:///secret">]><urlset><loc>'+base+'</loc></urlset>'])assert.throws(()=>sitemapUrls(body,base));
 const f=fixture(url=>url===base?new Response('',{status:302,headers:{Location:'https://evil.test/'}}):undefined),r=await audit({base,fetcher:f.fetcher});assert.ok(r.issues.some(x=>x.code==='fetch'));assert.equal(f.calls.some(x=>x.url.startsWith('https://evil.test')),false);
 assert.equal(inProject('https://example.test/Web-Design-evil/',base),false);assert.equal(inProject('https://user:pass@example.test/Web-Design/',base),false);assert.equal(pageKey(base+'index.html?q=private#x'),base);
});
test('HTML inspector reads quoted metadata, schema and escaped links',()=>{
 const h=inspectHtml(`<title>A &amp; B</title><meta name='description' content='Text'><link href='${base}' rel='canonical'><h1>X</h1><a href='?a=1&amp;b=2' id='x'>X</a>`);assert.equal(h.title,'A & B');assert.equal(h.description,'Text');assert.equal(h.hrefs[0],'?a=1&b=2');assert.ok(h.ids.has('x'));assert.equal(h.h1,1);
});
test('Audit rejects private and unreviewed catalog sitemap entries even when their HTML is noindex',async()=>{
 const f=fixture(url=>url.endsWith('sitemap.xml')?new Response('<urlset><loc>'+base+'</loc><loc>'+base+'admin.html</loc><loc>'+base+'catalog/</loc></urlset>'):undefined),r=await audit({base,fetcher:f.fetcher});assert.ok(r.issues.some(x=>x.code==='private-sitemap'));assert.ok(r.issues.some(x=>x.code==='catalog-sitemap'));
});
