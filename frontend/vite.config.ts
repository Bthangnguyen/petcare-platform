import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API requests are forwarded to the application server (port 3000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
