import OSS from 'ali-oss';

import { getStsCredentials } from '@/api/oss.js';

// 非敏感配置从 .env 读（公开信息）
const OSS_ENDPOINT = import.meta.env.VITE_OSS_ENDPOINT;
const OSS_BUCKET = import.meta.env.VITE_OSS_BUCKET;
const OSS_REGION = import.meta.env.VITE_OSS_REGION;

// ===== STS 临时凭证缓存（避免每次上传都调后端）=====
let cachedClient = null;
let cachedExpiration = 0;

/**
 * 获取（或刷新）带 STS 临时凭证的 aliyun-oss Client
 * 内部处理：10 分钟过期自动刷新、多次并发调用只调一次后端
 */
async function getOssClient() {
  // 如果缓存还剩 >10 分钟有效期，复用
  if (cachedClient && Date.now() < cachedExpiration - 10 * 60 * 1000) {
    return cachedClient;
  }

  const sts = await getStsCredentials();

  cachedClient = new OSS({
    region: sts.region || OSS_REGION,
    accessKeyId: sts.AccessKeyId,
    accessKeySecret: sts.AccessKeySecret,
    stsToken: sts.SecurityToken,
    bucket: sts.bucket || OSS_BUCKET,
    endpoint: sts.endpoint || OSS_ENDPOINT,
    secure: true,
  });

  // Expiration 是 ISO 8601 字符串，转时间戳
  cachedExpiration = new Date(sts.Expiration).getTime();
  return cachedClient;
}

/**
 * 上传文件到 OSS（直传，不经过后端）
 *
 * @param {File} file            浏览器 <input type="file"> 拿到的 File 对象
 * @param {Object} [options]
 * @param {string} [options.dir]           上传目录前缀，默认用后端 STS 返回的 dir
 * @param {string} [options.filename]      自定义文件名（不传则用原文件名 + 时间戳避免重名）
 * @param {Function} [options.onProgress]  进度回调 (percentage: number) => void
 * @returns {Promise<UploadResult>}
 */
export async function uploadFile(file, options = {}) {
  const client = await getOssClient();

  // 生成唯一文件名：时间戳_原文件名（保留扩展名）
  const timestamp = Date.now();
  const safeName = (options.filename || file.name).replace(/[^\w.\-]/g, '_');
  const objectKey = `${options.dir || 'movie-ticket/'}${timestamp}_${safeName}`;

  const result = await client.put(objectKey, file, {
    progress: (p, checkpoint) => {
      options.onProgress?.(Math.round(p * 100), checkpoint);
    },
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  return {
    objectKey,
    url: result.url, // 即 https://xiong-movie-ticket.oss-cn-beijing.aliyuncs.com/movie-ticket/xxx
    name: file.name,
    size: file.size,
  };
}

/**
 * 上传图片（带格式校验 + 压缩提示）
 * @param {File} file
 * @param {Object} [options]
 */
export async function uploadImage(file, options = {}) {
  const allowTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowTypes.includes(file.type)) {
    throw new Error('仅支持 JPG / PNG / WEBP / GIF 格式');
  }
  const maxSize = options.maxSize ?? 5 * 1024 * 1024; // 默认 5MB
  if (file.size > maxSize) {
    throw new Error(`图片大小不能超过 ${maxSize / 1024 / 1024}MB`);
  }
  return uploadFile(file, { dir: 'movie-ticket/images/', ...options });
}

/**
 * 清除缓存的 STS 凭证（登出或切换用户时调用）
 */
export function clearOssClient() {
  cachedClient = null;
  cachedExpiration = 0;
}

/**
 * @typedef {Object} StsCredentials
 * @property {string} AccessKeyId
 * @property {string} AccessKeySecret
 * @property {string} SecurityToken
 * @property {string} Expiration       ISO 8601 时间
 * @property {string} bucket
 * @property {string} region
 * @property {string} endpoint
 */

/**
 * @typedef {Object} UploadResult
 * @property {string} objectKey  OSS 对象路径
 * @property {string} url        完整访问 URL
 * @property {string} name       原文件名
 * @property {number} size       文件大小（字节）
 */
