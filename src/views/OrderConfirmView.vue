<script setup>
import { ArrowLeft, CheckCircle, CreditCard, Loader2, Ticket, XCircle } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { cancelOrder, getOrderDetail, payOrder } from '@/api/order.js';

const route = useRoute();
const router = useRouter();
const orderId = ref(route.params.orderId);

const order = ref(null);
const loading = ref(true);
const error = ref('');

// 支付状态: pending(未支付) | paying(支付中) | paid(已支付) | canceled(已取消)
const payState = ref('pending');
const payError = ref('');

async function loadOrder() {
  loading.value = true;
  error.value = '';
  try {
    order.value = await getOrderDetail(orderId.value);
    // 同步状态：后端 0=待支付 1=已支付 2=已取消
    if (order.value.status === 1) payState.value = 'paid';
    else if (order.value.status === 2) payState.value = 'canceled';
  } catch (err) {
    error.value = err.message || '加载订单失败';
  } finally {
    loading.value = false;
  }
}

async function handlePay() {
  payState.value = 'paying';
  payError.value = '';
  try {
    await payOrder(orderId.value);
    payState.value = 'paid';
    // 支付成功刷新订单详情（获取完整订单信息）
    await loadOrder();
  } catch (err) {
    payState.value = 'pending';
    payError.value = err.message || '支付失败，请重试';
  }
}

async function handleCancel() {
  if (!confirm('确认取消订单？取消后座位将被释放。')) return;
  try {
    await cancelOrder(orderId.value);
    payState.value = 'canceled';
    await loadOrder();
  } catch (err) {
    alert(err.message || '取消失败');
  }
}

function goHome() {
  router.push({ name: 'home' });
}

function goMyOrders() {
  router.push({ name: 'home' }); // 我的订单页面还没做，先回首页
}

onMounted(loadOrder);
</script>

<template>
  <section class="confirm-page">
    <header class="page-header" v-if="order">
      <button class="back-btn" type="button" @click="router.back()">
        <ArrowLeft :size="18" />
      </button>
      <h1 class="page-title">确认订单</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <Loader2 :size="24" class="spin" />
      <span>加载中...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="loadOrder">重试</button>
    </div>

    <template v-else-if="order">
      <!-- 状态横幅 -->
      <div class="status-banner" v-if="payState === 'paid'">
        <CheckCircle :size="24" />
        <div class="status-text">
          <div class="status-title">支付成功</div>
          <div class="status-sub">订单号：{{ order.orderNo }}</div>
        </div>
      </div>
      <div class="status-banner canceled" v-else-if="payState === 'canceled'">
        <XCircle :size="24" />
        <div class="status-text">
          <div class="status-title">订单已取消</div>
          <div class="status-sub">座位已释放</div>
        </div>
      </div>

      <!-- 电影信息卡片 -->
      <div class="card info-card">
        <div class="poster">
          <img v-if="order.moviePoster" :src="order.moviePoster" :alt="order.movieName" />
        </div>
        <div class="movie-info">
          <h2 class="movie-name">{{ order.movieName }}</h2>
          <p class="meta"><span>{{ order.cinemaName }}</span></p>
          <p class="meta"><span>{{ order.hallName }}</span></p>
          <p class="meta"><span>{{ order.startTime }} - {{ order.endTime }}</span></p>
        </div>
      </div>

      <!-- 座位信息卡片 -->
      <div class="card seat-card">
        <div class="card-title">
          <Ticket :size="16" />
          <span>座位信息（{{ order.items?.length || 0 }} 张）</span>
        </div>
        <div class="seat-list" v-if="order.items">
          <div v-for="item in order.items" :key="item.id" class="seat-item">
            <span class="seat-code">{{ item.seatCode }}</span>
            <span class="seat-row">{{ item.rowNo }}排{{ item.colNo }}座</span>
            <span class="seat-price">¥{{ item.price }}</span>
          </div>
        </div>
        <div v-else class="empty-sub">暂无座位信息</div>
      </div>

      <!-- 金额明细 -->
      <div class="card price-card">
        <div class="price-row">
          <span>票价</span>
          <span>¥{{ Number(order.totalAmount ?? 0).toFixed(2) }}</span>
        </div>
        <div class="price-row total">
          <span>实付</span>
          <span class="amount">¥{{ Number(order.totalAmount ?? 0).toFixed(2) }}</span>
        </div>
      </div>

      <!-- 订单号 -->
      <div class="order-meta">
        <div>订单号：{{ order.orderNo }}</div>
        <div v-if="order.createdAt">创建时间：{{ order.createdAt }}</div>
      </div>

      <!-- 操作区 -->
      <div class="actions" v-if="payState === 'pending'">
        <button class="cancel-btn" type="button" @click="handleCancel">取消订单</button>
        <button class="primary-button pay-btn" type="button" :disabled="paying" @click="handlePay">
          <CreditCard :size="16" />
          {{ payState === 'paying' ? '支付中...' : `立即支付 ¥${Number(order.totalAmount ?? 0).toFixed(2)}` }}
        </button>
        <p v-if="payError" class="pay-error">{{ payError }}</p>
      </div>

      <div class="actions" v-else>
        <button class="primary-button" type="button" @click="goHome">返回首页</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.confirm-page {
  min-height: 100vh; background: #f5f7f5; padding-bottom: 40px;
}

.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; background: #fff;
  border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;
}
.back-btn {
  background: none; border: none; cursor: pointer; color: var(--muted);
  padding: 6px; border-radius: 50%; display: grid; place-items: center;
}
.back-btn:hover { background: #f0f3f0; color: var(--primary); }
.page-title { margin: 0; font-size: 16px; font-weight: 600; flex: 1; }

/* Loading / Error */
.loading-state, .error-state {
  text-align: center; padding: 80px 20px; color: var(--muted);
}

/* Status Banner */
.status-banner {
  display: flex; align-items: center; gap: 12px;
  margin: 20px; padding: 16px 20px;
  background: #e8f4ef; color: var(--primary);
  border-radius: 8px;
}
.status-banner.canceled {
  background: #fbe8e8; color: #d43838;
}
.status-title { font-size: 16px; font-weight: 600; }
.status-sub { font-size: 12px; opacity: 0.85; margin-top: 2px; }

/* Card */
.card {
  margin: 0 20px 16px; padding: 16px 20px;
  background: #fff; border-radius: 8px;
  border: 1px solid var(--border);
}
.card-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; margin-bottom: 12px;
}

/* Info Card */
.info-card { display: flex; gap: 14px; }
.poster { width: 72px; aspect-ratio: 2/3; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #eee; }
.poster img { width: 100%; height: 100%; object-fit: cover; }
.movie-info { flex: 1; min-width: 0; }
.movie-name { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
.meta { margin: 2px 0; font-size: 12px; color: var(--muted); }

/* Seat Card */
.seat-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px dashed var(--border);
  font-size: 13px;
}
.seat-item:last-child { border-bottom: none; }
.seat-code { font-weight: 600; color: var(--primary); }
.seat-row { color: var(--muted); font-size: 12px; }
.seat-price { color: var(--danger); }

/* Price Card */
.price-row {
  display: flex; justify-content: space-between;
  padding: 4px 0; font-size: 13px; color: var(--muted);
}
.price-row.total {
  font-size: 16px; font-weight: 600; color: #333;
  padding-top: 10px; margin-top: 8px; border-top: 1px solid var(--border);
}
.price-row .amount { color: var(--danger); font-size: 20px; }

/* Order Meta */
.order-meta {
  margin: 0 20px 20px; font-size: 11px; color: var(--muted);
  line-height: 1.8;
}

/* Actions */
.actions {
  display: flex; justify-content: flex-end; gap: 12px;
  margin: 20px;
}
.pay-btn { padding: 10px 28px; font-size: 15px; }
.pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-btn {
  padding: 10px 20px; font-size: 14px;
  border: 1px solid var(--border); border-radius: 6px;
  background: #fff; color: var(--muted); cursor: pointer;
}
.cancel-btn:hover { border-color: #d43838; color: #d43838; }

.pay-error {
  position: fixed; bottom: 80px; left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px; background: #d43838; color: #fff;
  border-radius: 6px; font-size: 13px;
}

.primary-button {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; font-size: 14px;
  border: none; border-radius: 6px; cursor: pointer;
  background: var(--primary); color: #fff;
  transition: background 0.15s;
}
.primary-button:hover { background: #1a7a55; }
</style>
