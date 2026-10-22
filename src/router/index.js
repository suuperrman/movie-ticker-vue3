import { createRouter, createWebHistory } from 'vue-router';

import { useUserStore } from '@/stores/user.js';

import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import NotFoundView from '@/views/NotFoundView.vue';

// ===== 公开路由（无需登录即可访问）=====
// requiresAuth 未设置或为 false 时，路由守卫不拦截
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: '首页' } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录' } },
  {
    path: '/movie/:id',
    name: 'movie-detail',
    component: () => import('@/views/MovieDetailView.vue'),
    meta: { title: '电影详情' },
  },
  {
    // 选座购票页（从电影详情点击"选座购票"进来）
    // query: cinemaId / date / scheduleId(可选)
    path: '/movie/:movieId/buy',
    name: 'seat-select',
    component: () => import('@/views/SeatSelectView.vue'),
    meta: { title: '选择场次座位' },
  },
  {
    // 订单确认/支付页（下单成功后跳转）
    path: '/order/:orderId/confirm',
    name: 'order-confirm',
    component: () => import('@/views/OrderConfirmView.vue'),
    meta: { title: '确认订单', requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: '404' } },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ===== 全局前置守卫 =====
// - 未登录访问 requiresAuth 的页面 → 跳转 /login，带 redirect 参数方便登录后回跳
// - Token 已过期（被 http 拦截器清掉） → 同样跳转 /login
router.beforeEach((to) => {
  const userStore = useUserStore();
  // 每次路由切换都尝试恢复 localStorage 中的 Token（应对刷新页面场景）
  userStore.restore();

  const requiresAuth = to.meta.requiresAuth === true;

  if (requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 已登录用户访问 /login → 直接回首页（避免重复登录）
  if (to.name === 'login' && userStore.isLoggedIn) {
    return { name: 'home' };
  }

  return true;
});

// ===== 全局后置钩子：设置页面标题 =====
router.afterEach((to) => {
  const title = to.meta.title ?? 'Movie Ticker';
  document.title = `${title} - Movie Ticker`;
});

export default router;
