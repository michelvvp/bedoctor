import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos: o build roda em qualquer pasta do nginx.
  base: './',
  build: {
    outDir: 'dist',
  },
});
