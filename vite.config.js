import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = (env.PORT && String(env.PORT).trim()) || '3000'
  const apiTarget =
    (env.VITE_DEV_API_PROXY_TARGET && String(env.VITE_DEV_API_PROXY_TARGET).trim()) ||
    `http://localhost:${port}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/login': { target: apiTarget, changeOrigin: true },
        '/api': { target: apiTarget, changeOrigin: true },
        '/test-db': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
