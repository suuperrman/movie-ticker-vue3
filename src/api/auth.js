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
 * 修改用户资料（昵称、头像）
 * PUT /api/auth/profile
 *
 * @param {Object} payload
 * @param {string} [payload.nickname]  昵称（可选）
 * @param {string} [payload.avatar]    头像 URL（可选）
 * @returns {Promise<UserInfoVO>} 更新后的用户信息
 */
export function updateProfile(payload) {
  return http.put('/auth/profile', payload);
}

/**
 * 修改密码（已登录用户）
 * POST /api/auth/change-password
 *
 * @param {Object} payload
 * @param {string} payload.oldPassword  原密码
 * @param {string} payload.newPassword  新密码
 */
export function changePassword(payload) {
  return http.post('/auth/change-password', payload);
}

/**
 * 获取活跃会话列表
 * GET /api/auth/sessions
 *
 * @returns {Promise<SessionVO[]>}
 */
export function getSessions() {
  return http.get('/auth/sessions');
}

/**
 * 强制下线某个会话
 * DELETE /api/auth/sessions/{sessionId}
 *
 * @param {string} sessionId
 */
export function revokeSession(sessionId) {
  return http.delete(`/auth/sessions/${sessionId}`);
}

/**
 * UserInfoVO 结构
 * @typedef {Object} UserInfoVO
 * @property {number} id       用户 ID
 * @property {string} phone    手机号
 * @property {string} nickname 昵称
 * @property {string} avatar   头像 URL（可为 null）
 */

/**
 * SessionVO 结构
 * @typedef {Object} SessionVO
 * @property {string} sessionId    会话 ID
 * @property {string} deviceType   设备类型
 * @property {string} ip           登录 IP
 * @property {string} location     登录地点
 * @property {string} userAgent    UA 字符串
 * @property {string} loginAt      登录时间
 * @property {string} lastActiveAt 最后活跃时间
 * @property {boolean} current     是否为当前会话
 */
