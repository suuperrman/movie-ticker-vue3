import { http } from '@/services/http.js';

// ===== 电影相关 API =====
// 后端 Result<T> 已被 http 拦截器解包，这里直接拿到业务数据
// 分页接口返回 MyBatis-Plus Page<T>：{ records: [...], total, current, size, pages }
// 前端读 .records 拿列表

/**
 * 正在热映（分页）
 * GET /movie/now-showing
 *
 * @param {Object} params
 * @param {number} [params.pageNo=1]
 * @param {number} [params.pageSize=10]
 * @param {string} [params.city]
 * @returns {Promise<PageResult<MovieListItemVO>>}
 */
export function getHotShowing(params = {}) {
  return http.get('/movie/now-showing', { params });
}

/**
 * 即将上映（分页）
 * GET /movie/coming-soon
 */
export function getComingShowing(params = {}) {
  return http.get('/movie/coming-soon', { params });
}

/**
 * 电影详情
 * GET /movie/{id}
 *
 * @param {number|string} id
 * @returns {Promise<MovieDetailVO>}
 */
export function getMovieDetail(id) {
  return http.get(`/movie/${id}`);
}

/**
 * 电影搜索（分页）
 * GET /movie/search
 *
 * @param {Object} params
 * @param {string} params.keyword
 * @param {number} [params.categoryId]
 * @param {number} [params.pageNo=1]
 * @param {number} [params.pageSize=10]
 */
export function searchMovies(params) {
  return http.get('/movie/search', { params });
}

/**
 * 购票入口：哪些影院有该电影场次
 * GET /movie/{id}/cinemas
 *
 * @param {number|string} movieId
 * @param {Object} [params]
 * @param {string} [params.city]
 * @param {string} [params.date]   格式 yyyy-MM-dd
 * @returns {Promise<CinemaScheduleVO[]>}
 */
export function getMovieCinemas(movieId, params = {}) {
  return http.get(`/movie/${movieId}/cinemas`, { params });
}

/**
 * 指定影院指定日期的场次列表
 * GET /movie/{id}/sessions
 *
 * @param {number|string} movieId
 * @param {Object} params
 * @param {number} params.cinemaId
 * @param {string} [params.date]   格式 yyyy-MM-dd
 * @returns {Promise<ScheduleVO[]>}
 */
export function getMovieSessions(movieId, params) {
  return http.get(`/movie/${movieId}/sessions`, { params });
}

// ===== 数据结构类型（与后端 DTO 对齐）=====

/**
 * MyBatis-Plus 分页对象（前端从 http 拦截器拿到的 data）
 * @typedef {Object} PageResult<T>
 * @property {T[]} records    当前页数据列表
 * @property {number} total    总记录数
 * @property {number} current  当前页码（从 1 开始）
 * @property {number} size     每页条数
 * @property {number} pages    总页数
 */

/**
 * MovieListItemVO — 电影列表项（热映/即将上映/搜索通用）
 * @typedef {Object} MovieListItemVO
 * @property {number} id
 * @property {string} name
 * @property {string} director
 * @property {number} duration       时长（分钟）
 * @property {string} releaseDate    上映日期 yyyy-MM-dd
 * @property {string} posterUrl      海报 URL
 * @property {number} status         1=即将上映 2=正在热映
 * @property {string} description    简介
 * @property {string} categories     分类（逗号分隔，如 "动作,科幻"）
 * @property {number} minPrice       最低票价
 * @property {number} cinemaCount    有排片的影院数量
 */

/**
 * MovieDetailVO — 电影详情
 * @typedef {Object} MovieDetailVO
 * @property {number} id
 * @property {string} name
 * @property {string} director
 * @property {number} duration
 * @property {string} releaseDate
 * @property {string} posterUrl
 * @property {string} description
 * @property {number} status
 * @property {Array<{id:number, name:string}>} categories
 * @property {Array<{id:number, name:string, avatarUrl:string, roleName:string}>} actors
 * @property {number} minPrice
 * @property {number} cinemaCount
 */

/**
 * CinemaScheduleVO — 影院 + 该电影场次聚合
 * @typedef {Object} CinemaScheduleVO
 * @property {number} cinemaId
 * @property {string} cinemaName
 * @property {string} city
 * @property {string} address
 * @property {string} phone
 * @property {number} minPrice
 * @property {string} firstScheduleTime   最早场次时间
 * @property {number} scheduleCount       场次数量
 */

/**
 * ScheduleVO — 单个放映场次
 * @typedef {Object} ScheduleVO
 * @property {number} scheduleId
 * @property {number} hallId
 * @property {string} hallName
 * @property {number} hallType       1=普通 2=IMAX 3=情侣厅
 * @property {string} startTime
 * @property {string} endTime
 * @property {number} price
 * @property {number} totalSeat
 * @property {number} availableSeat
 * @property {number} status         1=可售 0=停售
 */
