import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs work both at localhost and under a GitHub Pages
  // project path such as /verdant-rift-defense/.
  base: './',
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'] },
});
