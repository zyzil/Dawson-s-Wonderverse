// A guarded build-time adaptation of the pinned r187 ESM renderer. The normal
// path is preserved; opt-in renderers compile shadow chunks only for receivers.
// Never edit node_modules. Exact matches/version checks fail closed on upgrades.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
          `if ( materialProperties.receiverOnlyShadows !== ( _this.shadowMap.receiverOnly === true ) ||
            ( _this.shadowMap.receiverOnly === true && materialProperties.surfaceShadowEnabled !==
              ( _this.shadowMap.enabled && currentRenderState.state.shadowsArray.length > 0 && object.receiveShadow === true ) ) ) {
            needsProgramChange = true;
          } else if ( materialProperties.needsLights && ( materialProperties.lightsStateVersion !== lights.state.version ) ) {`);
        patched++;
        return { contents: source, loader: 'js', resolveDir: root };
      });
      build.onEnd(() => patched === 1 ? undefined : { errors: [{ text: 'Expected to adapt exactly one pinned Three.js ESM renderer.' }] });
    },
  };
}
