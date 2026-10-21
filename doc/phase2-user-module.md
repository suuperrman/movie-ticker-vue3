# 第二阶段：用户模块（登录 / 注册）

> 完成时间：2026-10-21
> 后端源码：`C:\Users\xiao\Desktop\JavaProject\movie-ticket-master`（org.javaup.controller.AuthController）
> 前端路径：`src/api/auth.js`

## 本阶段交付清单

| 操作 | 文件 | 说明 |
| --- | --- | --- |
| ➕ 新增 | `src/api/auth.js` | 认证 API：login / register / getCaptcha / getMe / logoutApi |
| ➕ 新增 | `src/views/LoginView.vue` | 手机号登录 + 注册 双 Tab 单页面 |
| ➕ 新增 | `src/styles/auth.css` | 登录卡片、表单、导航栏用户区域样式 |
| ✏️ 修改 | `src/services/http.js` | 响应拦截器匹配真实 Result 格式 `{ success, errorMsg, data }` |
| ✏️ 修改 | `src/stores/user.js` | Token 字段名改为 `accessToken`；新增 `fetchProfile()` |
| ✏️ 修改 | `src/router/index.js` | 激活 `/login` 路由；已登录禁止访问 `/login` |
| ✏️ 修改 | `src/App.vue` | 导航栏：🎬 品牌 + 动态登录态 + onMounted 自动 fetchProfile |
| ✏️ 修改 | `src/main.js` | 引入 auth.css + 全局 auth:logout 事件监听 |

## 后端 API 契约（来自 AuthController.java + DTO 源码）

### 统一响应格式（Result\<T\>）

```json
{
  "success": true,
  "errorMsg": null,
  "data": { ... },
  "total": null
}
```

- 成功：`success=true`，`errorMsg=null`
- 失败：`success=false`，`errorMsg` 包含错误信息
- http 拦截器匹配 `body.success === true` 时解包 `data`，否则抛 `Error(body.errorMsg)`

### 登录 `POST /api/auth/login`（公开）

**请求 LoginRequestDTO：**
```json
{
  "phone": "13800138000",        // 必填，手机号
  "password": "Abc12345",        // 必填
  "captchaId": null,             // 可选，连续失败 3 次后后端要求
  "captchaCode": null            // 可选
}
```

**响应 Result\<TokenResponse\>：**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",   // Access Token（前端存 localStorage）
    "expiresIn": 7200,                // 过期时间（秒）
    "tokenType": "Bearer",
    "user": {                         // UserInfoVO
      "id": 1,
      "phone": "13800138000",
      "nickname": "小明",
      "avatar": null
    }
  }
}
```

> 关键点：Token 字段名是 `accessToken` 不是 `token`。Refresh Token 在 HttpOnly Cookie 中返回（前端无需处理）。

### 注册 `POST /api/auth/register`（公开）

**请求 RegisterFormDTO：**
```json
{
  "phone": "13800138000",          // 必填，正则 ^1[3-9]\d{9}$
  "password": "Abc12345",          // 必填，正则 ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&]{8,}$
  "nickname": null,                // 可选
  "captchaId": null,
  "captchaCode": null
}
```

### 获取当前用户 `GET /api/auth/me`（需 Access Token）

- 需要携带 `Authorization: Bearer <accessToken>`
- 路径是 `/auth/me` 不是 `/auth/profile`
- 后端通过 `UserHolder.getUser().getId()` 从 ThreadLocal 取用户（LoginInterceptor 校验后写入）

### 图形验证码 `GET /api/auth/captcha?phone=xxx`（公开）

```json
{
  "captchaId": "xxx",
  "captchaImage": "data:image/png;base64,iVBOR...",   // Base64 图片
  "required": true                                     // 连续失败 3 次后才需要
}
```

### 登出 `POST /api/auth/logout`（清除后端 Token + Cookie）

## 登录流程图

```
用户在 LoginView 填写手机号 + 密码
    ↓
前端校验：手机号正则 + 密码非空
    ↓
POST /api/auth/login { phone, password }
    ↓ http 拦截器
后端 LoginInterceptor（公开接口，跳过 Token 校验）
    ↓
AuthService.login → 返回 TokenResponse { accessToken, user }
    ↓ http 拦截器
Result 解包：success=true → 返回 data
    ↓ 业务层
userStore.login(data.accessToken, data.user)
    ↓
localStorage.setItem('movie_ticker_token', accessToken)
Pinia state.accessToken = accessToken
Pinia state.userInfo = user
    ↓
router.replace(route.query.redirect || '/')
    ↓
App.vue 导航栏从 userStore 读取 → 显示昵称 + 登出按钮
```

## 刷新恢复登录态

```
浏览器 F5 → Pinia 内存丢失
    ↓
App.vue onMounted:
    userStore.restore()     // localStorage → state.accessToken
    if (有 token && 无 userInfo)
        await userStore.fetchProfile()   // GET /auth/me
    ↓
成功 → userStore.userInfo 被填充 → 导航栏显示昵称 ✓
401  → http 拦截器清 token + dispatchEvent('auth:logout')
       → main.js 监听 → userStore.logout() → router.push('/login')
```

## 前端校验规则（与后端保持一致）

| 字段 | 前端正则 | 后端正则（一致） |
| --- | --- | --- |
| phone | `^1[3-9]\d{9}$` | `@Pattern(regexp = "^1[3-9]\\d{9}$")` |
| password | 注册：后端正则；登录：非空 | `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&]{8,}$` |
| confirmPassword | 必须与 password 相等 | 前端校验（后端无此字段） |

前端校验只做拦截，**最终正确性以后端校验返回的 errorMsg 为准**。

## 验证码机制（暂未实现）

后端逻辑：登录/注册连续失败 3 次后必须携带图形验证码。验证码接口已封装在 `src/api/auth.js` 的 `getCaptcha(phone)` 中。
后续需要实现时：
1. 登录失败 3 次后前端调 `getCaptcha(phone)`
2. 把 `captchaId` / `captchaCode` 加入 login/register 请求
3. 在 LoginView 加验证码图片 + 输入框 UI

## 本阶段未做的事

- ❌ 图形验证码 UI（后端有接口，但连续失败才需要，先跳过）
- ❌ 找回密码 / 修改密码（后端有 `/auth/forgot-password`、`/auth/change-password`，前端后续接）
- ❌ Refresh Token 自动刷新（后端通过 HttpOnly Cookie 返回，前端暂不处理；Access Token 过期直接跳登录）
- ❌ 登出调后端（`logoutApi()` 已封装但未调用，目前只清前端状态）

## 验证清单

- [x] `npm run build` 构建成功
- [x] `npm run test` 5 个测试通过
- [ ] 后端启动后，输入 `13800138000` + 合法密码 → 登录成功 → 导航栏显示昵称
- [ ] 注册新手机号（符合正则）+ 强密码 → 注册成功 → 自动切回登录 Tab 预填手机号
- [ ] 手机号格式错误 → 前端红字提示"手机号格式不正确"
- [ ] 密码弱 → 注册页红字提示"密码至少 8 位，需包含大小写字母和数字"
- [ ] 登录后 F5 → 导航栏仍显示昵称（`fetchProfile` 生效）
- [ ] Token 过期（手动改 localStorage）→ 访问受保护接口 → 401 → 自动清 token + 跳 `/login`
