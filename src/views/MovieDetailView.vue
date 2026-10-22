<script setup>
import { ArrowLeft, Calendar, Clock, Film, Loader2, MapPin } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { getMovieCinemas, getMovieDetail } from '@/api/movie.js';

const route = useRoute();
const movieId = ref(route.params.id);

const loading = ref(true);
const error = ref('');
const detail = ref(null);
const cinemas = ref([]);
const loadingCinemas = ref(false);

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    detail.value = await getMovieDetail(movieId.value);
    // 并行加载影院列表
    loadingCinemas.value = true;
    try {
      cinemas.value = await getMovieCinemas(movieId.value);
    } catch {
      cinemas.value = [];
    } finally {
      loadingCinemas.value = false;
    }
  } catch (err) {
    error.value = err.message || '加载电影详情失败';
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <section class="detail-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <Loader2 :size="28" class="spin" />
      <span>加载中...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="loadAll">重试</button>
    </div>

    <template v-else-if="detail">
      <!-- 返回 -->
      <RouterLink to="/" class="back-link">
        <ArrowLeft :size="16" />
        <span>返回列表</span>
      </RouterLink>

      <!-- 电影基本信息 -->
      <div class="detail-header">
        <div class="detail-poster">
          <img v-if="detail.posterUrl" :src="detail.posterUrl" :alt="detail.name" />
          <div v-else class="poster-placeholder"><Film :size="64" /></div>
        </div>
        <div class="detail-info">
          <h1 class="detail-title">{{ detail.name }}</h1>
          <div class="detail-tags">
            <span
              v-for="c in detail.categories"
              :key="c.id"
              class="tag"
            >{{ c.name }}</span>
          </div>
          <div class="detail-meta">
            <span v-if="detail.director">导演：{{ detail.director }}</span>
            <span v-if="detail.duration"><Clock :size="14" /> {{ detail.duration }} 分钟</span>
            <span v-if="detail.releaseDate"><Calendar :size="14" /> {{ detail.releaseDate }}</span>
          </div>
          <div class="detail-price-row" v-if="detail.minPrice != null">
            <span class="price-label">最低票价</span>
            <span class="price-value">¥{{ detail.minPrice }}</span>
          </div>
          <p class="detail-desc">{{ detail.description }}</p>
        </div>
      </div>

      <!-- 演员列表 -->
      <div v-if="detail.actors?.length" class="detail-section">
        <h2 class="section-title">主要演员</h2>
        <div class="actor-list">
          <div v-for="actor in detail.actors" :key="actor.id" class="actor-item">
            <div class="actor-avatar">
              <img v-if="actor.avatarUrl" :src="actor.avatarUrl" :alt="actor.name" />
              <span v-else>{{ actor.name?.charAt(0) }}</span>
            </div>
            <div class="actor-name">{{ actor.name }}</div>
            <div class="actor-role" v-if="actor.roleName">{{ actor.roleName }}</div>
          </div>
        </div>
      </div>

      <!-- 影院场次列表 -->
      <div class="detail-section">
        <h2 class="section-title">
          <MapPin :size="18" />
          购票影院
          <span v-if="detail.cinemaCount" class="count">（{{ detail.cinemaCount }} 家）</span>
        </h2>

        <div v-if="loadingCinemas" class="loading-inline">
          <Loader2 :size="16" class="spin" />
          <span>加载场次中...</span>
        </div>

        <template v-else-if="cinemas.length > 0">
          <div class="cinema-list">
            <div
              v-for="c in cinemas"
              :key="c.cinemaId"
              class="cinema-card"
            >
              <div class="cinema-info">
                <h3 class="cinema-name">{{ c.cinemaName }}</h3>
                <p class="cinema-meta">
                  <span v-if="c.city">{{ c.city }}</span>
                  <span v-if="c.address">· {{ c.address }}</span>
                </p>
                <p class="cinema-meta" v-if="c.phone">电话：{{ c.phone }}</p>
              </div>
              <div class="cinema-right">
                <div class="cinema-price" v-if="c.minPrice != null">¥{{ c.minPrice }} 起</div>
                <div class="cinema-meta">{{ c.scheduleCount }} 场</div>
                <RouterLink
                  class="primary-button"
                  :to="{
                    name: 'seat-select',
                    params: { movieId: movieId },
                    query: { cinemaId: c.cinemaId, date: (new Date()).toISOString().slice(0, 10) },
                  }"
                >选座购票</RouterLink>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-sub">暂无可购影院</div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.detail-page {
  width: min(1100px, calc(100% - 40px));
  margin: 0 auto;
  padding: 32px 0 48px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  color: var(--muted);
  font-size: 14px;
}
.back-link:hover { color: var(--primary); }

/* Header */
.detail-header {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  margin-bottom: 40px;
}
.detail-poster {
  aspect-ratio: 2/3;
  border-radius: 10px;
  overflow: hidden;
  background: #eee;
}
.detail-poster img { width: 100%; height: 100%; object-fit: cover; }
.poster-placeholder {
  display: grid; place-items: center; width: 100%; height: 100%;
  background: linear-gradient(135deg, #f4f6f4, #e2e8e4); color: var(--muted);
}
.detail-title { margin: 0 0 12px; font-size: 28px; line-height: 1.2; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.tag {
  padding: 2px 10px; font-size: 12px; border-radius: 4px;
  background: #e8f4ef; color: var(--primary);
}
.detail-meta {
  display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;
  font-size: 14px; color: var(--muted);
}
.detail-meta span { display: inline-flex; align-items: center; gap: 4px; }
.detail-price-row {
  display: flex; align-items: baseline; gap: 8px; margin-bottom: 14px;
}
.price-label { font-size: 13px; color: var(--muted); }
.price-value { font-size: 24px; color: var(--danger); font-weight: 700; }
.detail-desc {
  font-size: 14px; color: #4a504a; line-height: 1.7;
}

/* Sections */
.detail-section { margin-top: 40px; }
.section-title {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 18px; font-size: 18px; font-weight: 600;
}
.section-title .count { font-size: 14px; color: var(--muted); font-weight: 400; }

/* Actors */
.actor-list {
  display: flex; flex-wrap: wrap; gap: 16px;
}
.actor-item { text-align: center; width: 80px; }
.actor-avatar {
  width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 6px;
  background: var(--border); overflow: hidden;
  display: grid; place-items: center; font-weight: 600; color: #fff;
  background-color: var(--primary);
}
.actor-avatar img { width: 100%; height: 100%; object-fit: cover; }
.actor-name { font-size: 13px; font-weight: 500; }
.actor-role { font-size: 12px; color: var(--muted); }

/* Cinemas */
.cinema-list { display: flex; flex-direction: column; gap: 14px; }
.cinema-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 8px;
  gap: 24px;
}
.cinema-info { flex: 1; min-width: 0; }
.cinema-name { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
.cinema-meta { margin: 2px 0; font-size: 13px; color: var(--muted); }
.cinema-right { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.cinema-price { font-size: 18px; color: var(--danger); font-weight: 700; }

/* States */
.loading-state, .error-state {
  text-align: center; padding: 80px 0; color: var(--muted);
}
.loading-inline {
  display: flex; align-items: center; gap: 8px;
  padding: 40px 0; color: var(--muted);
}

@media (max-width: 720px) {
  .detail-header { grid-template-columns: 1fr; }
  .detail-poster { max-width: 240px; margin: 0 auto; }
  .cinema-card { flex-direction: column; align-items: flex-start; }
  .cinema-right { align-items: flex-start; text-align: left; }
}
</style>
