import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE || '/TSAlertes/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5173,
  },
});
