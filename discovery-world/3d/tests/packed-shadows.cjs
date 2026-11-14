// Compare packed color shadow maps against native depth, including instances,
// animated skins, real fur and cutout casters. Desktop/software WebGL only.
const { build } = require('esbuild'), { chromium } = require('playwright');
const http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
async function main() {
  const { receiverShadowPrograms } = await import('../tools/receiver-shadow-programs.mjs');
  const bundle = await build({ stdin: { resolveDir: path.resolve(__dirname, '..'), contents: `
    import * as THREE from 'three'; import { addFur } from './src/fur.js';
    window.run = () => {
      const r=new THREE.WebGLRenderer({antialias:false});r.setSize(128,96);
      r.shadowMap.enabled=true;r.shadowMap.type=THREE.BasicShadowMap;
      const scene=new THREE.Scene();scene.background=new THREE.Color('white');
      const sun=new THREE.DirectionalLight('white',2);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(256,256);
      Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});
      sun.shadow.bias=-.0004;scene.add(sun,sun.target,new THREE.HemisphereLight('white','#777777',.3));
      const shared=new THREE.MeshPhysicalMaterial({clearcoat:.5,sheen:.4,color:'#ccbbdd'}),box=new THREE.BoxGeometry(.8,.8,.8);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),shared);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
      const a=new THREE.Mesh(box,shared),b=new THREE.Mesh(box,shared);a.position.set(-1,.4,0);b.position.set(1,.4,0);a.castShadow=b.castShadow=true;b.receiveShadow=true;scene.add(a,b);
      const custom=shared.clone();custom.onBeforeCompile=s=>{s.uniforms.uTint={value:new THREE.Vector3(.8,1,.7)};s.fragmentShader='uniform vec3 uTint;\\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\\n diffuseColor.rgb *= uTint;');};custom.customProgramCacheKey=()=> 'receiver-custom';
      const c=new THREE.Mesh(box,custom),d=new THREE.Mesh(box,custom);c.position.set(-1,.4,-2);d.position.set(1,.4,-2);c.castShadow=d.castShadow=true;d.receiveShadow=true;scene.add(c,d);
      const sphere=new THREE.SphereGeometry(.4,12,8),n=sphere.attributes.position.count,weights=new Float32Array(n*4);for(let i=0;i<n;i++)weights[i*4]=1; sphere.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(n*3).fill(1),3));sphere.setAttribute('furAmt',new THREE.Float32BufferAttribute(new Float32Array(n).fill(1),1));
      sphere.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4),4));sphere.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
      const skinned=new THREE.SkinnedMesh(sphere,shared),bone=new THREE.Bone();skinned.add(bone);skinned.bind(new THREE.Skeleton([bone]));skinned.position.set(0,.5,1.5);skinned.castShadow=true;scene.add(skinned);
      const geo2=sphere.clone(),indices=new Uint16Array(n*4),blend=new Float32Array(n*4);
      for(let i=0;i<n;i++){indices[i*4]=1;indices[i*4+1]=2;blend[i*4]=.35;blend[i*4+1]=.65;}
      geo2.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geo2.setAttribute('skinWeight',new THREE.Float32BufferAttribute(blend,4));
      const other=new THREE.SkinnedMesh(geo2,shared),bones=[new THREE.Bone(),new THREE.Bone(),new THREE.Bone()];bones[0].add(bones[1]);bones[1].add(bones[2]);bones[1].position.y=.15;bones[2].position.x=.1;other.add(bones[0]);other.bind(new THREE.Skeleton(bones));other.position.set(0,.5,-1.3);other.castShadow=other.receiveShadow=true;scene.add(other);
      const shells=addFur(other,{shells:2});for(const shell of shells)shell.position.copy(other.position);
      const instances=new THREE.InstancedMesh(box,shared,3),matrix=new THREE.Matrix4();
      for(let i=0;i<3;i++){instances.setMatrixAt(i,matrix.makeTranslation(i-1,.4,2.8));instances.setColorAt(i,new THREE.Color().setHSL(i/3,.5,.7));}instances.castShadow=instances.receiveShadow=true;scene.add(instances);
      const alpha=new THREE.DataTexture(new Uint8Array([255,255,255,255,255,255,255,0,255,255,255,0,255,255,255,255]),2,2);alpha.needsUpdate=true;
      const cut=new THREE.Mesh(box,new THREE.MeshStandardMaterial({map:alpha,alphaTest:.5}));cut.position.set(2,.7,-1);cut.castShadow=cut.receiveShadow=true;scene.add(cut);
      const camera=new THREE.PerspectiveCamera(45,4/3,.1,30);camera.position.set(5,7,9);camera.lookAt(0,.3,0);
      const target=new THREE.WebGLRenderTarget(128,96),traces=[];let active;
      scene.traverse(o=>{if(!o.material)return;o.onAfterRender=(renderer,s,cam,g,m)=>{const p=r.properties.get(m).currentProgram;active.push({packed:r.properties.get(m).packedShadowDepth,instanced:!!o.isInstancedMesh,skinned:!!o.isSkinnedMesh,bones:o.skeleton?.bones.length,palette:!!p.getUniforms().map.boneMatrices,texture:!!p.getUniforms().map.boneTexture,fur:!!p.getUniforms().map.uFiber,receive:o.receiveShadow,sampler:!!p.getUniforms().map.directionalShadowMap,feature:r.properties.get(m).surfaceShadowEnabled});};});
      function draw(mode,toggle){r.shadowMap.receiverOnly=true;r.uniformBones=true;r.shadowMap.packedDepth=mode;r.shadowMap.needsUpdate=true;a.receiveShadow=toggle;b.receiveShadow=!toggle;c.receiveShadow=toggle;d.receiveShadow=!toggle;skinned.receiveShadow=toggle;active=[];r.setRenderTarget(target);r.render(scene,camera);const pixels=new Uint8Array(128*96*4);r.readRenderTargetPixels(target,0,0,128,96,pixels);const gl=r.getContext(),map=sun.shadow.map;
        const saved=r.getRenderTarget();r.setRenderTarget(map);const attachment=gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE),complete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
        let colored=0;if(mode){const encoded=new Uint8Array(256*256*4);r.readRenderTargetPixels(map,0,0,256,256,encoded);for(let i=0;i<encoded.length;i+=4)if(encoded[i]!==encoded[i+1]||encoded[i+1]!==encoded[i+2])colored++;}r.setRenderTarget(saved);
        const program=r.properties.get(shells[0].material).currentProgram,u=program.getUniforms().map.directionalShadowMap;
        const units=gl.getUniform(program.program,u.addr),slot=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0+(typeof units==='number'?units:units[0]));const bound=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.activeTexture(slot);
        const sampled=r.properties.get(mode?map.texture:map.depthTexture).__webglTexture;
        traces.push({mode,toggle,draws:active,map:{depthTexture:!!map.depthTexture,depthRenderbuffer:attachment===gl.RENDERBUFFER,complete,colored,correctSampler:bound===sampled,width:map.width,nearest:map.texture.minFilter===THREE.NearestFilter}});return pixels;}
      bone.rotation.z=-.25;bones[1].rotation.z=-.4;bones[2].rotation.y=-.3;const cold=draw(true,false);let maxDifference=0;
      const poses=[];let animatedAtSameReceiving;for(const toggle of [false,true,false]){bone.rotation.z=toggle?.45:-.25;bone.position.x=toggle?.12:0;bones[1].rotation.z=toggle?.7:-.4;bones[2].rotation.y=toggle?.3:-.3;const ordinary=draw(false,toggle),trimmed=draw(true,toggle),rolledBack=draw(false,toggle);for(let i=0;i<ordinary.length;i++)maxDifference=Math.max(maxDifference,Math.abs(ordinary[i]-trimmed[i]),Math.abs(ordinary[i]-rolledBack[i]));poses.push(ordinary);if(toggle)animatedAtSameReceiving=draw(false,false);}
      for(let i=0;i<cold.length;i++)maxDifference=Math.max(maxDifference,Math.abs(cold[i]-poses[0][i]));
      let changedPixels=0;for(let i=0;i<poses[0].length;i++)if(poses[0][i]!==animatedAtSameReceiving[i])changedPixels++;const out={changedPixels,shells:shells.length,maxDifference,traces,glError:r.getContext().getError()};target.dispose();sun.shadow.map.dispose();r.dispose();return out;
    };` }, bundle: true, minify: true, write: false, plugins: [receiverShadowPrograms()] });
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<body><script>'+bundle.outputFiles[0].text+'</script>');});
  let browser;
  try {
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
    await page.goto('http://127.0.0.1:'+server.address().port);const out=await page.evaluate(()=>run());
    assert.deepEqual(errors,[]);assert.equal(out.glError,0);assert(out.maxDifference<=1,'compiled receiver variants preserve rendered appearance');
    assert(out.changedPixels>100,'nonidentity animated poses must change visible pixels');assert.equal(out.shells,2);
    for(const t of out.traces){assert.equal(t.map.complete,true);assert.equal(t.map.depthTexture,!t.mode);assert.equal(t.map.depthRenderbuffer,t.mode);assert.equal(t.map.correctSampler,true);assert.equal(t.map.width,256);if(t.mode){assert(t.map.colored>50,'shadow map contains packed color depth');assert(t.map.nearest);}assert(t.draws.some(d=>d.instanced&&d.receive&&d.sampler));for(const d of t.draws)assert.equal(d.packed,t.mode);const skinned=t.draws.filter(d=>d.skinned);assert(skinned.some(d=>d.bones===1)&&skinned.some(d=>d.bones===3));assert(skinned.some(d=>d.fur),'real fur shader rendered');for(const d of skinned){assert.equal(d.palette,true);assert.equal(d.texture,false);}for(const d of t.draws){assert.equal(d.sampler,d.receive);assert.equal(d.feature,d.receive);}}
    console.log('PASS packed color shadow pixels, depth renderbuffer, actual sampler binding, instanced/skinned/fur/cutout materials and rollback:',JSON.stringify({maxDifference:out.maxDifference,changedPixels:out.changedPixels,draws:out.traces.reduce((n,t)=>n+t.draws.length,0)}));
  } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
