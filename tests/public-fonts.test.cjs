const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
const code=fs.readFileSync("assets/public-fonts.js","utf8");
function run(cached,heroComplete){const events={},heroEvents={},sheet={media:"print",sheet:cached?{}:null,addEventListener:(name,fn)=>events[name]=fn},hero={complete:heroComplete,addEventListener:(name,fn)=>heroEvents[name]=fn};vm.runInNewContext(code,{document:{getElementById:()=>sheet,querySelector:()=>hero}});return{sheet,events,heroEvents};}
test("Fonts activate independently of a slow hero and an uncached stylesheet",()=>{
 for(const cached of [false,true]){const state=run(cached,false);assert.equal(state.sheet.media,"all");assert.equal(Object.keys(state.heroEvents).length,0);}
});
test("Fonts activate when hero is cached or fails, and absent stylesheet is harmless",()=>{
 assert.equal(run(true,true).sheet.media,"all");assert.equal(run(true,false).sheet.media,"all");assert.doesNotThrow(()=>vm.runInNewContext(code,{document:{getElementById:()=>null}}));
});
