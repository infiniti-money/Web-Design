const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("atelierDesktop",{
  authStorage:{getItem:()=>ipcRenderer.invoke("atelier:auth:get"),setItem:(_key,value)=>ipcRenderer.invoke("atelier:auth:set",value),removeItem:()=>ipcRenderer.invoke("atelier:auth:remove")},
  getUpdateState:()=>ipcRenderer.invoke("atelier:updates:state"),
  checkForUpdates:()=>ipcRenderer.invoke("atelier:updates:check"),
  installUpdate:()=>ipcRenderer.invoke("atelier:updates:install"),
  exportPdf:name=>ipcRenderer.invoke("atelier:document:pdf",name),
  onUpdateState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on("atelier:updates:changed",listener);return()=>ipcRenderer.removeListener("atelier:updates:changed",listener);}
});
