// Isolate palette cost on the same frozen world, including HDR post and shadows.
// Unlike live three-rAF samples, both modes submit exactly the same draw work.
const {chromium}=require('playwright'),fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
async function main(){
  const storage=process.env.SHADOW_COMPARE==='rgba';
  const html=fs.readFileSync(process.argv[2]||'index.html');
  const server=http.createServer((q,s)=>{s.setHeader('Content-Type','text/html');s.end(html);});let browser;
  try{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 17; Pixel 10 Pro XL) AppleWebKit/537.36 Chrome/157.0.0.0 Mobile Safari/537.36'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/?graphics=full-basic-shadows&shadowcode=receivers&bones=uniform'+(storage?'&shadowstorage=rgba':''));
    await page.waitForFunction(()=>window.__DDW3&&document.getElementById('loading').classList.contains('done'),null,{timeout:180000});await page.locator('#playBtn').tap();
    for(const [name,x] of [['park',150],['creatures',230],['castle',392],['house',1008],['castle rooms',2010]]){
      const result=await page.evaluate(async ({x,storage})=>{
        const D=__DDW3,r=D.renderer,gl=r.getContext();D.teleport(x);
        await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(done))));D.G.activityOpen=true;
        async function completed(){const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();try{await new Promise((ok,no)=>{function poll(){const s=gl.clientWaitSync(sync,0,0);if(s===gl.ALREADY_SIGNALED||s===gl.CONDITION_SATISFIED)ok();else if(s===gl.WAIT_FAILED||gl.isContextLost())no(Error('GPU fence failed'));else requestAnimationFrame(poll);}requestAnimationFrame(poll);});}finally{gl.deleteSync(sync);}}
        async function draw(update){r.shadowMap.needsUpdate=update;r.info.reset();if(D.post.enabled)D.post.render();else r.render(D.G.scene,D.camera);const work={calls:r.info.render.calls,tris:r.info.render.triangles};await completed();return work;}
        // Warm both cached variants before timing; alternate ABBA to reduce drift.
        const setMode=mode=>{if(storage)r.shadowMap.packedDepth=mode;else r.uniformBones=mode;};
        for(const mode of [false,true]){setMode(mode);await draw(true);}
        const programs=r.info.programs.length,samples=[];
        for(const mode of [false,true,true,false]){setMode(mode);if(storage)await draw(true);const start=performance.now(),work=[];for(const update of [false,true])work.push(await draw(update));samples.push({mode,ms:Math.round(performance.now()-start),work});}
        setMode(true);if(storage)await draw(true);D.G.activityOpen=false;
        return {samples,newPrograms:r.info.programs.length-programs,glError:gl.getError()};
      },{x,storage});
      assert.equal(result.glError,0);assert.equal(result.newPrograms,0);for(const s of result.samples)assert.deepEqual(s.work,result.samples[0].work,'identical frozen scene and shadow update schedule');
      console.log(JSON.stringify({name,...result}));
    }
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
