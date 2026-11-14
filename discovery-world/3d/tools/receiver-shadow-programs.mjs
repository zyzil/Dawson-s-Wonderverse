// A guarded build-time adaptation of the pinned r187 ESM renderer. The normal
// path is preserved; opt-in modes trim receiver shaders and use uniform bones.
// Never edit node_modules. Exact matches/version checks fail closed on upgrades.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { adaptPackedShadowPrograms } from './packed-shadow-programs.mjs';

export function receiverShadowPrograms() {
  let patched = 0;
  const replaceOnce = (source, from, to) => {
    if (!source.includes(from) || source.indexOf(from) !== source.lastIndexOf(from)) {
      throw new Error('Three.js receiver-shadow adaptation drifted; review the pinned renderer before building.');
    }
    return source.replace(from, to);
  };
  return {
    name: 'receiver-shadow-programs',
    setup(build) {
      build.onLoad({ filter: /[\\/]three[\\/]build[\\/]three\.module\.js$/ }, args => {
        const root = dirname(args.path);
        if (JSON.parse(readFileSync(join(root, '../package.json'), 'utf8')).version !== '0.187.0') {
          throw new Error('Receiver-shadow adaptation requires review for this Three.js version.');
        }
        let source = readFileSync(args.path, 'utf8');
        // Keep 128 vertex vectors for transforms, lighting, custom fur, etc.
        // Rig size participates in both cache keys and shared-material switches.
        source = replaceOnce(source, 'function WebGLPrograms( renderer, environments, extensions, capabilities, bindingStates, clipping ) {', `
const ddwBonePalettes = new WeakMap();
function ddwBonePalette( skeleton, count ) {
  let entry = ddwBonePalettes.get( skeleton );
  if ( !entry || entry.source !== skeleton.boneMatrices || entry.count !== count ) {
    entry = { source: skeleton.boneMatrices, count, view: skeleton.boneMatrices.subarray( 0, count * 16 ) };
    ddwBonePalettes.set( skeleton, entry );
  }
  return entry.view;
}
function ddwUniformBoneCount( renderer, object ) {
  if ( renderer.uniformBones !== true || object.isSkinnedMesh !== true || ! object.skeleton ) return 0;
  const count = object.skeleton.bones.length;
  const limit = Math.min( 64, Math.floor( ( renderer.capabilities.maxVertexUniforms - 128 ) / 4 ) );
  if ( count < 1 || count > limit ) throw new Error( 'Uniform bone trial cannot fit rig: ' + count + ' bones, limit ' + limit );
  return count;
}
function WebGLPrograms( renderer, environments, extensions, capabilities, bindingStates, clipping ) {`);
        const chunkStart = source.indexOf('var skinning_pars_vertex = ');
        const chunkEnd = source.indexOf('\n', chunkStart) - 1;
        const originalChunk = JSON.parse(source.slice(chunkStart + 'var skinning_pars_vertex = '.length, chunkEnd));
        const marker = '\tuniform highp sampler2D boneTexture;';
        if (!originalChunk.includes(marker)) throw new Error('Pinned bone shader drifted');
        const adaptedChunk = originalChunk.replace(marker, `#ifdef BONE_UNIFORM_COUNT
  uniform mat4 boneMatrices[ BONE_UNIFORM_COUNT ];
  mat4 getBoneMatrix( const in float i ) { return boneMatrices[ int( i ) ]; }
#else
` + marker).replace(/\n#endif$/, '\n#endif\n#endif');
        source = replaceOnce(source, 'var skinning_pars_vertex = ' + JSON.stringify(originalChunk) + ';',
          'var skinning_pars_vertex = ' + JSON.stringify(adaptedChunk) + ';');
        source = replaceOnce(source, "parameters.skinning ? '#define USE_SKINNING' : '',",
          "parameters.skinning ? '#define USE_SKINNING' : '',\n parameters.uniformBoneCount > 0 ? '#define BONE_UNIFORM_COUNT ' + parameters.uniformBoneCount : '',");
        source = replaceOnce(source, 'skinning: object.isSkinnedMesh === true,',
          'skinning: object.isSkinnedMesh === true,\n uniformBoneCount: ddwUniformBoneCount( renderer, object ),');
        source = replaceOnce(source, 'array.push( parameters.depthPacking );',
          'array.push( parameters.depthPacking );\n array.push( parameters.uniformBoneCount );');
        source = replaceOnce(source, 'materialProperties.skinning = parameters.skinning;',
          'materialProperties.skinning = parameters.skinning;\n materialProperties.uniformBoneCount = parameters.uniformBoneCount;');
        source = replaceOnce(source,
          "if ( skeleton.boneTexture === null ) skeleton.computeBoneTexture();\n\n\t\t\t\t\tp_uniforms.setValue( _gl, 'boneTexture', skeleton.boneTexture, textures );",
          `if ( materialProperties.uniformBoneCount > 0 ) {
            p_uniforms.setValue( _gl, 'boneMatrices', ddwBonePalette( skeleton, materialProperties.uniformBoneCount ) );
          } else {
            if ( skeleton.boneTexture === null ) skeleton.computeBoneTexture();
            p_uniforms.setValue( _gl, 'boneTexture', skeleton.boneTexture, textures );
          }`);
        source = replaceOnce(source,
          'shadowMapEnabled: renderer.shadowMap.enabled && shadows.length > 0,',
          `receiverOnlyShadows: renderer.shadowMap.receiverOnly === true,
          shadowMapEnabled: renderer.shadowMap.enabled && shadows.length > 0 && ( renderer.shadowMap.receiverOnly !== true || object.receiveShadow === true ),`);
        source = replaceOnce(source,
          'materialProperties.toneMapping = parameters.toneMapping;',
          `materialProperties.toneMapping = parameters.toneMapping;
          materialProperties.receiverOnlyShadows = parameters.receiverOnlyShadows;
          materialProperties.surfaceShadowEnabled = parameters.shadowMapEnabled;`);
        source = replaceOnce(source,
          'if ( materialProperties.needsLights && ( materialProperties.lightsStateVersion !== lights.state.version ) ) {',
          `if ( materialProperties.uniformBoneCount !== ddwUniformBoneCount( _this, object ) || materialProperties.receiverOnlyShadows !== ( _this.shadowMap.receiverOnly === true ) ||
            ( _this.shadowMap.receiverOnly === true && materialProperties.surfaceShadowEnabled !==
              ( _this.shadowMap.enabled && currentRenderState.state.shadowsArray.length > 0 && object.receiveShadow === true ) ) ) {
            needsProgramChange = true;
          } else if ( materialProperties.needsLights && ( materialProperties.lightsStateVersion !== lights.state.version ) ) {`);
        source = adaptPackedShadowPrograms(source, replaceOnce);
        patched++;
        return { contents: source, loader: 'js', resolveDir: root };
      });
      build.onEnd(() => patched === 1 ? undefined : { errors: [{ text: 'Expected to adapt exactly one pinned Three.js ESM renderer.' }] });
    },
  };
}
