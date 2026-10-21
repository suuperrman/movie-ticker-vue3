import { http } from '@/services/http.js';

// ===== 用户认证相关 API =====
// 后端 Result<TokenResponse>：{ success, errorMsg, data: { accessToken, expiresIn, tokenType, user } }
// http 拦截器已解包 data，这里直接拿到业务字段

/**
 * 用户登录（手机号 + 密码）
 * POST /api/auth/login
 *
 * @param {Object} payload
 * @param {string} payload.phone       11 位手机号
 * @param {string} payload.password    密码
 * @param {string} [payload.captchaId] 连续失败 3 次后后端要求图形验证码
 * @param {string} [payload.captchaCode]
 * @returns {Promise<{ accessToken: string, expiresIn: number, tokenType: string, user: UserInfoVO }>}
 */
export function login(payload) {
  return http.post('/auth/login', payload);
}

/**
 * 用户注册（手机号 + 密码）
 * POST /api/auth/register
 *
 * @param {Object} payload
 * @param {string} payload.phone        11 位手机号
 * @param {string} payload.password     密码（后端校验：≥8 位，包含大小写字母和数字）
 * @param {string} [payload.nickname]   昵称（可选）
 * @param {string} [payload.captchaId]
 * @param {string} [payload.captchaCode]
 * @returns {Promise<UserInfoVO>}
 */
export function register(payload) {
  return http.post('/auth/register', payload);
}

/**
 * 获取图形验证码（连续失败 3 次后调用）
 * GET /api/auth/captcha?phone=xxx
 *
 * @param {string} phone
 * @returns {Promise<{ captchaId: string, captchaImage: string, required: boolean }>}
 */
export function getCaptcha(phone) {
  return http.get('/auth/captcha', { params: { phone } });
}

/**
 * 获取当前登录用户信息
 * GET /api/auth/me
 * 需要携带 Authorization: Bearer <accessToken>
 *
 * @returns {Promise<UserInfoVO>} 用户信息 { id, phone, nickname, avatar }
 */
export function getMe() {
  return http.get('/auth/me');
}

/**
 * 退出登录
 * POST /api/auth/logout
 * 清除后端 Token + HttpOnly Cookie 中的 Refresh Token
 */
export function logoutApi() {
  return http.post('/auth/logout');
}

/**
 * UserInfoVO 结构
 * @typedef {Object} UserInfoVO
 * @property {number} id       用户 ID
 * @property {string} phone    手机号
 * @property {string} nickname 昵称
 * @property {string} avatar   头像 URL（可为 null）
 */
