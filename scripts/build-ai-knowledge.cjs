'use strict';
const fs=require('node:fs'),path=require('node:path');
function build(root=path.resolve(__dirname,'..'),check=false){
 const data=JSON.parse(fs.readFileSync(path.join(root,'content/articles.json'),'utf8'));
 const articles=data.articles.filter(x=>x.status==='published'&&Date.parse(x.published_at)<=Date.now()).slice(0,8);
 const knowledge=articles.map(x=>x.title+'\n'+x.body_markdown.slice(0,2600)).join('\n\n').slice(0,12000);
 if(!knowledge)throw Error('Missing approved public knowledge');
 const text='// Generated only from local public editorial articles; no CRM or customer records.\nexport const knowledge='+JSON.stringify(knowledge).replace(/</g,'\\u003c')+';\n';
 const file=path.join(root,'supabase/functions/_shared/ai-knowledge.mjs');if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)throw Error('AI knowledge out of date');}else fs.writeFileSync(file,text);return{articles:articles.length,characters:knowledge.length};
}
if(require.main===module)console.log(JSON.stringify(build(undefined,process.argv.includes('--check'))));module.exports={build};
