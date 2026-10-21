# 第一阶段：基础架构搭建

> 完成时间：2026-10-21
> 目标：为项目建立可扩展的基础设施骨架，后续所有业务模块都在这个基础上构建。

## 本阶段交付内容

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `vite.config.js` | 修改 | 新增 `server.proxy`，将 `/api` 代理到后端 `http://localhost:8080` |
| `.env.example` | 修改 | 补充 `VITE_PROXY_TARGET` 字段，说明开发代理目标 |
| `.env` | 新增 | 本地开发环境变量，从 `.env.example` 复制 |
| `src/services/http.js` | 重写 | 完整的 Axios 实例：JWT 请求拦截 + 统一响应解包 + 401 处理 |
| `src/services/auth.js` | 新增 | Token 存取工具（get/set/remove/isLoggedIn），基于 localStorage |
| `src/stores/user.js` | 新增 | Pinia 用户 Store，管理 token、userInfo、登录态恢复与登出 |
| `src/router/index.js` | 重写 | 路由表 + `beforeEach` 全局前置守卫 + 公开路由白名单 + 页面标题 |
| `src/main.js` | 修改 | 注册 `auth:logout` 全局事件监听，401 时自动登出并跳转登录页 |
| `src/api/` | 目录 | 占位，后续阶段按业务模块存放接口封装 |
| `src/components/` | 目录 | 占位，后续阶段存放公共组件 |
| `doc/` | 目录 | 本文件夹，存放各阶段开发文档 |

## 架构设计

### 分层结构

```
┌────────────────────────────────────────────────────┐
│  Views (页面组件)   HomeView / LoginView / ...      │
├────────────────────────────────────────────────────┤
│  Router  ── beforeEach 守卫 ── userStore.isLoggedIn│
├────────────────────────────────────────────────────┤
│  Stores (Pinia)     user.js / ticket.js / ...      │
├────────────────────────────────────────────────────┤
│  Services (基础服务)  http.js / auth.js             │
├────────────────────────────────────────────────────┤
│  API 层           api/auth.js / api/movie.js / ...  │
├────────────────────────────────────────────────────┤
│  Backend            movie-ticker-master (:8080)     │
└────────────────────────────────────────────────────┘
```

### 请求流程

```
组件调用 api/movie.js → http.get()
    ↓
请求拦截器：注入 Authorization: Bearer <token>
    ↓
Vite Dev Proxy：/api/* → http://localhost:8080/*
    ↓
后端处理，返回 { code: 200, message: "success", data: {...} }
    ↓
响应拦截器：code===200 → 解包 data 返回业务层；code!==200 → throw Error
    ↓
HTTP 状态码 401 → 清除 Token → dispatchEvent('auth:logout') → 跳转 /login
```

### 登录态管理

```
localStorage (持久化)
    ↑↓ getToken() / setToken() / removeToken()
src/services/auth.js (纯工具，无状态)
    ↑↓ 被调用
src/stores/user.js (Pinia Store，应用全局状态)
    ↑↓ router.beforeEach 每次切换都 userStore.restore()
```

**为什么用 localStorage 而不是 sessionStorage？**
- 刷新页面后登录态不丢失
- 关闭浏览器后依然有效（适合用户可能跨天使用购票系统的场景）
- 如果后续需要"关闭浏览器即退出"，改成 sessionStorage 只需改 auth.js 的 TOKEN_KEY 实现

## 关键设计决策

### 1. 响应数据解包统一放在拦截器

后端返回 `{ code, message, data }` 格式是标准 REST 风格。把解包逻辑放在 Axios 响应拦截器里，业务层只关心 `data` 字段，每个 API 函数不用重复写 `res.data.data`。

### 2. 业务错误用 Error 对象抛出并附带 code

拦截器里对 `code !== 200` 的业务错误（如"座位已被占用"、"锁座超时"），用 `new Error(message)` + `err.code` 的方式抛出。业务层可以：
- `try/catch` 中读取 `err.message` 直接展示给用户
- 或根据 `err.code` 做分支处理

```js
try {
  const seats = await lockSeats(showId, seatIds);
} catch (err) {
  if (err.code === 1001) {
    // 座位已被占用 → 刷新座位图
  } else {
    ElMessage.error(err.message);
  }
}
```

### 3. 401 用 CustomEvent 解耦

http 拦截器处理 401 时只做两件事：清 Token + `dispatchEvent('auth:logout')`。它**不直接** import router 或 userStore，避免循环依赖。main.js 作为入口统一监听这个事件并执行登出 + 跳转。这样 http.js 保持纯净可测试。

### 4. 路由守卫依赖 userStore 的 restore()

每次路由切换都调用 `userStore.restore()` 从 localStorage 恢复 Token。这样即使刷新页面（Pinia 内存状态清空），守卫仍然能正确判断登录态。

### 5. 公开路由用 meta 标记，黑名单策略

默认所有路由都"不需要登录"，只有 `meta.requiresAuth: true` 的才被守卫拦截。这比白名单更安全——未来新增路由如果忘了标记，不会意外暴露受保护页面。

## 如何接入后端

### 1. 确认后端地址

默认假设后端运行在 `http://localhost:8080`，修改 `.env` 中的 `VITE_PROXY_TARGET`：

```env
VITE_PROXY_TARGET=http://localhost:8080
```

如果后端端口不同，改这一行即可，**前端所有请求路径保持 `/api/...` 不变**。

### 2. 启动开发服务器

```bash
npm run dev
# → http://localhost:5173
```

浏览器访问 `http://localhost:5173` 时，所有 `/api/*` 请求会被 Vite 代理到后端。

### 3. 验证代理是否生效

```bash
curl http://localhost:8080/api/health   # 后端健康检查接口（假设存在）
# 或浏览器访问 http://localhost:5173/api/health
```

## 本阶段未做的事（留给后续阶段）

- ❌ 登录/注册页面 UI（第二阶段）
- ❌ Pinia user store 的完整 userInfo 字段（第二阶段从后端 /auth/profile 获取）
- ❌ API 封装层 `src/api/*.js`（第二阶段开始）
- ❌ 生产环境 Nginx 配置（第七阶段部署时）
- ❌ Mock 数据（可按需引入 vitest 的 mock 或 vite-plugin-mock）

## 验证清单

- [ ] `npm run dev` 启动无报错
- [ ] 访问 `http://localhost:5173` 页面正常渲染
- [ ] `npm run build` 构建成功
- [ ] 后端启动后，浏览器 DevTools Network 中 `/api/*` 请求 200 OK
- [ ] 无 Token 时手动调用受保护接口，看到 401 后 localStorage 中的 token 被清除
