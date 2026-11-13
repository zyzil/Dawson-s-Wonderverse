// Genuine depth/color separation, restored output, and loss cleanup.
const { build } = require('esbuild'), { chromium } = require('playwright');
const http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
async function main() {
  const bundle = await build({ stdin: { resolveDir: path.resolve(__dirname, '..'), contents: `
    import * as THREE from 'three'; import { makeWarmTarget } from './src/gpu-work.js';
    import { checkWorldShadows } from './src/shadow-world-check.js';
    window.run = async lose => {
      const r = new THREE.WebGLRenderer(); r.setSize(96,64); r.info.autoReset=false;
      r.shadowMap.enabled=true; r.shadowMap.type=THREE.BasicShadowMap;
      const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(45,1.5,.1,30);
      camera.position.set(4,6,7); camera.lookAt(0,.3,0);
      const sun=new THREE.DirectionalLight('white',2); sun.position.set(-3,7,4); sun.castShadow=true;
      sun.shadow.camera.layers.enable(1); sun.shadow.mapSize.set(128,128);
      Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});
      scene.add(sun,sun.target,new THREE.HemisphereLight('white','#777777',.3));
      const geo=new THREE.BoxGeometry(.7,.7,.7), standard=new THREE.MeshStandardMaterial({color:'#bbaacc'});
      function box(mat,x) { const o=new THREE.Mesh(geo,mat);o.position.set(x,.35,0);o.castShadow=o.receiveShadow=true;scene.add(o);return o; }
      box(standard,-2); const cut=standard.clone();cut.alphaTest=.5;box(cut,-1);
      box(new THREE.MeshPhysicalMaterial({color:'#eeddaa',clearcoat:.2}),2);
      const custom=standard.clone(); custom.onBeforeCompile=s=>{}; custom.customProgramCacheKey=()=> 'world-fixture-custom';box(custom,3);
      const inst=new THREE.InstancedMesh(geo,standard,1);inst.setMatrixAt(0,new THREE.Matrix4().makeTranslation(1,.35,0));
      inst.castShadow=inst.receiveShadow=true;scene.add(inst);
      const sphere=new THREE.SphereGeometry(.5,12,8), n=sphere.attributes.position.count;
      sphere.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4),4));
      const weights=new Float32Array(n*4);for(let i=0;i<n;i++)weights[i*4]=1;
      sphere.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
      function skin(mat,cast) {const o=new THREE.SkinnedMesh(sphere,mat),bone=new THREE.Bone();o.add(bone);o.bind(new THREE.Skeleton([bone]));o.position.y=.5;o.castShadow=cast;o.receiveShadow=true;scene.add(o);return o;}
      skin(standard,true);const fur=standard.clone();fur.userData.layer=.5;fur.alphaToCoverage=true;skin(fur,false).scale.setScalar(1.05);
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(10,10),standard);plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;scene.add(plane);
      const objects=[];scene.traverse(o=>{if(o.material)objects.push([o,o.castShadow,o.receiveShadow,o.onBeforeShadow,o.onBeforeRender]);});
      const lightMask=sun.layers.mask, target=new THREE.WebGLRenderTarget(96,64), warm=makeWarmTarget(true);
      function image(){r.setRenderTarget(target);r.render(scene,camera);const a=new Uint8Array(96*64*4);r.readRenderTargetPixels(target,0,0,96,64,a);return a;}
      const before=image(),report={};let stage='',error='';const render=r.render.bind(r);
      r.render=(s,c)=>{render(s,c);if(lose&&stage==='World shadow check: receive: skinned bodies')r.getContext().getExtension('WEBGL_lose_context').loseContext();};
      try{await checkWorldShadows({renderer:r,scene,camera,sun,target:warm,report,step:s=>stage=s});}catch(e){error=e.message;}
      const restored=objects.every(([o,c,v,f,b])=>o.castShadow===c&&o.receiveShadow===v&&o.onBeforeShadow===f&&o.onBeforeRender===b)&&sun.layers.mask===lightMask&&r.getRenderTarget()===target&&r.shadowMap.autoUpdate===true;
      let samePixels=false;if(!lose){const after=image();samePixels=before.every((v,i)=>v===after[i]);}
      const result={report,error,restored,samePixels};warm.dispose();target.dispose();sun.shadow.map?.dispose();r.dispose();return result;
    };` }, bundle: true, minify: true, write: false });
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<body><script>'+bundle.outputFiles[0].text+'</script>');});
  let browser;
  try {
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
    for(const lose of [false,true]) {
      const out=await page.evaluate(lose=>run(lose),lose), check=out.report.worldShadowCheck;
      assert(out.restored&&check.stateRestored);
      assert(check.probes.filter(p=>p.depthOnly).every(p=>p.colorDraws===0),'depth checks must draw no world surfaces');
      assert(check.probes.filter(p=>!p.depthOnly&&!p.update).every(p=>p.shadowDraws===0),'surface checks must not update depth');
      assert(check.probes.some(p=>p.name==='cast: skinned opaque'&&p.shadowDraws>0));
      assert(check.probes.some(p=>p.name==='receive: standard surfaces'&&p.receiverDraws>0));
      assert.equal(check.probes.find(p=>p.name==='surfaces: shadow receiving off').receiverDraws,0);
      if(lose){assert.match(out.error,/context lost/i);assert(!check.complete);assert.equal(check.probes.at(-1).completed,false);}
      else{assert.equal(out.error,'');assert(out.samePixels,'original rendered pixels must be identical after temporary flags restore');assert(check.complete&&check.probes.every(p=>p.completed&&p.glError===0));}
      console.log('PASS actual world depth/color separation and restoration:',JSON.stringify({lose,probes:check.probes.length,samePixels:out.samePixels}));
    }
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
