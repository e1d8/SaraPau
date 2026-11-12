import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'detalls.html', 'historia.html', 'assets', '.nojekyll']) {
  await cp(resolve(root, name), resolve(output, name), { recursive: true });
}
console.log('Web preparada en dist/ (sense dependències d’execució).');
