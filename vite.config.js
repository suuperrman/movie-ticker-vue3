import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Vite 配置统一维护源码别名、开发代理和测试环境，避免业务文件使用脆弱的多级相对路径。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 开发代理：前端统一以 /api 为前缀发请求，Vite 把 /api 去掉后转发到后端。
    // 后端 application.yml 配置 port:8085，无 context-path，Controller 映射从 /auth 开始。
    // 请求链路：前端 /api/auth/login → Vite rewrite → http://localhost:8085/auth/login
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
  },
});
