const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {publicHeader}=require('../scripts/public-shell.cjs');
test('Public fonts include licensed WOFF2 Latin and Vietnamese subsets without a Google CSS dependency',()=>{
 const css=fs.readFileSync('assets/public-fonts.css','utf8');assert.match(css,/Be Vietnam Pro/);assert.match(css,/Playfair Display/);assert.match(css,/U\+1EA0-1EF9/);
 const urls=[...css.matchAll(/url\(\.\/fonts\/([^)]*)\)/g)].map(x=>x[1]);assert.equal(urls.length,10);for(const file of urls)assert.equal(fs.readFileSync('assets/fonts/'+file).subarray(0,4).toString(),'wOF2');
 for(const name of ['Be-Vietnam-Pro','Playfair-Display'])assert.match(fs.readFileSync('assets/fonts/'+name+'-OFL.txt','utf8'),/SIL OPEN FONT LICENSE/);
 for(const file of ['index.html','catalog.html','dich-vu/index.html','dich-vu/thiet-ke-noi-that.html','dich-vu/thi-cong-noi-that.html','dich-vu/tu-van-trang-tri.html','privacy.html','du-an/index.html']){const html=fs.readFileSync(file,'utf8');assert.match(html,/assets\/public-fonts\.css/);assert.match(html,/assets\/public-shell\.css/);assert.doesNotMatch(html,/https:\/\/fonts\.(?:googleapis|gstatic)\.com/);}
});
test('Shared navigation retains legacy service context and has consistent desktop/mobile destinations',()=>{
 const legacy='<a href="../index.html">Brand</a><a href="./">Dịch vụ</a><a href="../index.html?service=build#contact">Đặt lịch tư vấn ↗</a>';
 const html=publicHeader('../',{active:'services',legacy});assert.match(html,/href="\.\.\/index\.html\?service=build#contact"/);assert.equal((html.match(/href="\.\/" aria-current="page"/g)||[]).length,2);for(const text of ['Trang chủ','Về chúng tôi','Dự án','Dịch vụ','Quy trình','Kiến thức','Catalog nội thất','Liên hệ'])assert.ok(html.includes(text));
 assert.match(fs.readFileSync('index.html','utf8'),/Trợ lý tư vấn thiết kế nội thất/);
});
