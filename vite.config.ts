/**
 * Vite 构建配置
 * ------------------------------------------------------------------
 * - 别名：@ → src/
 * - 开发代理：/api、/admin-api 及 OAuth2 端点转发到后端
 *   （目标取 .env 的 VITE_API_PROXY_TARGET，默认 127.0.0.1:8080）
 * - 产物分包：按框架/UI/图表/请求库等拆 chunk，压缩时移除 console
 * - 构建分析：rollup-plugin-visualizer 输出 dist/stats.html
 */
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // 仅加载代理目标相关环境变量
  const env = loadEnv(mode, process.cwd(), "VITE_API_PROXY_TARGET")
  return {
  plugins: [
    vue(),
    // 构建产物体积分析（生成 dist/stats.html，构建后手动打开查看）
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  // 路径别名：@ 指向 src 目录
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // OAuth2 标准端点（登录页跳转/令牌交换）转发后端
      '^/oauth2/(authorize|token)(?:[?]|$)': {
        target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      // 业务接口前缀
      '/api': {
        target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      // 管理后台接口前缀
      '/admin-api': {
        target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 核心框架
          if (id.includes('node_modules')) {
            // Element Plus 图标
            if (/(?:^|\/)node_modules\/@element-plus\/icons-vue(?:\/|$)/.test(id)) {
              return 'element-icons'
            }
            // Element Plus UI 库
            if (/(?:^|\/)node_modules\/element-plus(?:\/|$)/.test(id)) {
              return 'element-plus'
            }
            // Vue 全家桶
            if (/(?:^|\/)node_modules\/(?:vue|vue-router|pinia|@vue\/[^/]+)(?:\/|$)/.test(id)) {
              return 'vue-vendor'
            }
            // ECharts 图表库
            if (id.includes('echarts')) {
              return 'echarts'
            }
            // VueUse 工具库
            if (id.includes('@vueuse')) {
              return 'vueuse'
            }
            // Axios 网络请求
            if (id.includes('axios')) {
              return 'axios'
            }
            // 其他第三方库
            return 'vendor'
          }
        },
        // 文件名规则
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          let extType = info[info.length - 1]
          // 图片资源
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name || '')) {
            return 'images/[name]-[hash][extname]'
          }
          // 字体资源
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'fonts/[name]-[hash][extname]'
          }
          // 媒体资源
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i.test(assetInfo.name || '')) {
            return 'media/[name]-[hash][extname]'
          }
          // CSS 文件
          if (extType === 'css') {
            return 'css/[name]-[hash][extname]'
          }
          // 其他资源
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console
        drop_console: true,
        drop_debugger: true
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 构建输出目录
    outDir: 'dist',
    // 静态资源基础路径
    assetsDir: 'assets',
    // 小于此阈值的资源将内联为 base64
    assetsInlineLimit: 4096
  }
}
})
