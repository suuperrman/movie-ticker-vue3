import { http } from '@/services/http.js';

/**
 * 用户端：场次座位图
 * GET /movie/schedule/{scheduleId}/seats
 *
 * @param {number} scheduleId
 * @returns {Promise<SeatMapVO>}
 */
export function getSeatMap(scheduleId) {
  return http.get(`/movie/schedule/${scheduleId}/seats`);
}
