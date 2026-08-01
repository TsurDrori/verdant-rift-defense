import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const textExtensions = new Set(['.html', '.js', '.css']);
const offenders = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else if (textExtensions.has(extname(path))) {
      const source = await readFile(path, 'utf8');
      if (/["'(=]\/assets\//.test(source)) offenders.push(relative(root, path));
    }
  }
}

await inspect(root);
if (offenders.length) {
  throw new Error(`Root-absolute public assets break GitHub Pages subpaths: ${offenders.join(', ')}`);
}
console.log('Production assets are deployment-base relative.');
