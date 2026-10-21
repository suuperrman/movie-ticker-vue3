import axios from 'axios';

import { getToken, removeToken } from './auth.js';

const REQUEST_TIMEOUT_MS = 10000;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: REQUEST_TIMEOUT_MS,
});

// ===== 请求拦截器：自动注入 JWT =====
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

// ===== 响应拦截器：解包数据 + 处理鉴权失效 =====
http.interceptors.response.use(
  // 成功：后端统一返回 { code, message, data }，解包 data 交给业务层
  (response) => {
    const body = response.data;
    // 如果后端返回标准格式 { code, message, data }，且 code === 200，直接返回 data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 200) {
        return body.data;
      }
      // 业务错误码：抛出带有 message 的 Error，由业务层决定展示
      const err = new Error(body.message || `请求失败 (code: ${body.code})`);
      err.code = body.code;
      err.data = body.data;
      return Promise.reject(err);
    }
    // 非标准格式（如直接返回字符串），原样透传
    return body;
  },
  // HTTP 错误（4xx / 5xx）
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效：清除本地登录态并触发全局登出事件
      removeToken();
      // 通过 CustomEvent 通知路由守卫或其他模块跳转登录
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  },
);
