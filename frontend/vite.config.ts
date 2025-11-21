import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';

const sharedModules = path.resolve(__dirname, '..', 'docuhealth-ai', 'node_modules');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lucide-react': path.join(sharedModules, 'lucide-react'),
      'class-variance-authority': path.join(sharedModules, 'class-variance-authority'),
      '@radix-ui/react-slot': path.join(sharedModules, '@radix-ui/react-slot'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
