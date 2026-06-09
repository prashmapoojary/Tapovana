import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined, // prevents excessive chunk splitting
      },
    },
  },
  optimizeDeps: {
    entries: [], // limits dependency scanning
  },
  server: {
    port: 5174,
    hmr: {
      overlay: false, // reduces HMR overhead
    },
  },
  experimental: {
    renderBuiltUrl(filename) {
      return filename; // disables aggressive preloading
    },
  },
})

