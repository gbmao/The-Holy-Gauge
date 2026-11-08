import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = fileURLToPath(new URL('.', import.meta.url));
const pagesDirectory = resolve(frontendDirectory, 'pages');

export default defineConfig({
  root: pagesDirectory,
  envDir: resolve(frontendDirectory, '..'),
  base: './',
  publicDir: resolve(frontendDirectory, 'public'),
  build: {
    outDir: resolve(frontendDirectory, '../www'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(pagesDirectory, 'index.html'),
        abastecimentos: resolve(pagesDirectory, 'abastecimentos.html'),
        manutencao: resolve(pagesDirectory, 'manutencao.html'),
        image: resolve(pagesDirectory, 'image.html'),
      },
    },
  },
});
