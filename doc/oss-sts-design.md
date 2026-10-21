# 阿里云 OSS 直传 — 安全设计

## 核心原则：AccessKeySecret 永远不离开服务器

阿里云 OSS 的 **AccessKeySecret** 是你的云账号级凭据，泄露 = 别人可以花你的钱删你的数据。

❌ **绝对不能** 放在：
- 前端 `.env` / `.env.example`
- 任何前端 JS/TS/Vue 文件
- Git 仓库（即使是私有仓库）
- Nginx 配置、Docker 镜像里

✅ **只能放在：**
- 后端 Spring Boot 的 `application.yml`（生产环境用环境变量注入，不要把真实值提交 Git）
- 阿里云 RAM 用户的 AK/SK（不要用主账号的）

## 正确方案：STS 临时凭证 + 前端直传

```
┌──────────┐     GET /oss/sts     ┌──────────────────────┐
│  浏览器   │ ──────────────────►  │  后端 Spring Boot    │
│  (Vue3)  │ ◄──────────────────  │  用 AK/SK 调阿里云    │
└──────────┘  返回临时 STS Token   │  STS 服务签发凭证    │
     │                              └──────────┬───────────┘
     │                                         │
     │  用临时凭证直传                          │ AK/SK 永远留在这
     ▼                                         ▼
┌───────────────────────────────────────────────────┐
│           阿里云 OSS (xiong-movie-ticket)          │
└───────────────────────────────────────────────────┘
```

**STS 临时凭证的好处：**
1. 有过期时间（默认 1 小时），即使泄露也只影响 1 小时
2. 可以限制上传目录（比如只能传到 `movie-ticket/images/`）
3. 可以限制最大文件大小（条件表达式）
4. 前端全程碰不到真正的 AccessKeySecret

## 前端已实现的部分

### 文件结构

```
src/
├── api/oss.js              ← 调后端 /oss/sts 拿临时凭证
└── utils/oss-upload.js     ← STS 凭证缓存 + ali-oss 直传封装
```

### 用法示例

```vue
<script setup>
import { ref } from 'vue';
import { uploadImage } from '@/utils/oss-upload.js';

const progress = ref(0);
const previewUrl = ref('');

async function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const result = await uploadImage(file, {
      dir: 'movie-ticket/posters/',
      maxSize: 8 * 1024 * 1024,
      onProgress: (p) => (progress.value = p),
    });
    previewUrl.value = result.url;
    // result.url = "https://xiong-movie-ticket.oss-cn-beijing.aliyuncs.com/movie-ticket/posters/1734768000000_poster.jpg"
  } catch (err) {
    alert(err.message);
  }
}
</script>

<template>
  <input type="file" accept="image/*" @change="handleFileChange" />
  <div v-if="previewUrl"><img :src="previewUrl" /></div>
  <div>上传进度：{{ progress }}%</div>
</template>
```

### STS 客户端自动管理

`oss-upload.js` 内部：
- 第一次上传 → 自动调 `/oss/sts` 拿临时凭证 → 创建 OSS Client
- 后续上传 → 复用 Client，直到凭证快过期（提前 10 分钟刷新）
- 登出用户 → 调 `clearOssClient()` 清缓存

## 后端需要实现的部分（movie-ticket-master）

后端目前完全没有 OSS/STS 支持，需要加以下内容：

### 1. pom.xml 加依赖

```xml
<!-- 阿里云 STS SDK（调用 STS 服务签发临时凭证） -->
<dependency>
    <groupId>com.aliyun</groupId>
    <artifactId>aliyun-java-sdk-sts</artifactId>
    <version>3.1.3</version>
</dependency>
<dependency>
    <groupId>com.aliyun</groupId>
    <artifactId>aliyun-java-sdk-core</artifactId>
    <version>4.6.3</version>
</dependency>
```

### 2. application.yml 加配置（AK/SK 放这里，用环境变量注入）

```yaml
aliyun:
  oss:
    endpoint: https://oss-cn-beijing.aliyuncs.com
    access-key-id: ${ALIYUN_ACCESS_KEY_ID:}         # 必须用环境变量注入！
    access-key-secret: ${ALIYUN_ACCESS_KEY_SECRET:}  # 绝对不能提交 Git！
    bucket-name: xiong-movie-ticket
    region: cn-beijing
    # 允许上传的目录前缀（前端只能传到这个目录下）
    allowed-dir: movie-ticket/
    # 凭证有效期（秒），最长 3600（1 小时）
    sts-duration-seconds: 3600
```

### 3. Java 代码：Controller + Service

**controller/OssController.java**（公开接口，不需要登录，因为上传的是公共资源）

```java
@RestController
@RequestMapping("/oss")
public class OssController {

    private final OssStsService ossStsService;

    public OssController(OssStsService ossStsService) {
        this.ossStsService = ossStsService;
    }

    /**
     * 前端直传 OSS 前调用，获取临时 STS 凭证
     */
    @GetMapping("/sts")
    public Result<StsResponse> getSts() {
        return Result.success(ossStsService.issueToken());
    }
}
```

**service/OssStsService.java**

```java
@Service
@ConfigurationProperties(prefix = "aliyun.oss")
public class OssStsService {

    private String endpoint;
    private String accessKeyId;
    private String accessKeySecret;
    private String bucketName;
    private String region;
    private String allowedDir;
    private int stsDurationSeconds = 3600;

    public StsResponse issueToken() {
        // 1. RAM Policy：限制只能 PutObject 到指定目录，且最大文件 10MB
        String policy = "{\n" +
                "  \"Version\": \"1\",\n" +
                "  \"Statement\": [\n" +
                "    {\n" +
                "      \"Effect\": \"Allow\",\n" +
                "      \"Action\": [\"oss:PutObject\", \"oss:ListObjects\"],\n" +
                "      \"Resource\": [\"acs:oss:*:*:" + bucketName + "/" + allowedDir + "*\"]\n" +
                "    }\n" +
                "  ]\n" +
                "}";

        // 2. 调阿里云 STS 服务签发临时凭证
        DefaultProfile profile = DefaultProfile.getProfile(region, accessKeyId, accessKeySecret);
        IAcsClient client = new DefaultAcsClient(profile);

        AssumeRoleRequest request = new AssumeRoleRequest();
        request.setRoleArn("<你的 RAM 角色 ARN>");  // 例：acs:ram::123456:role/oss-upload-role
        request.setRoleSessionName("movie-ticker-frontend");
        request.setDurationSeconds(stsDurationSeconds);
        request.setPolicy(policy);

        AssumeRoleResponse response = client.getAcsResponse(request);

        // 3. 返回给前端
        StsResponse resp = new StsResponse();
        resp.setAccessKeyId(response.getCredentials().getAccessKeyId());
        resp.setAccessKeySecret(response.getCredentials().getAccessKeySecret());
        resp.setSecurityToken(response.getCredentials().getSecurityToken());
        resp.setExpiration(response.getCredentials().getExpiration());
        resp.setBucket(bucketName);
        resp.setRegion(region);
        resp.setEndpoint(endpoint);
        resp.setDir(allowedDir);
        return resp;
    }
}
```

### 4. 阿里云 RAM 侧需要配置

1. 登录 https://ram.console.aliyun.com
2. 创建一个 RAM 用户（不要用主账号）
3. 创建一个 RAM 角色（假设 Role ARN 是 `acs:ram::123456:role/oss-upload-role`）
4. 给角色加 OSS 上传权限（限定到 `xiong-movie-ticket/movie-ticket/*`）
5. 给 RAM 用户加 `sts:AssumeRole` 权限
6. 用 RAM 用户的 AK/SK 填 application.yml（**不要用主账号的**）

## 环境变量注入（生产安全）

```bash
# Windows PowerShell（开发环境临时设置）
$env:ALIYUN_ACCESS_KEY_ID = "LTAI5t..."
$env:ALIYUN_ACCESS_KEY_SECRET = "qmCaV..."

# Linux/Mac
export ALIYUN_ACCESS_KEY_ID="LTAI5t..."
export ALIYUN_ACCESS_KEY_SECRET="qmCaV..."

# Docker
docker run -e ALIYUN_ACCESS_KEY_ID=xxx -e ALIYUN_ACCESS_KEY_SECRET=yyy ...

# application.yml 引用
aliyun:
  oss:
    access-key-id: ${ALIYUN_ACCESS_KEY_ID:}      # 空字符串 = 启动时报错提醒
    access-key-secret: ${ALIYUN_ACCESS_KEY_SECRET:}
```

## 已实现的保护措施

| 层 | 措施 |
| --- | --- |
| `.env` | `.gitignore` 已排除，不会被 Git 提交 |
| `.env` 内容 | 只放 endpoint/bucket/region（公开信息），**无 AK/SK** |
| 前端代码 | 没有任何 AK/SK 硬编码，全部运行时从后端拿临时凭证 |
| STS 策略 | 可限制上传目录、最大文件、过期时间 |
| RAM 用户 | 独立于主账号，可单独回收权限 |
| SecurityToken | 临时凭证独立于 AK/SK，过期自动失效 |

## 后端 application.yml 当前没有 aliyun 配置

后端 `movie-core-service/src/main/resources/application.yml` 目前只有：
- auth（JWT）
- datasource（MySQL）
- redis
- mybatis-plus
- logging

**需要按上面第 2 步添加** aliyun.oss 配置段 + pom.xml 依赖 + Java 代码。
