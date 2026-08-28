/**
 * Vite 构建配置
 * ------------------------------------------------------------------
 * - 开发服务器代理：将 /api、/admin-api 请求转发至后端 8080 端口（前后端分离联调）
 * - 生产构建：输出到 dist/，可交由 Nginx / 后端静态托管
 * - 路径别名 @ → src/
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 读取环境变量（.env.development / .env.production）
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [vue()],
    resolve: {
      // 路径别名：import xxx from '@/utils/request'
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      // 前后端分离：所有后端前缀请求代理到后端服务
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/admin-api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      // 兼容老浏览器最低目标
      target: 'es2018',
      chunkSizeWarningLimit: 1500,
    },
  }
})
