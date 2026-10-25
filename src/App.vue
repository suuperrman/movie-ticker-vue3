<script setup>
import { Film, LogOut, User } from '@lucide/vue';
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

import { useUserStore } from '@/stores/user.js';

const userStore = useUserStore();

// 应用启动时：有 Token 但无 userInfo → 自动拉取用户信息
onMounted(async () => {
  userStore.restore();
  if (userStore.isLoggedIn && !userStore.userInfo) {
    try {
      await userStore.fetchProfile();
    } catch {
      // fetchProfile 失败（如 Token 过期），userStore.fetchProfile 内部会抛出
      // 401 已由 http 拦截器 + main.js 事件监听统一处理登出 + 跳转登录页
    }
  }
});

function handleLogout() {
  userStore.logout();
  // 登出后回到首页
  window.location.href = '/';
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/" aria-label="Movie Ticker 首页">
        <span class="brand-mark"><Film :size="18" /></span>
        <span>Movie Ticker</span>
      </RouterLink>

      <nav class="user-nav" aria-label="用户导航">
        <!-- 已登录 -->
        <template v-if="userStore.isLoggedIn">
          <RouterLink class="nav-link" to="/">首页</RouterLink>
          <RouterLink class="nav-link" to="/search">搜索</RouterLink>
          <RouterLink class="nav-link" to="/orders">我的订单</RouterLink>
          <div class="user-info" role="button" tabindex="0" @click="$router.push({ name: 'profile' })" @keyup.enter="$router.push({ name: 'profile' })">
            <span class="avatar">
              <img v-if="userStore.userInfo?.avatar" :src="userStore.userInfo.avatar" class="avatar-img" alt="" />
              <template v-else-if="userStore.nickname">
                {{ userStore.nickname.charAt(0).toUpperCase() }}
              </template>
              <template v-else>
                <User :size="16" />
              </template>
            </span>
            <span>{{ userStore.nickname }}</span>
          </div>
          <button class="secondary-button" type="button" @click="handleLogout">
            <LogOut :size="16" />
            退出
          </button>
        </template>
        <!-- 未登录 -->
        <template v-else>
          <RouterLink class="nav-link" to="/">首页</RouterLink>
          <RouterLink class="nav-link" to="/search">搜索</RouterLink>
          <RouterLink class="primary-button" to="/login">登录 / 注册</RouterLink>
        </template>
      </nav>
    </header>

    <main class="page-container">
      <RouterView />
    </main>
  </div>
</template>
