/* Local-only static server for Chromium CI on Linux/Windows. */
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const root=process.cwd(),port=8765;
const types={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".pdf":"application/pdf",".json":"application/json; charset=utf-8"};
http.createServer((req,res)=>{
  if(req.method!=="GET"){res.writeHead(405).end();return;}
  let url;
  try{url=new URL(req.url,"http://127.0.0.1");}catch{res.writeHead(400).end();return;}
  const name=decodeURIComponent(url.pathname);
  const file=path.resolve(root,"."+name);
  if(!file.startsWith(root+path.sep)||file.includes(".."+path.sep+".git"+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404).end();return;}
   res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);
  });
}).listen(port,"127.0.0.1",()=>console.log("Preview served at http://127.0.0.1:"+port));
