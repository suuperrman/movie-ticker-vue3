import { createRouter, createWebHistory } from 'vue-router';

import { useUserStore } from '@/stores/user.js';

import HomeView from '@/views/HomeView.vue';
import NotFoundView from '@/views/NotFoundView.vue';

// ===== 公开路由（无需登录即可访问）=====
// requiresAuth 未设置或为 false 时，路由守卫不拦截
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '首页' } },
  // 登录页（第二阶段实现组件后取消注释即可）
  // {
  //   path: '/login',
  //   name: 'login',
  //   component: () => import('@/views/LoginView.vue'),
  //   meta: { title: '登录' },
  // },
  // 后续阶段注册：受保护页面示例
  // { path: '/mine', name: 'mine', component: () => import('@/views/MyOrderView.vue'), meta: { requiresAuth: true, title: '我的订单' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: '404' } },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ===== 全局前置守卫 =====
// - 未登录访问 requiresAuth 的页面 → 跳转 /login
// - Token 已过期（被 http 拦截器清掉） → 同样跳转 /login
router.beforeEach((to) => {
  const userStore = useUserStore();
  // 每次路由切换都尝试恢复 localStorage 中的 Token（应对刷新页面场景）
  userStore.restore();

  const requiresAuth = to.meta.requiresAuth === true;

  if (requiresAuth && !userStore.isLoggedIn) {
    // 保存原目标地址，登录成功后可回跳
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  return true;
});

// ===== 全局后置钩子：设置页面标题 =====
router.afterEach((to) => {
  const title = to.meta.title ?? 'Movie Ticker';
  document.title = `${title} - Movie Ticker`;
});

export default router;
