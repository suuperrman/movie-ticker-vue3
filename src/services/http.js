import axios from 'axios';

import { getToken, removeToken } from './auth.js';

const REQUEST_TIMEOUT_MS = 10000;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: REQUEST_TIMEOUT_MS,
});

// ===== 请求拦截器：自动注入 JWT Access Token =====
// 后端 TokenResponse.accessToken 在 JSON 中返回，Refresh Token 在 HttpOnly Cookie 中（无需前端处理）
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ===== 响应拦截器：解包 + 统一错误处理 =====
// 后端 Result 格式：{ success: boolean, errorMsg: string, data: T, total: Long }
http.interceptors.response.use(
  // HTTP 200 — 但后端业务可能 success=false
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success === true) {
        return body.data;
      }
      // 业务失败（success=false）：用 errorMsg 构建 Error 抛出
      const err = new Error(body.errorMsg || '请求失败');
      err.success = false;
      return Promise.reject(err);
    }
    // 非标准格式（理论上不会），原样透传
    return body;
  },
  // HTTP 错误（4xx / 5xx）
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效：清除本地登录态 + 通知全局登出
      removeToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  },
);
