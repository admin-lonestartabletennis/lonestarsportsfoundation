import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        programs: resolve(__dirname, 'programs/index.html'),
        impact: resolve(__dirname, 'impact/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        help: resolve(__dirname, 'help/index.html'),
        contact: resolve(__dirname, 'contact/index.html')
      }
    }
  }
});
