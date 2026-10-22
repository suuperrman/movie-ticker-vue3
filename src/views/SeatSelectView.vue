<script setup>
import { ArrowLeft, Calendar, Clock, CreditCard, Film, Loader2, MapPin, Ticket } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { getMovieSessions } from '@/api/movie.js';
import { getSeatMap } from '@/api/schedule.js';
import { createOrder } from '@/api/order.js';
import { useUserStore } from '@/stores/user.js';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// 路由参数（所有 ID 保持字符串，避免 JavaScript Number 精度丢失）
const movieId = ref(String(route.params.movieId));
const cinemaId = ref(String(route.query.cinemaId || ''));
const date = ref(route.query.date || new Date().toISOString().slice(0, 10));

// 场次列表（该影院该电影的所有场次）
const sessions = ref([]);
const loadingSessions = ref(true);
const selectedSessionId = ref(null);

// 座位图
const seatMap = ref(null);
const loadingSeats = ref(false);

// 当前选中的座位 id 列表
const selectedSeatIds = ref([]);
const MAX_SEATS = 5;

// 状态
const creating = ref(false);
const error = ref('');

// 已选座位数 + 总价
const selectedCount = computed(() => selectedSeatIds.value.length);
const totalPrice = computed(() => {
  if (!seatMap.value?.price) return 0;
  return seatMap.value.price * selectedCount.value;
});

// 可售座位 Set（status=0 且 ID 在 schedule_seat 表里）
const availableSeatIds = computed(() => {
  if (!seatMap.value?.seats) return new Set();
  return new Set(seatMap.value.seats.filter(s => Number(s.status) === 0).map(s => String(s.id)));
});

// 座位 code → 状态（统一把后端字符串数字转成正确类型）
const seatStatusMap = computed(() => {
  const map = new Map();
  if (seatMap.value?.seats) {
    for (const s of seatMap.value.seats) {
      map.set(`${Number(s.rowNo)}-${Number(s.colNo)}`, {
        id: String(s.id),
        status: Number(s.status),  // 0=可售 1=锁定 2=已售
        code: s.seatCode,
        rowNo: Number(s.rowNo),
        colNo: Number(s.colNo),
      });
    }
  }
  return map;
});

// 中间过道位置：colCount/2 之后加一列 gap
const aisleCol = computed(() => {
  if (!seatMap.value) return 0;
  return Math.floor(Number(seatMap.value.colCount) / 2);
});

// 生成座位网格（带过道占位）
// 每行变成：[座位1, ..., 座位aisleCol, null(过道), 座位aisleCol+1, ...]
const seatGrid = computed(() => {
  if (!seatMap.value) return [];
  const rowCount = Number(seatMap.value.rowCount);
  const colCount = Number(seatMap.value.colCount);
  const gap = aisleCol.value;
  const grid = [];
  for (let r = 1; r <= rowCount; r++) {
    const row = [];
    for (let c = 1; c <= colCount; c++) {
      row.push(seatStatusMap.value.get(`${r}-${c}`) || null);
      // 在 gap 列之后插一个 null 作为过道
      if (c === gap) row.push(null);
    }
    grid.push(row);
  }
  return grid;
});

async function loadSessions() {
  loadingSessions.value = true;
  error.value = '';
  try {
    sessions.value = await getMovieSessions(movieId.value, { cinemaId: cinemaId.value, date: date.value });
    if (sessions.value.length > 0) {
      // 默认选第一场
      selectedSessionId.value = sessions.value[0].scheduleId;
    }
  } catch (err) {
    error.value = err.message || '加载场次失败';
  } finally {
    loadingSessions.value = false;
  }
}

// 场次切换 → 重新加载座位图
watch(selectedSessionId, async (sid) => {
  if (!sid) {
    seatMap.value = null;
    return;
  }
  selectedSeatIds.value = [];
  loadingSeats.value = true;
  try {
    seatMap.value = await getSeatMap(sid);
  } catch (err) {
    error.value = err.message || '加载座位图失败';
    seatMap.value = null;
  } finally {
    loadingSeats.value = false;
  }
}, { immediate: false });

function seatKey(seatInfo) {
  // 用 rowNo-colNo 组合键做唯一标识，比后端 id 更稳
  return `${seatInfo.rowNo}-${seatInfo.colNo}`;
}

function toggleSeat(seatInfo) {
  if (!seatInfo) return;           // 空位（影厅中间过道）
  if (seatInfo.status !== 0) return; // 已售或锁定，禁止选择

  const key = seatKey(seatInfo);
  const idx = selectedSeatIds.value.indexOf(key);
  if (idx >= 0) {
    selectedSeatIds.value.splice(idx, 1);
    return;
  }
  if (selectedSeatIds.value.length >= MAX_SEATS) {
    alert(`每次最多选 ${MAX_SEATS} 个座位`);
    return;
  }
  selectedSeatIds.value.push(key);
}

function isSelected(seatInfo) {
  if (!seatInfo) return false;
  return selectedSeatIds.value.includes(seatKey(seatInfo));
}

function seatClass(seatInfo) {
  if (!seatInfo) return 'seat empty';
  if (isSelected(seatInfo)) return 'seat selected';
  if (seatInfo.status !== 0) return 'seat sold';
  return 'seat available';
}

async function handleConfirm() {
  if (selectedSeatIds.value.length === 0) {
    alert('请先选择座位');
    return;
  }
  if (!userStore.isLoggedIn) {
    const goto = router.resolve({
      name: 'login',
      query: { redirect: route.fullPath },
    });
    router.push(goto);
    return;
  }

  creating.value = true;
  error.value = '';
  try {
    // 把选中的 rowNo-colNo 组合键转成真实的 schedule_seat id 列表
    // 关键：保持雪花 ID 为字符串，不要 Number()（超过 JS MAX_SAFE_INTEGER 会丢精度）
    const seatIds = selectedSeatIds.value.map(key => {
      const [rowNo, colNo] = key.split('-').map(Number);
      const seat = seatStatusMap.value.get(`${rowNo}-${colNo}`);
      return seat ? String(seat.id) : null;
    }).filter(id => id !== null && id !== '0');

    if (seatIds.length === 0) {
      error.value = '座位数据异常，请刷新重试';
      return;
    }

    // 下单（后端锁座）
    const order = await createOrder({
      scheduleId: selectedSessionId.value,
      seatIds,
    });
    // 跳到订单确认页（由后端返回的 order.id 跳转）
    router.push({ name: 'order-confirm', params: { orderId: order.id } });
  } catch (err) {
    error.value = err.message || '下单失败';
  } finally {
    creating.value = false;
  }
}

function goBack() {
  // 回到电影详情页，带上 cinemaId
  router.push({
    name: 'movie-detail',
    params: { id: movieId.value },
    query: { cinemaId: cinemaId.value },
  });
}

onMounted(loadSessions);
</script>

<template>
  <section class="seat-page">
    <!-- 顶部：电影 + 影院 + 场次信息 -->
    <header class="page-header">
      <button class="back-btn" type="button" @click="goBack">
        <ArrowLeft :size="18" />
      </button>
      <div class="header-info" v-if="seatMap || sessions.length > 0">
        <div class="title-row">
          <h1 class="movie-name">{{ seatMap?.movieName || '加载中...' }}</h1>
        </div>
        <div class="sub-info">
          <span class="sub-item"><MapPin :size="14" /> {{ seatMap?.cinemaName }}</span>
          <span class="sub-item" v-if="seatMap"><Film :size="14" /> {{ seatMap.hallName }}</span>
          <span class="sub-item" v-if="seatMap"><Clock :size="14" /> {{ seatMap.startTime }}</span>
        </div>
      </div>
    </header>

    <!-- Loading / Error -->
    <div v-if="loadingSessions" class="loading-state">
      <Loader2 :size="24" class="spin" />
      <span>加载场次中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="loadSessions">重试</button>
    </div>

    <template v-else-if="sessions.length > 0">
      <!-- 场次选择 tabs -->
      <div class="session-tabs">
        <button
          v-for="s in sessions"
          :key="s.scheduleId"
          type="button"
          class="session-tab"
          :class="{ active: selectedSessionId === s.scheduleId }"
          @click="selectedSessionId = s.scheduleId"
        >
          <div class="session-time">{{ s.startTime.split(' ')[1] }}</div>
          <div class="session-price">¥{{ s.price }}</div>
        </button>
      </div>

      <!-- 座位图区域 -->
      <div class="seat-area" v-if="seatMap">
        <!-- 屏幕提示 -->
        <div class="screen-bar">
          <span>银 幕</span>
        </div>

        <!-- 座位网格 -->
        <div class="seat-grid">
          <!-- 第一列：行号（数字 1~N） -->
          <div class="row-labels">
            <div v-for="(_, ri) in seatGrid" :key="ri" class="row-label">{{ ri + 1 }}</div>
          </div>

          <div class="seat-body">
            <div v-for="(row, ri) in seatGrid" :key="ri" class="seat-row">
              <button
                v-for="(seat, ci) in row"
                :key="ci"
                type="button"
                class="seat"
                :class="seatClass(seat)"
                :disabled="!seat || seat.status !== 0"
                :title="seat
                  ? `${seat.rowNo}排${seat.colNo}座 ${seat.status === 0 ? '可售' : seat.status === 1 ? '锁定中' : '已售'}`
                  : ''"
                @click="toggleSeat(seat)"
              >
                <!-- 座位上不显示文字，保持视觉干净 -->
              </button>
            </div>
          </div>
        </div>

        <!-- 图例 -->
        <div class="legend">
          <span class="legend-item"><span class="legend-dot sold"></span>不可选</span>
          <span class="legend-item"><span class="legend-dot available"></span>未选</span>
          <span class="legend-item"><span class="legend-dot selected"></span>已选</span>
        </div>
      </div>

      <div v-else-if="loadingSeats" class="loading-inline">
        <Loader2 :size="16" class="spin" />
        <span>加载座位图...</span>
      </div>

      <!-- 底部确认栏 -->
      <footer class="confirm-bar" v-if="seatMap">
        <div class="selected-info">
          <div class="selected-title">
            <Ticket :size="16" />
            <span>已选 {{ selectedCount }} 座</span>
            <span class="price">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
          <div class="selected-codes" v-if="selectedSeatIds.length > 0">
            {{ selectedSeatIds.map(id => seatMap.seats.find(s => s.id === id)?.seatCode).filter(Boolean).join('、') }}
          </div>
        </div>
        <button
          class="primary-button confirm-btn"
          type="button"
          :disabled="selectedCount === 0 || creating"
          @click="handleConfirm"
        >
          <CreditCard :size="16" />
          {{ creating ? '下单中...' : '确认选座' }}
        </button>
      </footer>
    </template>

    <div v-else class="empty-state">
      <p>该影院今日暂无场次</p>
      <RouterLink class="primary-button" :to="{ name: 'movie-detail', params: { id: movieId } }">返回</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.seat-page {
  min-height: 100vh;
  background: #f5f7f5;
  padding-bottom: 100px; /* 给底部确认栏腾位置 */
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
  padding: 6px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.back-btn:hover { background: #f0f3f0; color: var(--primary); }
.header-info { flex: 1; min-width: 0; }
.movie-name { margin: 0; font-size: 18px; font-weight: 600; }
.sub-info {
  display: flex; flex-wrap: wrap; gap: 12px;
  margin-top: 4px; font-size: 12px; color: var(--muted);
}
.sub-item { display: inline-flex; align-items: center; gap: 3px; }

/* Loading / Error */
.loading-state, .error-state, .empty-state {
  text-align: center; padding: 60px 20px; color: var(--muted);
}
.loading-inline {
  display: flex; align-items: center; gap: 8px;
  padding: 40px; justify-content: center; color: var(--muted);
}

/* Session Tabs */
.session-tabs {
  display: flex; gap: 10px; padding: 16px 20px;
  background: #fff; overflow-x: auto;
  border-bottom: 1px solid var(--border);
}
.session-tab {
  flex-shrink: 0;
  padding: 10px 16px; border: 1px solid var(--border); border-radius: 6px;
  background: #fff; cursor: pointer; text-align: center;
  transition: all 0.15s;
}
.session-tab:hover { border-color: var(--primary); }
.session-tab.active {
  background: var(--primary); border-color: var(--primary); color: #fff;
}
.session-time { font-size: 14px; font-weight: 600; }
.session-price { font-size: 12px; opacity: 0.85; margin-top: 2px; }
.session-tab.active .session-price { opacity: 1; }

/* Seat Area */
.seat-area { padding: 28px 20px 20px; max-width: 640px; margin: 0 auto; }

/* Screen */
.screen-bar {
  text-align: center; margin-bottom: 28px;
}
.screen-bar span {
  display: inline-block;
  padding: 8px 64px;
  background: linear-gradient(180deg, rgba(120,140,120,0.15), transparent);
  border-bottom: 3px solid #5a7a5a;
  font-size: 12px; color: #6b8a6b; letter-spacing: 8px;
  font-weight: 500;
}

/* Grid */
.seat-grid {
  display: flex; gap: 16px; justify-content: center;
  margin: 0 auto;
}
.row-labels {
  display: flex; flex-direction: column; gap: 5px; padding-top: 3px;
}
.row-label {
  width: 24px; height: 30px;
  display: grid; place-items: center;
  font-size: 12px; color: #99a099; font-weight: 500;
}
.seat-body {
  display: flex; flex-direction: column; gap: 5px;
}
.seat-row {
  display: flex; gap: 3px;
}

/* ========== 座位（核心三色样式） ========== */
.seat {
  width: 30px; height: 30px;
  border: none;
  border-radius: 6px 6px 2px 2px;  /* 底部稍尖，模拟影院座位 */
  cursor: pointer;
  display: block;
  padding: 0;
  transition: transform 0.1s, filter 0.1s;
  outline: none;
}

/* 空位（过道） */
.seat.empty {
  visibility: hidden;
  width: 18px;  /* 过道比普通 gap 宽一点 */
}

/* 可售未选 → 白色 */
.seat.available {
  background: #ffffff;
  border: 1.5px solid #56a86a;
  box-shadow: inset 0 -2px 0 rgba(86,168,106,0.2);
}
.seat.available:hover {
  background: #f0fff4;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(86,168,106,0.3), inset 0 -2px 0 rgba(86,168,106,0.2);
}

/* 已选 → 红色 */
.seat.selected {
  background: #e74c3c;
  border: 1.5px solid #c0392b;
  box-shadow: 0 2px 6px rgba(231,76,60,0.4);
  transform: scale(1.08);
}

/* 不可选（已售/锁定）→ 灰色 */
.seat.sold,
.seat:disabled {
  background: #d4d8d4;
  border: 1.5px solid #b0b4b0;
  cursor: not-allowed;
  filter: saturate(0.5);
}

/* Legend */
.legend {
  display: flex; gap: 24px; justify-content: center;
  margin-top: 28px; font-size: 13px; color: #8a8a8a;
}
.legend-item { display: inline-flex; align-items: center; gap: 8px; }
.legend-dot {
  width: 22px; height: 22px;
  border-radius: 6px 6px 2px 2px;
}
.legend-dot.sold { background: #d4d8d4; border: 1.5px solid #b0b4b0; }
.legend-dot.available { background: #ffffff; border: 1.5px solid #56a86a; }
.legend-dot.selected { background: #e74c3c; border: 1.5px solid #c0392b; }

/* Confirm Bar */
.confirm-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px;
  background: #fff; border-top: 1px solid var(--border);
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
  z-index: 10;
}
.selected-info { flex: 1; min-width: 0; }
.selected-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 500;
}
.selected-title .price {
  margin-left: 8px; color: var(--danger); font-weight: 700; font-size: 18px;
}
.selected-codes {
  font-size: 12px; color: var(--muted); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.confirm-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px;
  font-size: 14px;
  white-space: nowrap;
}
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.primary-button {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; font-size: 14px;
  border: none; border-radius: 6px; cursor: pointer;
  background: var(--primary); color: #fff;
  transition: background 0.15s;
}
.primary-button:hover { background: #1a7a55; }

@media (max-width: 480px) {
  .seat { width: 24px; height: 24px; font-size: 8px; }
  .seat-row { gap: 3px; }
}
</style>
