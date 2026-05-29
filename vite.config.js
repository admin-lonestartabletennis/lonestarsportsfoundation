import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        programs: resolve(__dirname, 'programs/index.html'),
        contact: resolve(__dirname, 'contact/index.html')
      }
    }
  }
});
