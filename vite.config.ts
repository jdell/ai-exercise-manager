import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const nodeShim = fileURLToPath(new URL('./src/lib/node-shim.ts', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The Anthropic SDK pulls in node:fs / node:path for filesystem credential
    // resolution, which this browser build never uses. See src/lib/node-shim.ts.
    alias: {
      'node:fs': nodeShim,
      'node:fs/promises': nodeShim,
      'node:path': nodeShim,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/database'],
          anthropic: ['@anthropic-ai/sdk'],
        },
      },
    },
  },
});
