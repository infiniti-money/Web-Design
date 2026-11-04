"use strict";
const {app,BrowserWindow,protocol,ipcMain,session,safeStorage,dialog,shell,Menu}=require("electron");
const fs=require("node:fs"),path=require("node:path");
const {autoUpdater}=require("electron-updater");
const {trustedPage,resolveAsset,externalTarget,SITE,csp}=require("./security.cjs");
const {createUpdateController}=require("./updates.cjs");
const smoke=process.env.ATELIER_SMOKE==="1";
if(smoke&&process.env.ATELIER_TEST_USER_DATA)app.setPath("userData",process.env.ATELIER_TEST_USER_DATA);
protocol.registerSchemesAsPrivileged([{scheme:"atelier",privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const lock=app.requestSingleInstanceLock();
if(!lock)app.quit();
let win,updates,allowClose=false;
const types={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon"};
function validateSender(event){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!trustedPage(event.senderFrame.url))throw new Error("Untrusted sender");}
function external(url){const target=externalTarget(url);if(target)shell.openExternal(target);}
function tokenFile(){return path.join(app.getPath("userData"),"auth-session.encrypted");}
function installHandlers(){
  ipcMain.handle("atelier:auth:get",event=>{validateSender(event);try{if(!safeStorage.isEncryptionAvailable())return null;const file=tokenFile();return fs.existsSync(file)?safeStorage.decryptString(fs.readFileSync(file)):null;}catch{return null;}});
  ipcMain.handle("atelier:auth:set",(event,value)=>{validateSender(event);if(typeof value!=="string"||value.length>262144)throw new Error("Invalid session");JSON.parse(value);if(!safeStorage.isEncryptionAvailable())throw new Error("Encrypted storage unavailable");fs.mkdirSync(app.getPath("userData"),{recursive:true});fs.writeFileSync(tokenFile(),safeStorage.encryptString(value),{mode:0o600});});
  ipcMain.handle("atelier:auth:remove",event=>{validateSender(event);const file=tokenFile();if(fs.existsSync(file))fs.unlinkSync(file);});
  ipcMain.handle("atelier:updates:state",event=>{validateSender(event);return updates.getState();});
  ipcMain.handle("atelier:updates:check",event=>{validateSender(event);return updates.check();});
  ipcMain.handle("atelier:document:pdf",async(event,name)=>{validateSender(event);if(!event.senderFrame.url.startsWith("atelier://app/commercial.html"))throw new Error("Document export not allowed");const filename=String(name||"Bao-gia").slice(0,100).replace(/[<>:"/\\|?*\x00-\x1f]/g,"-")+".pdf";const {canceled,filePath}=await dialog.showSaveDialog(win,{title:"Xuất báo giá PDF",defaultPath:path.join(app.getPath("downloads"),filename),filters:[{name:"PDF",extensions:["pdf"]}]});if(canceled||!filePath)return false;const bytes=await win.webContents.printToPDF({pageSize:"A4",printBackground:true});fs.writeFileSync(filePath,bytes);return true;});
  ipcMain.handle("atelier:updates:install",async event=>{validateSender(event);if(updates.getState().status!=="downloaded")return false;const {response}=await dialog.showMessageBox(win,{type:"question",buttons:["Để sau","Cài đặt và khởi động lại"],defaultId:0,cancelId:0,title:"Cập nhật ATELIER HOME",message:"Lưu công việc trước khi cập nhật.",detail:"Ứng dụng sẽ đóng và mở lại sau khi cài phiên bản mới."});if(response!==1)return false;allowClose=true;updates.install();return true;});
}
async function createWindow(){
  const ui=path.join(__dirname,"ui");
  protocol.handle("atelier",request=>{
    if(!["GET","HEAD"].includes(request.method))return new Response("Method not allowed",{status:405});
    const file=resolveAsset(request.url,ui);if(!file)return new Response("Not found",{status:404});
    try{return new Response(request.method==="HEAD"?null:fs.readFileSync(file),{headers:{"Content-Type":types[path.extname(file)]||"application/octet-stream","Content-Security-Policy":csp,"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Cache-Control":"no-store"}});}catch{return new Response("Not found",{status:404});}
  });
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  win=new BrowserWindow({width:1440,height:960,minWidth:840,minHeight:620,show:false,title:"ATELIER HOME Manager",backgroundColor:"#f3f5f3",icon:path.join(__dirname,"build/icon.png"),webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true,devTools:!app.isPackaged||smoke}});
  win.webContents.setWindowOpenHandler(({url})=>{external(url);return{action:"deny"};});
  win.webContents.on("will-navigate",(event,url)=>{if(trustedPage(url))return;event.preventDefault();const parsed=new URL(url);if(parsed.protocol==="atelier:"&&parsed.hostname==="app")external(SITE+parsed.pathname.slice(1));else external(url);});
  win.webContents.on("will-attach-webview",event=>event.preventDefault());
  win.webContents.on("will-prevent-unload",event=>{if(allowClose){event.preventDefault();return;}const result=dialog.showMessageBoxSync(win,{type:"question",buttons:["Tiếp tục chỉnh sửa","Rời đi, không lưu"],defaultId:0,cancelId:0,message:"Bạn có thay đổi chưa lưu."});if(result===1)event.preventDefault();});
  session.defaultSession.on("will-download",(event,item,contents)=>{if(contents!==win?.webContents){event.preventDefault();return;}const filename=path.basename(item.getFilename()).replace(/[<>:"/\\|?*]/g,"-");const savePath=dialog.showSaveDialogSync(win,{title:"Lưu tệp xuất",defaultPath:path.join(app.getPath("downloads"),filename)});if(savePath)item.setSavePath(savePath);else item.cancel();});
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:"Ứng dụng",submenu:[{label:"Mở website công khai",click:()=>external(SITE)},{type:"separator"},{role:"quit",label:"Thoát"}]},{label:"Chỉnh sửa",submenu:[{role:"undo",label:"Hoàn tác"},{role:"redo",label:"Làm lại"},{type:"separator"},{role:"cut",label:"Cắt"},{role:"copy",label:"Sao chép"},{role:"paste",label:"Dán"},{role:"selectAll",label:"Chọn tất cả"}]},{label:"Hiển thị",submenu:[{role:"reload",label:"Tải lại"},{role:"resetZoom",label:"Cỡ mặc định"},{role:"zoomIn",label:"Phóng to"},{role:"zoomOut",label:"Thu nhỏ"},{role:"togglefullscreen",label:"Toàn màn hình"}]}]));
  updates=createUpdateController({updater:autoUpdater,version:app.getVersion(),enabled:app.isPackaged&&!process.env.PORTABLE_EXECUTABLE_DIR&&!smoke,onState:state=>{if(win&&!win.isDestroyed())win.webContents.send("atelier:updates:changed",state);}});
  installHandlers();
  win.once("ready-to-show",()=>{if(!smoke)win.show();});
  await win.loadURL("atelier://app/admin.html");
  if(app.isPackaged&&!smoke&&!process.env.PORTABLE_EXECUTABLE_DIR){const initial=setTimeout(()=>updates.check(),15000);initial.unref();const timer=setInterval(()=>updates.check(),6*60*60*1000);timer.unref();}
}
if(lock){app.whenReady().then(createWindow).catch(()=>{dialog.showErrorBox("ATELIER HOME Manager","Không khởi động được ứng dụng. Hãy mở lại hoặc cài lại bản Setup.");app.quit();});app.on("second-instance",()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});app.on("window-all-closed",()=>app.quit());}
