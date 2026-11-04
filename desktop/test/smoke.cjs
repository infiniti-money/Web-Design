const {_electron}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
(async()=>{
  const output=path.resolve(__dirname,"../test-artifacts");fs.mkdirSync(output,{recursive:true});
  const userData=fs.mkdtempSync(path.join(os.tmpdir(),"atelier-desktop-smoke-"));
  const env={...process.env,ATELIER_SMOKE:"1",ATELIER_TEST_USER_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({...(process.env.ATELIER_EXECUTABLE?{executablePath:process.env.ATELIER_EXECUTABLE,args:[]}:{args:[path.resolve(__dirname,"..")]}),env,timeout:45000});
  try{
    const page=await app.firstWindow();const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.locator("#login-panel:not(.hide)").waitFor({timeout:20000});
    assert.equal(await page.evaluate(()=>typeof require),"undefined");
    const preferences=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    assert.equal(preferences.contextIsolation,true);assert.equal(preferences.sandbox,true);assert.equal(preferences.nodeIntegration,false);
    assert.equal(await page.evaluate(()=>window.supabase&&typeof window.supabase.createClient),"function");
    const token='{"access_token":"TEST_NOT_REAL_SECRET","refresh_token":"TEST_NOT_REAL_REFRESH"}';
    await page.evaluate(value=>window.atelierDesktop.authStorage.setItem("atelier-home-auth",value),token);
    assert.equal(await page.evaluate(()=>window.atelierDesktop.authStorage.getItem("atelier-home-auth")),token);
    const encrypted=fs.readFileSync(path.join(userData,"auth-session.encrypted"));assert.ok(!encrypted.includes(Buffer.from("TEST_NOT_REAL_SECRET")));
    await page.evaluate(()=>window.atelierDesktop.authStorage.removeItem("atelier-home-auth"));
    assert.equal(await page.evaluate(()=>window.atelierDesktop.authStorage.getItem("atelier-home-auth")),null);
    assert.equal(await page.evaluate(()=>fetch("atelier://app/main.cjs").then(response=>response.status)),404);
    const update=await page.evaluate(()=>window.atelierDesktop.getUpdateState());assert.equal(update.status,"unavailable");
    await page.screenshot({path:path.join(output,"desktop-login.png")});
    await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.webContents.setBackgroundThrottling(false);window.show();});
    await page.goto("atelier://app/commercial.html");
    await page.waitForFunction(()=>!!window.AtelierQuoteEditor);
    await page.evaluate(()=>window.AtelierQuoteEditor.preview({quote:{title:"BÁO GIÁ KIỂM THỬ PDF",status:"draft"},customer:{full_name:"Dữ liệu kiểm thử"},version:{version_no:1,total_amount:25000,content:{schema_version:1,items:[{description:"Hạng mục kiểm thử",unit:"gói",quantity:2.5,unit_price:10000,amount:25000}],subtotal:25000,discount:0,tax_amount:0,total:25000}}}));
    assert.match(await page.locator(".document-state").textContent(),/BẢN NHÁP/);
    await page.screenshot({path:path.join(output,"desktop-quote.png")});
    const pdf=path.join(output,"native-quote.pdf");
    await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},pdf);
    assert.equal(await page.evaluate(()=>window.atelierDesktop.exportPdf("Báo giá kiểm thử")),true);
    const bytes=fs.readFileSync(pdf);assert.equal(bytes.subarray(0,5).toString(),"%PDF-");assert.ok(bytes.length>2000);
    assert.deepEqual(errors,[]);
    console.log("Electron smoke passed: local UI, sandbox, context isolation, encrypted session, resource boundaries, update state, native quote PDF.");
  }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
