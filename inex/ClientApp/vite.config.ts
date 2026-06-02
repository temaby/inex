import { defineConfig } from 'vitest/config'
import { normalizePath } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = normalizePath(id)

          if (
            normalizedId.includes('node_modules/antd') ||
            normalizedId.includes('node_modules/@ant-design') ||
            normalizedId.includes('node_modules/@rc-component') ||
            normalizedId.includes('node_modules/rc-')
          ) {
            // vendor-antd intentionally exceeds 500 KB: antd v5 and its runtime packages are large.
            // It is isolated for parallel loading and long-lived browser caching without raising Vite's warning limit.
            return 'vendor-antd'
          }

          if (
            normalizedId.includes('node_modules/recharts') ||
            normalizedId.includes('node_modules/recharts-scale') ||
            normalizedId.includes('node_modules/victory-vendor') ||
            normalizedId.includes('node_modules/d3-')
          ) {
            return 'vendor-recharts'
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
