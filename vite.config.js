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
  host: '0.0.0.0', // 允许局域网手机访问
  proxy: {
    '/api': {
      target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8085',
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
