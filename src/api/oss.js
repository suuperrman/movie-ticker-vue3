import { http } from '@/services/http.js';

/**
 * 从后端获取 OSS STS 临时凭证
 * GET /oss/sts（后端需实现此接口，见 doc/oss-sts-design.md）
 *
 * 后端返回：
 * {
 *   AccessKeyId: "临时 AK",
 *   AccessKeySecret: "临时 SK",
 *   SecurityToken: "STS Token",
 *   Expiration: "2026-10-21T12:00:00Z",  // ISO 8601 过期时间
 *   bucket: "xiong-movie-ticket",
 *   region: "cn-beijing",
 *   endpoint: "https://oss-cn-beijing.aliyuncs.com",
 *   dir: "movie-ticket/"   // 允许上传的目录前缀
 * }
 *
 * @returns {Promise<StsCredentials>}
 */
export function getStsCredentials() {
  return http.get('/oss/sts');
}
