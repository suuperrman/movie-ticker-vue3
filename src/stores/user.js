import { defineStore } from 'pinia';

import { getToken, removeToken, setToken } from '@/services/auth.js';

// 用户状态集中管理登录态、Token 和基本信息，与 services/auth.js 配合完成持久化
export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: null, // { id, username, nickname, avatar }
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    nickname: (state) => state.userInfo?.nickname ?? state.userInfo?.username ?? '',
  },

  actions: {
    // 登录成功后写入 Token 和用户信息
    login(token, userInfo) {
      setToken(token);
      this.token = token;
      this.userInfo = userInfo;
    },

    // 应用启动时恢复已有登录态（Token 在 localStorage）
    restore() {
      this.token = getToken();
    },

    // 退出登录 / 401 鉴权失效时清理
    logout() {
      removeToken();
      this.token = null;
      this.userInfo = null;
    },

    // 更新用户信息（如个人资料修改后）
    updateUserInfo(info) {
      this.userInfo = { ...this.userInfo, ...info };
    },
  },
});
