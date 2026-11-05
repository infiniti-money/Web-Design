const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
const code=fs.readFileSync("assets/public-fonts.js","utf8");
function run(cached,heroComplete){const events={},heroEvents={},sheet={media:"print",sheet:cached?{}:null,addEventListener:(name,fn)=>events[name]=fn},hero={complete:heroComplete,addEventListener:(name,fn)=>heroEvents[name]=fn};vm.runInNewContext(code,{document:{getElementById:()=>sheet,querySelector:()=>hero}});return{sheet,events,heroEvents};}
test("Fonts yield network priority to the hero for fresh and cached stylesheets",()=>{
 for(const cached of [false,true]){const state=run(cached,false);if(!cached)state.events.load();assert.equal(state.sheet.media,"print");state.heroEvents.load();assert.equal(state.sheet.media,"all");}
});
test("Fonts activate when hero is cached or fails, and absent stylesheet is harmless",()=>{
 assert.equal(run(true,true).sheet.media,"all");const failed=run(true,false);failed.heroEvents.error();assert.equal(failed.sheet.media,"all");assert.doesNotThrow(()=>vm.runInNewContext(code,{document:{getElementById:()=>null}}));
});
