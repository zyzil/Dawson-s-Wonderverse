// Classic RGBA-packed depth for the opt-in Basic shadow trial. This avoids
// sampling a native depth texture while keeping the same geometry and passes.
export function adaptPackedShadowPrograms(source, once) {
  // The stock ESM import re-exports this constant but does not import it locally.
  for (const name of ['RGBADepthPacking', 'BasicShadowMap']) {
    const start = source.indexOf('import {');
    const end = source.indexOf("from './three.core.js';", start);
    if (start < 0 || end < 0) throw new Error('Pinned Three.js imports drifted');
    if (!source.slice(start, end).includes(name)) source = source.slice(0, start) + source.slice(start).replace('import {', 'import { ' + name + ',');
  }
  source = once(source, '_depthMaterial = new MeshDepthMaterial(),',
    '_depthMaterial = new MeshDepthMaterial(),\n _packedDepthMaterial = new MeshDepthMaterial( { depthPacking: RGBADepthPacking } ),');
  source = once(source, 'let _previousType = this.type;', 'let _previousType = this.type;\n let _previousPackedDepth = false;');
  source = once(source, 'const typeChanged = _previousType !== this.type;', `
    const packedDepth = scope.packedDepth === true;
    if ( packedDepth && ( this.type !== BasicShadowMap || lights.some( light => light.isPointLight ) ) ) {
      throw new Error( 'Packed shadow trial requires Basic shadows and non-point lights' );
    }
    const typeChanged = _previousType !== this.type || _previousPackedDepth !== packedDepth;`);
  source = once(source, '\n\t\t_previousType = this.type;', '\n\t\t_previousType = this.type;\n _previousPackedDepth = scope.packedDepth === true;');
  const allocation = `} else {

					if ( light.isPointLight ) {

						shadow.map = new WebGLCubeRenderTarget( _shadowMapSize.x );`;
  source = once(source, allocation, `} else if ( packedDepth ) {
      shadow.map = new WebGLRenderTarget( _shadowMapSize.x, _shadowMapSize.y, {
        minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false,
        depthBuffer: true, stencilBuffer: false
      } );
      shadow.map.texture.name = light.name + '.packedShadowMap';
    ` + allocation);
  source = once(source,
    'result = ( light.isPointLight === true ) ? _distanceMaterial : _depthMaterial;',
    'result = ( light.isPointLight === true ) ? _distanceMaterial : ( scope.packedDepth === true ? _packedDepthMaterial : _depthMaterial );');
  source = once(source, 'result = customMaterial;', `
    if ( scope.packedDepth === true ) throw new Error( 'Packed shadow trial requires the built-in depth material' );
    result = customMaterial;`);
  source = once(source, 'shadowMapType: renderer.shadowMap.type,',
    'shadowMapType: renderer.shadowMap.type,\n packedShadowDepth: renderer.shadowMap.packedDepth === true,');
  source = once(source, 'array.push( parameters.shadowMapType );',
    'array.push( parameters.shadowMapType );\n array.push( parameters.packedShadowDepth ? 1 : 0 );');
  source = once(source, 'materialProperties.surfaceShadowEnabled = parameters.shadowMapEnabled;',
    'materialProperties.surfaceShadowEnabled = parameters.shadowMapEnabled;\n materialProperties.packedShadowDepth = parameters.packedShadowDepth;');
  source = once(source, 'if ( materialProperties.uniformBoneCount !== ddwUniformBoneCount( _this, object ) ||',
    'if ( materialProperties.packedShadowDepth !== ( _this.shadowMap.packedDepth === true ) || materialProperties.uniformBoneCount !== ddwUniformBoneCount( _this, object ) ||');
  const shadowDefine = "parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',";
  if (source.split(shadowDefine).length !== 3) throw new Error('Expected two pinned shadow shader prefixes');
  source = source.replaceAll(shadowDefine, shadowDefine + "\n parameters.packedShadowDepth ? '#define DDW_PACKED_SHADOW_DEPTH' : '',");
  const start = source.indexOf('var shadowmap_pars_fragment = ');
  const end = source.indexOf('\n', start) - 1;
  const chunk = JSON.parse(source.slice(start + 'var shadowmap_pars_fragment = '.length, end));
  const decode = once(chunk, '#ifdef USE_SHADOWMAP', `#ifdef USE_SHADOWMAP
#ifdef DDW_PACKED_SHADOW_DEPTH
  // Matches the pinned r187 packDepthToRGBA component order and scaling.
  float ddwUnpackShadowDepth( vec4 value ) {
    return dot( value, vec4( 255. / 256., 255. / 65536., 255. / 16777216., 1. / 16777216. ) );
  }
#endif`);
  const adapted = once(decode, 'float depth = texture2D( shadowMap, shadowCoord.xy ).r;', `
#ifdef DDW_PACKED_SHADOW_DEPTH
  float depth = ddwUnpackShadowDepth( texture2D( shadowMap, shadowCoord.xy ) );
#else
  float depth = texture2D( shadowMap, shadowCoord.xy ).r;
#endif`);
  return once(source, 'var shadowmap_pars_fragment = ' + JSON.stringify(chunk) + ';',
    'var shadowmap_pars_fragment = ' + JSON.stringify(adapted.replace(/[ \t]+$/gm, '')) + ';');
}
