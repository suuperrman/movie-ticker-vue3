# 第三阶段：电影浏览模块

> 完成时间：2026-10-21
> 后端源码：`movie-ticket-master/movie-core-service/.../controller/MovieController.java`

## 本阶段交付清单

| 操作 | 文件 | 说明 |
| --- | --- | --- |
| ➕ 新增 | `src/api/movie.js` | 6 个接口封装 + JSDoc 类型注解 |
| ➕ 新增 | `src/views/MovieDetailView.vue` | 电影详情页（海报、信息、演员、影院列表） |
| ✏️ 重写 | `src/views/HomeView.vue` | 首页 Tab 切换热映/即将上映 + 电影卡片网格 + 分页 |
| ✏️ 修改 | `src/router/index.js` | 新增 `/movie/:id` 动态路由 |

## 后端 API 契约（来自 MovieController.java + DTO）

统一响应 `Result<T>`：`{ success: boolean, errorMsg: string, data: T, total: Long }`
分页参数继承 `BasePageQuery`：`pageNo`（默认 1）、`pageSize`（默认 10）
分页返回 `Page<T>`（MyBatis-Plus）：`{ records: T[], total, current, size, pages }`

### 1. 正在热映 `GET /movie/hot-showing`

```
Query params: pageNo, pageSize, city(可选)
Returns: Page<MovieListItemVO>
```

### 2. 即将上映 `GET /movie/coming-showing`

```
Query params: pageNo, pageSize, city(可选)
Returns: Page<MovieListItemVO>
```

### 3. 电影详情 `GET /movie/{id}`

```
Path: id=Long
Returns: MovieDetailVO
```

### 4. 搜索 `GET /movie/search`

```
Query params: keyword, categoryId(可选), pageNo, pageSize
Returns: Page<MovieListItemVO>
```

### 5. 购票入口-影院列表 `GET /movie/{id}/cinemas`

```
Query params: city(可选), date(可选, yyyy-MM-dd)
Returns: CinemaScheduleVO[]
```

### 6. 指定影院场次 `GET /movie/{id}/sessions`

```
Query params: cinemaId(必填), date(可选, yyyy-MM-dd)
Returns: ScheduleVO[]
```

### DTO 字段对照

**MovieListItemVO**（列表/搜索通用）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Long | 电影 ID |
| name | String | 片名 |
| director | String | 导演 |
| duration | Integer | 时长（分钟） |
| releaseDate | String | 上映日期 yyyy-MM-dd |
| posterUrl | String | 海报 URL |
| status | Integer | 1=即将上映 2=正在热映 |
| description | String | 简介 |
| categories | String | 分类（逗号分隔） |
| minPrice | BigDecimal | 最低票价 |
| cinemaCount | Integer | 有排片的影院数量 |

**MovieDetailVO**（详情）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id, name, director, duration, releaseDate, posterUrl, description, status | 同列表 | |
| categories | List\<CategoryItem\> | `{ id, name }` 对象列表（注意：列表页是逗号分隔 String！） |
| actors | List\<ActorItem\> | `{ id, name, avatarUrl, roleName }` |
| minPrice | BigDecimal | 最低票价 |
| cinemaCount | Integer | 影院数量 |

**CinemaScheduleVO**（影院聚合）
| 字段 | 类型 |
| --- | --- |
| cinemaId | Long |
| cinemaName | String |
| city | String |
| address | String |
| phone | String |
| minPrice | BigDecimal |
| firstScheduleTime | String |
| scheduleCount | Integer |

**ScheduleVO**（单场次）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| scheduleId | Long | |
| hallId | Long | |
| hallName | String | |
| hallType | Integer | 1=普通 2=IMAX 3=情侣厅 |
| startTime | String | |
| endTime | String | |
| price | BigDecimal | |
| totalSeat | Integer | |
| availableSeat | Integer | |
| status | Integer | 1=可售 0=停售 |

## 前端调用示例

### 列表分页

```js
import { getHotShowing } from '@/api/movie.js';

const page = await getHotShowing({ pageNo: 1, pageSize: 10 });
console.log(page.records); // MovieListItemVO[]  — 当前页数据
console.log(page.pages);   // 总页数
console.log(page.total);   // 总记录数
```

### 详情 + 影院列表并行加载

```js
const [detail, cinemas] = await Promise.all([
  getMovieDetail(movieId),
  getMovieCinemas(movieId),
]);
```

## 关键设计决策

### 1. 分页接口返回 MyBatis-Plus Page 对象

后端 `MovieListQuery extends BasePageQuery`，Controller 参数直接绑定 query string。`Page<T>` 序列化后是 `{ records, total, current, size, pages }`，前端读 `.records` 拿列表。http 拦截器只做 Result 的解包，Page 对象原样透传给业务层。

### 2. categories 在列表是 String，在详情是 List

`MovieListItemVO.categories` 是 `String`（逗号分隔，如 `"动作,科幻"`），但 `MovieDetailVO.categories` 是 `List<CategoryItem>`（`[{id, name}]`）。两个页面分别用不同的渲染方式：
- HomeView：直接 `{{ m.categories }}`
- DetailView：`v-for="c in detail.categories"`

### 3. 场次接口也放在 movie.js

后端路径 `/movie/{id}/sessions` 属于电影模块的子资源，放在同一个 API 文件里更内聚，不需要单独拆 schedule.js。

### 4. 详情页两个接口并行调用

`getMovieDetail` 和 `getMovieCinemas` 没有依赖关系，用 `Promise.all` 并行发起，减少首屏等待。其中影院列表允许失败（catch 后设为空数组），不影响详情主内容展示。

### 5. 影院列表的"选座购票"按钮只跳回 movie 页带 cinema 参数

第三阶段还没开发选座页，所以详情页的购票按钮只带 `?cinema=xxx` 参数跳回当前 movie 页面占位，等第四阶段选座页实现后改跳 `/schedule?cinemaId=xxx`。

## 页面导航

```
首页 /
├── Tab: 正在热映 / 即将上映
├── 电影卡片网格（4 列）
│   └── RouterLink → /movie/:id
└── 分页器

详情页 /movie/:id
├── 海报 + 基本信息（分类 Tag、时长、上映日期、最低票价）
├── 演员列表（头像 + 姓名 + 饰演角色）
└── 影院场次列表（名称/地址/电话/最低票价/场次数量 + 选座购票按钮）
```

## 本阶段未做的事

- ❌ 电影搜索页面（后端有 `/movie/search` 接口，首页暂未加搜索框）
- ❌ 选座购票页（第四阶段）
- ❌ 场次切换逻辑（详情页只展示影院列表，还没点击展开场次）
- ❌ 空骨架屏（用简单 loading 代替）
- ❌ 海报图片 CDN 占位图处理（暂用 emoji 🎬 或渐变背景）

## 验证清单

- [x] `npm run build` 构建成功
- [x] `npm run test` 测试通过
- [ ] 后端启动后，访问 `/` → Tab 切换热映/即将上映 → 能看到电影卡片
- [ ] 点击卡片 → 跳转 `/movie/{id}` → 显示详情 + 影院列表
- [ ] 分页器点击"下一页" → 请求参数 `pageNo=2` 正确
- [ ] 首页卡片 `categories` 字段正确渲染（逗号分隔）
- [ ] 详情页演员列表正确渲染（头像 + 姓名 + 角色）
