import { defineStore } from 'pinia';

import { getMe } from '@/api/auth.js';
import { getToken, removeToken, setToken } from '@/services/auth.js';

// 用户状态集中管理登录态、Access Token 和基本信息
// 与 services/auth.js（Token 持久化）配合完成登录态全生命周期
export const useUserStore = defineStore('user', {
  state: () => ({
    accessToken: getToken(),
    userInfo: null, // UserInfoVO: { id, phone, nickname, avatar }
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken,
    nickname: (state) => state.userInfo?.nickname ?? '',
    phone: (state) => state.userInfo?.phone ?? '',
  },

  actions: {
    /**
     * 登录成功后写入 Access Token 和用户信息
     * 对应后端 TokenResponse：{ accessToken, user }
     */
    login(accessToken, userInfo) {
      setToken(accessToken);
      this.accessToken = accessToken;
      this.userInfo = userInfo;
    },

    /**
     * 应用启动时恢复 localStorage 中的 Access Token
     * 刷新页面后 Pinia 内存丢失，但 Token 持久化在 localStorage
     */
    restore() {
      this.accessToken = getToken();
    },

    /**
     * 从后端拉取当前用户信息
     * 场景：刷新页面后有 Token 但无 userInfo
     */
    async fetchProfile() {
      const data = await getMe();
      this.userInfo = data;
      return data;
    },

    /**
     * 退出登录 / 401 鉴权失效
     */
    logout() {
      removeToken();
      this.accessToken = null;
      this.userInfo = null;
    },

    /**
     * 更新用户信息
     */
    updateUserInfo(info) {
      this.userInfo = { ...this.userInfo, ...info };
    },
  },
});
