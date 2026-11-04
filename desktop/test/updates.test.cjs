const test=require("node:test"),assert=require("node:assert/strict"),{EventEmitter}=require("node:events");
const {createUpdateController}=require("../updates.cjs");
class FakeUpdater extends EventEmitter{checks=0;installs=0;async checkForUpdates(){this.checks++;this.emit("checking-for-update");}quitAndInstall(){this.installs++;}}
test("Updates are downloaded automatically but installation requires a completed download and explicit action",async()=>{
  const updater=new FakeUpdater(),states=[],controller=createUpdateController({updater,version:"1.0.0",enabled:true,onState:s=>states.push(s)});
  assert.equal(updater.autoDownload,true);assert.equal(updater.autoInstallOnAppQuit,false);assert.equal(updater.allowDowngrade,false);
  assert.throws(()=>controller.install());await controller.check();assert.equal(updater.checks,1);
  updater.emit("update-available",{version:"1.1.0"});updater.emit("download-progress",{percent:51.2});
  assert.equal(controller.getState().status,"downloading");assert.throws(()=>controller.install());
  await controller.check();assert.equal(updater.checks,1);
  updater.emit("update-downloaded",{version:"1.1.0"});assert.equal(updater.installs,0);controller.install();assert.equal(updater.installs,1);
  assert.ok(states.every(s=>s.currentVersion==="1.0.0"));
});
test("Development/portable mode never checks or installs updates; network errors remain recoverable",async()=>{
  const updater=new FakeUpdater(),disabled=createUpdateController({updater,version:"1.0.0",enabled:false});await disabled.check();assert.equal(updater.checks,0);assert.throws(()=>disabled.install());
  const updater2=new FakeUpdater(),enabled=createUpdateController({updater:updater2,version:"1.0.0",enabled:true});updater2.emit("error",{statusCode:404});assert.equal(enabled.getState().status,"error");assert.match(enabled.getState().message,/chưa có bản phát hành/);await enabled.check();assert.equal(updater2.checks,1);
});
