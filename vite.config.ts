import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/*
 * The node:fs / node:path aliases that used to live here are gone with the
 * Anthropic SDK: it now runs only in functions/, on Node, where those imports
 * resolve for real. Nothing in this bundle talks to api.anthropic.com.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/database',
            'firebase/functions',
          ],
        },
      },
    },
  },
});
