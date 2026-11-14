// Check compiled uniforms and pixels, including shared materials and toggles.
const { build } = require('esbuild'), { chromium } = require('playwright');
const http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
async function main() {
  const { receiverShadowPrograms } = await import('../tools/receiver-shadow-programs.mjs');
  const bundle = await build({ stdin: { resolveDir: path.resolve(__dirname, '..'), contents: `
    import * as THREE from 'three';
    window.run = () => {
      const r=new THREE.WebGLRenderer({antialias:false});r.setSize(128,96);
      r.shadowMap.enabled=true;r.shadowMap.type=THREE.BasicShadowMap;
      const scene=new THREE.Scene();scene.background=new THREE.Color('white');
      const sun=new THREE.DirectionalLight('white',2);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(256,256);
      Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});
      sun.shadow.bias=-.0004;scene.add(sun,sun.target,new THREE.HemisphereLight('white','#777777',.3));
      const shared=new THREE.MeshStandardMaterial({color:'#ccbbdd'}),box=new THREE.BoxGeometry(.8,.8,.8);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),shared);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
      const a=new THREE.Mesh(box,shared),b=new THREE.Mesh(box,shared);a.position.set(-1,.4,0);b.position.set(1,.4,0);a.castShadow=b.castShadow=true;b.receiveShadow=true;scene.add(a,b);
      const custom=shared.clone();custom.onBeforeCompile=s=>{s.uniforms.uTint={value:new THREE.Vector3(.8,1,.7)};s.fragmentShader='uniform vec3 uTint;\\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\\n diffuseColor.rgb *= uTint;');};custom.customProgramCacheKey=()=> 'receiver-custom';
      const c=new THREE.Mesh(box,custom),d=new THREE.Mesh(box,custom);c.position.set(-1,.4,-2);d.position.set(1,.4,-2);c.castShadow=d.castShadow=true;d.receiveShadow=true;scene.add(c,d);
      const sphere=new THREE.SphereGeometry(.4,12,8),n=sphere.attributes.position.count,weights=new Float32Array(n*4);for(let i=0;i<n;i++)weights[i*4]=1;
      sphere.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4),4));sphere.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
      const skinned=new THREE.SkinnedMesh(sphere,shared),bone=new THREE.Bone();skinned.add(bone);skinned.bind(new THREE.Skeleton([bone]));skinned.position.set(0,.5,1.5);skinned.castShadow=true;scene.add(skinned);
      const camera=new THREE.PerspectiveCamera(45,4/3,.1,30);camera.position.set(5,7,9);camera.lookAt(0,.3,0);
      const target=new THREE.WebGLRenderTarget(128,96),traces=[];let active;
      scene.traverse(o=>{if(!o.material)return;o.onAfterRender=(renderer,s,cam,g,m)=>{const p=r.properties.get(m).currentProgram;active.push({receive:o.receiveShadow,sampler:!!p.getUniforms().map.directionalShadowMap,feature:r.properties.get(m).surfaceShadowEnabled});};});
      function draw(mode,toggle){r.shadowMap.receiverOnly=mode;a.receiveShadow=toggle;b.receiveShadow=!toggle;c.receiveShadow=toggle;d.receiveShadow=!toggle;skinned.receiveShadow=toggle;active=[];r.setRenderTarget(target);r.render(scene,camera);const pixels=new Uint8Array(128*96*4);r.readRenderTargetPixels(target,0,0,128,96,pixels);traces.push({mode,toggle,draws:active});return pixels;}
      let maxDifference=0;
      for(const toggle of [false,true,false]){const ordinary=draw(false,toggle),trimmed=draw(true,toggle),rolledBack=draw(false,toggle);for(let i=0;i<ordinary.length;i++)maxDifference=Math.max(maxDifference,Math.abs(ordinary[i]-trimmed[i]),Math.abs(ordinary[i]-rolledBack[i]));}
      const out={maxDifference,traces,glError:r.getContext().getError()};target.dispose();sun.shadow.map.dispose();r.dispose();return out;
    };` }, bundle: true, minify: true, write: false, plugins: [receiverShadowPrograms()] });
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<body><script>'+bundle.outputFiles[0].text+'</script>');});
  let browser;
  try {
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);const out=await page.evaluate(()=>run());
    assert.deepEqual(errors,[]);assert.equal(out.glError,0);assert(out.maxDifference<=1,'compiled receiver variants preserve rendered appearance');
    for(const t of out.traces){assert(t.draws.some(d=>d.receive)&&t.draws.some(d=>!d.receive));for(const d of t.draws){assert.equal(d.sampler,t.mode?d.receive:true);assert.equal(d.feature,t.mode?d.receive:true);}}
    console.log('PASS compiled shadow uniforms, shared/custom/skinned materials, receive toggles and mode rollback:',JSON.stringify({maxDifference:out.maxDifference,draws:out.traces.reduce((n,t)=>n+t.draws.length,0)}));
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
