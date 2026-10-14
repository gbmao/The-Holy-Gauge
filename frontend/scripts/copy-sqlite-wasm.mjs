import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const wasmSource = require.resolve('sql.js/dist/sql-wasm.wasm');
const wasmDestination = resolve(projectRoot, 'public/assets/sql-wasm.wasm');

await mkdir(dirname(wasmDestination), { recursive: true });
await copyFile(wasmSource, wasmDestination);
