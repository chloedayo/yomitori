import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        reader: './reader.html',
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // Same-origin parity with prod middleware: all SPA requests go
      // through :3000 (middleware static + /api/* reverse-proxy).
      // Docker-dev: the same table works as long as docker-compose maps
      // `localhost:3000` inside the frontend container to the middleware
      // service (host network or service alias). Production build does
      // not use vite dev server at all.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/tokenize': { target: 'http://localhost:3000', changeOrigin: true },
      '/deinflect': { target: 'http://localhost:3000', changeOrigin: true },
      '/extract-baseForms': { target: 'http://localhost:3000', changeOrigin: true },
      '/mine-words': { target: 'http://localhost:3000', changeOrigin: true },
      '/anki': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
    },
    hmr: process.env.DOCKER_ENV ? {
      host: process.env.LAN_IP || 'localhost',
      port: 5173,
      protocol: 'ws',
    } : undefined,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
})
