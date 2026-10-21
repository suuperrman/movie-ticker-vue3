# Movie Ticker Vue3

电影院抢票系统前端项目，基于 Vue 3 + Vite 构建，对接后端 `movie-ticker-master` 服务。

## 技术栈

| 类别 | 技术 | 版本 |
| --- | --- | --- |
| 框架 | Vue | 3.5 |
| 构建工具 | Vite | 6.4 |
| 路由 | Vue Router | 4.6 |
| 状态管理 | Pinia | 2.3 |
| HTTP 客户端 | Axios | 1.19 |
| UI 图标 | Lucide Vue | 1.31 |
| 单元测试 | Vitest | 3.2 |
| 代码规范 | Prettier | 3.6 |

## 项目目录结构（规划）

```
movie-ticker-vue3/
├── src/
│   ├── api/                # 接口请求封装
│   │   ├── auth.js         # 登录、注册、用户信息
│   │   ├── movie.js        # 电影列表、详情
│   │   ├── schedule.js     # 排片、场次
│   │   ├── order.js        # 下单、锁座、支付、查询
│   │   └── hall.js         # 影厅座位图
│   ├── components/         # 公共组件
│   │   ├── SeatPicker.vue  # 选座组件
│   │   ├── Countdown.vue   # 倒计时组件
│   │   └── LoadingSpin.vue # 加载组件
│   ├── router/             # 路由配置
│   │   └── index.js
│   ├── services/           # 基础服务层
│   │   ├── http.js         # Axios 实例（已存在）
│   │   └── auth.js         # Token 存取、拦截器
│   ├── stores/             # Pinia 状态
│   │   ├── user.js         # 用户登录态
│   │   ├── ticket.js       # 抢票会话、锁座状态
│   │   └── order.js        # 当前订单
│   ├── styles/             # 全局样式
│   ├── views/              # 页面视图
│   │   ├── HomeView.vue        # 首页（正在上映、即将上映）
│   │   ├── LoginView.vue       # 登录/注册
│   │   ├── MovieDetailView.vue # 电影详情 + 排片列表
│   │   ├── ScheduleView.vue    # 场次选择
│   │   ├── SeatView.vue        # 选座页（核心抢票页面）
│   │   ├── OrderConfirmView.vue# 订单确认
│   │   ├── MyOrderView.vue     # 我的订单
│   │   └── NotFoundView.vue
│   ├── App.vue
│   └── main.js
├── .env.example
├── vite.config.js
└── package.json
```

## 开发步骤

### 第一阶段：基础架构搭建

**目标**：让项目具备完整的骨架和开发基础设施。

1. **配置 Vite 代理** — 在 `vite.config.js` 添加 `server.proxy`，将 `/api` 代理到后端 `http://localhost:8080`
2. **封装 HTTP 服务** — 扩展 `src/services/http.js`，在拦截器中注入 JWT Token、处理 401 跳转登录
3. **添加路由守卫** — 在 `src/router/index.js` 中添加全局前置守卫，未登录用户访问受保护页面时跳转登录
4. **创建 .env 环境变量** — 复制 `.env.example` 为 `.env`，确认 `VITE_API_BASE_URL` 与后端实际地址一致

**产出**：项目能发起带鉴权的 API 请求，路由具备权限控制能力。

---

### 第二阶段：用户模块（登录/注册）

**目标**：打通用户身份体系，为抢票流程提供登录态。

1. **创建 `stores/user.js`** — 使用 Pinia 管理用户信息、Token、登录状态
2. **实现 `api/auth.js`** — 封装登录、注册、获取用户信息、登出接口
3. **开发 `LoginView.vue`** — 表单校验（手机号/密码）、登录后 Token 持久化到 localStorage
4. **开发导航栏组件** — 展示登录状态，未登录显示"登录"按钮，已登录显示用户名和"我的订单"入口

**关键**：Token 存储在 Pinia + localStorage 中，刷新页面时自动恢复登录态。

---

### 第三阶段：电影浏览模块

**目标**：让用户能浏览正在上映的电影并查看排片。

1. **实现 `api/movie.js`** — 电影列表（正在上映/即将上映）、电影详情接口
2. **实现 `api/schedule.js`** — 根据电影 ID 查询排片场次接口
3. **改造 `HomeView.vue`** — Tab 切换"正在上映"和"即将上映"，电影卡片网格布局
4. **开发 `MovieDetailView.vue`** — 电影海报、简介、评分、排片日期筛选
5. **开发 `ScheduleView.vue`** — 场次时间列表，点击进入选座

**产出**：用户登录后可以浏览电影 → 查看排片 → 选择场次。

---

### 第四阶段：抢票核心模块（选座 + 锁座）

**目标**：实现抢票最核心的交互：选座 → 锁座倒计时 → 提交订单。

1. **实现 `api/hall.js`** — 获取影厅座位图接口（座位状态：可选/已占/已锁）
2. **开发 `SeatPicker.vue` 组件**
   - 座位图渲染（多排多列、 aisle 通道、 handicap 无障碍位）
   - 点击切换选中状态，限制最多选 5 张
   - 选满后高亮确认按钮
3. **开发 `SeatView.vue` 页面**
   - 调座位图接口渲染影厅
   - 选中座位后调"锁座"接口进入 15 分钟倒计时
   - 倒计时结束自动释放座位（轮询后端状态）
4. **创建 `stores/ticket.js`** — 管理当前场次、已选座位、锁座状态、倒计时

**抢票前端策略**：
- 选座按钮防连点（防抖 300ms）
- 锁座成功后倒计时期间禁用选座操作
- 每 10 秒轮询一次座位状态（其他用户可能抢占）
- 锁座到期自动跳转回场次选择页并提示
- 网络异常时本地缓存已选座位，恢复后尝试重新锁座

---

### 第五阶段：订单与支付

**目标**：完成下单 → 支付模拟 → 订单查询闭环。

1. **实现 `api/order.js`** — 创建订单、模拟支付、订单列表、订单详情接口
2. **开发 `OrderConfirmView.vue`** — 确认电影/场次/座位/价格，提交订单
3. **开发 `MyOrderView.vue`** — 订单列表（Tab 切换：待支付/已完成/已取消）、订单详情
4. **创建 `stores/order.js`** — 当前订单信息、支付状态

**抢票高并发处理**：
- 提交订单按钮点击后立即置为 disabled，防止重复提交
- 订单提交采用异步等待 + 进度提示，不阻塞 UI
- 支付超时自动取消订单并释放座位

---

### 第六阶段：打磨与优化

1. **全局错误处理** — Axios 响应拦截器中统一处理业务错误码（如锁座失败、座位已被占用），弹出友好提示
2. **骨架屏 / 加载状态** — 电影列表、座位图等耗时页面添加 loading 态
3. **404 / 空状态** — 电影列表为空、订单列表为空时展示引导图
4. **表单校验** — 登录、注册、购票数量等输入校验
5. **响应式适配** — 手机端选座需要横向滚动，桌面端完整展示

---

### 第七阶段：测试与部署

1. **单元测试** — 为 Pinia Store 和关键工具函数编写 Vitest 测试
2. **构建验证** — `npm run build` 确保无编译错误，产物大小合理
3. **后端联调** — 使用 Postman/Apifox 先验证后端接口，再对接前端
4. **生产部署** — 构建产物部署到 Nginx，配置反向代理 `/api` 到后端服务

## 后端接口对接说明

> 当前项目依赖后端 `movie-ticker-master` 提供 RESTful API。以下为通用接口约定，**具体字段和路径以实际后端 API 文档为准**。

### 接口规范（预期）

| 模块 | 方法 | 路径（示例） | 说明 |
| --- | --- | --- | --- |
| 认证 | POST | `/api/auth/login` | 登录，返回 JWT |
| 认证 | POST | `/api/auth/register` | 注册 |
| 认证 | GET | `/api/auth/profile` | 获取当前用户信息 |
| 电影 | GET | `/api/movies` | 电影列表 |
| 电影 | GET | `/api/movies/{id}` | 电影详情 |
| 排片 | GET | `/api/schedules?movieId=xxx` | 场次排片 |
| 影厅 | GET | `/api/halls/{hallId}/seats` | 座位图及状态 |
| 订单 | POST | `/api/orders/lock` | 锁座（核心） |
| 订单 | POST | `/api/orders` | 创建订单 |
| 订单 | POST | `/api/orders/{id}/pay` | 模拟支付 |
| 订单 | GET | `/api/orders` | 我的订单列表 |
| 订单 | GET | `/api/orders/{id}` | 订单详情 |

### 响应格式（预期）

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

### 鉴权方式

所有需要登录的接口在请求头中携带：

```
Authorization: Bearer <jwt_token>
```

---

## 本地启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 确认 VITE_API_BASE_URL 指向后端服务

# 3. 启动开发服务器（http://localhost:5173）
npm run dev

# 4. 构建生产版本
npm run build

# 5. 预览生产构建
npm run preview
```

## 可用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run test` | 运行单元测试 |
| `npm run format` | Prettier 格式化 |
| `npm run format:check` | 检查代码格式 |

## 注意事项

- **抢票场景高并发**：前端只能做限流和防抖，最终一致性依赖后端 Redis + 分布式锁 + 事务保证
- **锁座超时**：后端锁座超时通常是 10~15 分钟，前端倒计时与之对齐，超时后及时释放
- **Vite 代理**：开发环境通过 `server.proxy` 绕过浏览器 CORS 限制，生产环境由 Nginx 处理
- **Node 版本**：要求 Node >= 18，当前环境 v22.14.0 兼容
