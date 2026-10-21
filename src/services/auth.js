// JWT Token 在 localStorage 中的存储键名
const TOKEN_KEY = 'movie_ticker_token';

/**
 * 从 localStorage 读取 JWT Token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 将 JWT Token 写入 localStorage
 * @param {string} token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 清除 localStorage 中的 JWT Token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 判断当前是否已登录
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getToken();
}
