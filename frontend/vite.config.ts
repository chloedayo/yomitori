import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
    proxy: process.env.DOCKER_ENV ? {} : {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    },
    hmr: process.env.DOCKER_ENV ? {
      host: process.env.LAN_IP || 'localhost',
      port: 5173,
      protocol: 'ws',
    } : undefined,
  }
})
