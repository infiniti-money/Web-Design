const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const capture=require('../scripts/public-contract.cjs'),baseline=require('./fixtures/public-preservation.json');
test('Public redesign preserves existing titles, metadata, canonical, images, link targets and anchors',()=>{
  for(const [file,expected] of Object.entries(baseline)){
    const actual=capture(fs.readFileSync(file,'utf8'));
    // Shared public navigation may add targets; existing metadata, images, IDs and link destinations remain required.
    // The requested homepage modules and AI privacy notice add links/anchors; existing SEO, images and targets must survive.
    for(const key of ['title','meta','canonical','images'])assert.deepEqual(actual[key],expected[key],file+' '+key);
    for(const key of ['links','ids']){const remaining=[...actual[key]];for(const value of expected[key]){const index=remaining.indexOf(value);assert.ok(index>=0,'Missing existing '+key+': '+value);remaining.splice(index,1);}}
    assert.equal(new Set(actual.ids).size,actual.ids.length,'Homepage IDs must remain unique');
  }
});
