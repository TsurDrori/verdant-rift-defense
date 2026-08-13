import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const id = process.argv[2];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('Usage: pnpm stage:new <kebab-case-id>');
const project = resolve(import.meta.dirname, '..');
const target = resolve(project, 'content/stages', id);
await mkdir(target);

const templateRoot = resolve(project, 'content/templates/stage');
for (const file of ['stage.json', 'map.json', 'waves.json']) {
  const source = await readFile(resolve(templateRoot, file), 'utf8');
  await writeFile(resolve(target, file), source.replaceAll('__STAGE_ID__', id));
}
console.log(`Created content/stages/${id}. Edit its three JSON files, then run pnpm content:sync.`);
