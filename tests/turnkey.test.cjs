const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {calculate,summary}=require('../assets/turnkey.js'),{validateConfig,buildConversion}=require('../scripts/build-conversion.cjs'),{buildProjectPages}=require('../scripts/build-project-pages.cjs');
const root=path.resolve(__dirname,'..'),config=require('../content/conversion.json'),site=require('../content/site.json');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'atelier-turnkey-'));
const rates={minPerM2:100,maxPerM2:200,perBedroom:50},approved={enabled:true,approved:true,version:'fixture-only',validUntil:'2099-01-01T00:00:00Z',packages:{economy:rates,balanced:rates,premium:rates}},input={area:'80.5',bedrooms:'2',tier:'balanced'};
const image={src:'https://images.example.invalid/sample.webp',alt:'Ảnh kiểm thử',credit:'Fixture; không xuất bản thật',width:900,height:600,rightsConfirmed:true};
const project=()=>({slug:'kiem-thu',published:true,realProjectConfirmed:true,title:'Công trình fixture',summary:'Mô tả kiểm thử',category:'apartment',cover:{...image},sections:[{heading:'Phạm vi',paragraphs:['Mô tả']}],area:'80 m²',style:'Minimalism',location:'Khu vực đã xác nhận',budget:'Chi phí được phép công bố',budgetPublicConfirmed:true,materials:['Vật liệu fixture'],beforeAfter:{type:'design-real',sameViewConfirmed:true,before:{...image},after:{...image}},journal:[{heading:'Khảo sát',description:'Mốc fixture',date:'2026-11-01',image:{...image}}]});
test('Unconfigured, unapproved and expired estimators never invent prices',()=>{
 assert.equal(config.estimate.enabled,false);for(const c of [config.estimate,{...approved,approved:false},{...approved,validUntil:'2000-01-01'},null]){const r=calculate(input,c);assert.equal(r.available,false);assert.equal(r.min,undefined);assert.match(summary(r),/Chưa có đơn giá/);}
});
test('Approved estimate uses explicit area and bedroom formula and rejects invalid boundaries',()=>{
 const r=calculate(input,approved);assert.equal(r.min,8150);assert.equal(r.max,16200);assert.equal(r.version,'fixture-only');assert.match(summary(r),/Chưa phải báo giá/);
 for(const patch of [{area:''},{area:'NaN'},{area:9},{area:1001},{bedrooms:''},{bedrooms:1.2},{bedrooms:11},{tier:'invalid'}])assert.throws(()=>calculate({...input,...patch},approved));
 assert.equal(calculate({area:10,bedrooms:0,tier:'economy'},approved).available,true);
});
test('Publisher requires approved rates and real video rights; exports only safe public fields',()=>{
 for(const value of [{...config,estimate:{...approved,approved:false}},{...config,estimate:{...approved,packages:{}}},{...config,heroVideo:{src:'javascript:alert(1)'}},{...config,heroVideo:{src:'https://user:secret@example.invalid/video.mp4',caption:'Video',rightsConfirmed:true,realFootageConfirmed:true}}])assert.throws(()=>validateConfig(value,root));
 const publicConfig=validateConfig({...config,internal_note:'DO_NOT_EXPORT',estimate:{...approved,merchant_secret:'DO_NOT_EXPORT'}},root);assert.ok(!JSON.stringify(publicConfig).includes('DO_NOT_EXPORT'));
});
test('Verified portfolio exports at most five projects and never invents cards for an empty source',()=>{
 const dir=temp(),output=temp();fs.mkdirSync(path.join(dir,'content'));fs.writeFileSync(path.join(dir,'content/conversion.json'),JSON.stringify(config));fs.copyFileSync(path.join(root,'index.html'),path.join(output,'index.html'));
 const projects=Array.from({length:7},(_,i)=>({...project(),slug:'muc-'+i}));fs.writeFileSync(path.join(dir,'content/projects.json'),JSON.stringify({projects}));const r=buildConversion({root:dir,output});assert.equal(r.featured,5);const html=fs.readFileSync(path.join(output,'index.html'),'utf8');assert.equal((html.match(/class="featured-card"/g)||[]).length,5);assert.match(html,/Chi phí được phép công bố/);
 fs.writeFileSync(path.join(dir,'content/projects.json'),JSON.stringify({projects:[]}));fs.copyFileSync(path.join(root,'index.html'),path.join(output,'index.html'));assert.equal(buildConversion({root:dir,output}).featured,0);assert.doesNotMatch(fs.readFileSync(path.join(output,'index.html'),'utf8'),/class="featured-card"/);
});
test('Deep-dive pages include approved facts, journal and accessible comparison, with a no-JS fallback',()=>{
 const dir=temp(),p=project();buildProjectPages({rootDir:dir,site,data:{projects:[p]}});const html=fs.readFileSync(path.join(dir,'du-an/kiem-thu/index.html'),'utf8');for(const text of ['Thiết kế và thực tế','Vật liệu chủ đạo','Nhật ký thực hiện','type="range"','project-comparison.js','data-comparison-controls hidden'])assert.ok(html.includes(text),text);assert.doesNotMatch(html,/99%|20%/);
 for(const change of [p=>p.budgetPublicConfirmed=false,p=>p.journal[0].image.rightsConfirmed=false,p=>p.beforeAfter.type='unsafe']){const bad=project();change(bad);assert.throws(()=>buildProjectPages({rootDir:temp(),site,data:{projects:[bad]}}));}
 const fallback=project();fallback.beforeAfter.sameViewConfirmed=false;const second=temp();buildProjectPages({rootDir:second,site,data:{projects:[fallback]}});assert.doesNotMatch(fs.readFileSync(path.join(second,'du-an/kiem-thu/index.html'),'utf8'),/type="range"/);
});
