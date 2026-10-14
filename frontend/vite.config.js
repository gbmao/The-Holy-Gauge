import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '..',
  base: './',
  publicDir: 'public',
  build: {
    outDir: '../www',
    emptyOutDir: true,
  },
});
