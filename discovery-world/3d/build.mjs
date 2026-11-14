// Bundles src/main.js (+ Three.js) into ONE self-contained, offline index.html.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { receiverShadowPrograms } from './tools/receiver-shadow-programs.mjs';
const out = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: ['safari15', 'chrome100'], legalComments: 'none', plugins: [receiverShadowPrograms()], loader: { '.glb': 'binary', '.jpg': 'dataurl', '.png': 'dataurl', '.exr': 'binary' } });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/index.template.html', 'utf8').replace('/*__CSS__*/', readFileSync('src/style.css', 'utf8')).replace('/*__JS__*/', () => js);
writeFileSync('index.html', html);
console.log(`index.html written: ${(html.length / 1024).toFixed(0)} KB`);
// The grown-up shadow check embeds the same pinned Three.js and works offline.
const shadow = await build({ entryPoints: ['src/shadow-check.js'], bundle: true, minify: true, format: 'iife', write: false, target: ['safari15', 'chrome100'], legalComments: 'none' });
const check = readFileSync('src/shadow-check.template.html', 'utf8').replace('/*__JS__*/', () => shadow.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
writeFileSync('shadow-check.html', check);
console.log(`shadow-check.html written: ${(check.length / 1024).toFixed(0)} KB`);
