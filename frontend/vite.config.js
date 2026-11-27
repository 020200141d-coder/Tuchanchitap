// ============================================================================
//  vite.config.js — servidor de desarrollo del frontend
//
//  En desarrollo, el proxy manda /api y /uploads al backend (puerto 3000), así
//  el navegador ve todo en el mismo origen y no hace falta configurar CORS
//  mientras programas. En producción se usa VITE_API_URL (ver .env.example).
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = process.env.VITE_BACKEND || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/uploads': backend
    }
  }
});
