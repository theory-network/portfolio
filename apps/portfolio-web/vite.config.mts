import { federation } from '@module-federation/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const PORT = 4200;

export default defineConfig({
  server: {
    port: PORT,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: { port: PORT, strictPort: true },
  build: { target: 'chrome89' },
  resolve: {
    alias: {
      '@theory/ui': resolve(
        import.meta.dirname,
        '../../packages/ui/src/index.ts',
      ),
    },
  },
  plugins: [
    federation({
      name: 'portfolio_web',
      // No build-time `remotes:` block - the consumer registers them at
      // runtime in src/mf.ts at module load time.
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@theory/common-shadcn': { singleton: true },
      },
    }),
    react(),
    tailwindcss(),
  ],
});
