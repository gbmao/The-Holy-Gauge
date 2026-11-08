import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  envDir: '..',
  base: './',
  publicDir: 'public',
  build: {
    outDir: '../www',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(frontendDirectory, 'index.html'),
        abastecimentos: resolve(frontendDirectory, 'abastecimentos.html'),
        manutencao: resolve(frontendDirectory, 'manutencao.html'),
      },
    },
  },
});
