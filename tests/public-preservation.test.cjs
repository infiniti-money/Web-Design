const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const capture=require('../scripts/public-contract.cjs'),baseline=require('./fixtures/public-preservation.json');
test('Public redesign preserves existing titles, metadata, canonical, images, link targets and anchors',()=>{
  for(const [file,expected] of Object.entries(baseline))assert.deepEqual(capture(fs.readFileSync(file,'utf8')),expected,file+' public contract changed; explicit SEO migration review required');
});
