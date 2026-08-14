import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createSemanticMaskTemplate, encodePng } from './lib/map-analysis.mjs';

const stageId = process.argv[2];
if (!stageId || !/^[a-z][a-z0-9-]*$/.test(stageId)) throw new Error('Usage: pnpm map:mask <stage-id> [output-path]');
const project = resolve(import.meta.dirname, '..');
const map = JSON.parse(await readFile(resolve(project, 'content/stages', stageId, 'map.json'), 'utf8'));
const output = process.argv[3]
  ? resolve(project, process.argv[3])
  : resolve(project, 'public/assets/environment', `${stageId}-semantic.png`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, encodePng(createSemanticMaskTemplate(map, map.visual?.semanticMask)));
console.log(`Wrote geometry-authoritative painting guide to ${output}.`);
