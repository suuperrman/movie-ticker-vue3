import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router/index.js';
import { useUserStore } from './stores/user.js';
import './styles/main.css';
import './styles/auth.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// ===== 全局事件：后端返回 401 时 http 拦截器会派发 auth:logout，这里统一处理登出 + 跳转 =====
window.addEventListener('auth:logout', () => {
  const userStore = useUserStore();
  userStore.logout();
  // 避免在登录页时重复跳转
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login' });
  }
});

app.mount('#app');
