import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    // Disable crossorigin for Electron file:// compatibility
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
