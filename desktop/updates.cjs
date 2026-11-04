"use strict";
function createUpdateController({updater,version,enabled,onState=()=>{}}){
  let state={status:enabled?"idle":"unavailable",currentVersion:version,version:null,progress:0,message:enabled?"Tự kiểm tra và tải bản cập nhật. Bạn chọn thời điểm khởi động lại.":"Cài bản Setup để nhận cập nhật tự động."};
  const change=patch=>{state={...state,...patch};onState({...state});};
  updater.autoDownload=true;updater.autoInstallOnAppQuit=false;updater.allowDowngrade=false;updater.allowPrerelease=false;
  updater.on("checking-for-update",()=>change({status:"checking",message:"Đang kiểm tra phiên bản mới…",progress:0}));
  updater.on("update-available",info=>change({status:"available",version:info.version,message:"Có phiên bản "+info.version+". Đang chuẩn bị tải…"}));
  updater.on("update-not-available",()=>change({status:"current",message:"Bạn đang dùng phiên bản mới nhất."}));
  updater.on("download-progress",info=>change({status:"downloading",progress:Math.max(0,Math.min(100,Number(info.percent)||0)),message:"Đang tải bản cập nhật…"}));
  updater.on("update-downloaded",info=>change({status:"downloaded",version:info.version,progress:100,message:"Phiên bản "+info.version+" đã tải xong. Lưu công việc trước khi cài đặt."}));
  const fail=error=>change({status:"error",message:error?.statusCode===404||String(error?.code||"").includes("CHANNEL_FILE")?"Kênh cập nhật PC chưa có bản phát hành. Có thể thử lại sau.":"Không kiểm tra hoặc tải được cập nhật. Kiểm tra kết nối và thử lại."});
  updater.on("error",fail);
  let pending=false;
  return {
    getState:()=>({...state}),
    async check(){if(!enabled||pending||["downloading","downloaded"].includes(state.status))return {...state};pending=true;try{await updater.checkForUpdates();}catch(error){fail(error);}finally{pending=false;}return {...state};},
    install(){if(!enabled||state.status!=="downloaded")throw new Error("Update is not ready");updater.quitAndInstall(false,true);}
  };
}
module.exports={createUpdateController};
