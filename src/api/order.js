import { http } from '@/services/http.js';

/**
 * 创建订单（锁座）
 * POST /order
 *
 * @param {Object} payload
 * @param {number} payload.scheduleId   场次 ID
 * @param {number[]} payload.seatIds    选中的 schedule_seat ID 列表
 * @returns {Promise<Order>} 完整订单对象（含 orderNo）
 */
export function createOrder(payload) {
  return http.post('/order', payload);
}

/**
 * 订单详情
 * GET /order/{id}
 */
export function getOrderDetail(orderId) {
  return http.get(`/order/${orderId}`);
}

/**
 * 取消订单（释放锁座）
 * POST /order/{id}/cancel
 */
export function cancelOrder(orderId) {
  return http.post(`/order/${orderId}/cancel`);
}

/**
 * 支付成功通知（锁座→已售）
 * POST /order/{id}/pay
 */
export function payOrder(orderId) {
  return http.post(`/order/${orderId}/pay`);
}

/**
 * 我的订单列表
 * GET /order/my?pageNo=1&pageSize=10
 */
export function getMyOrders(params) {
  return http.get('/order/my', { params });
}
