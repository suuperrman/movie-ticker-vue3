<script setup>
import { Loader2, Search } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { getComingShowing, getHotShowing } from '@/api/movie.js';

const router = useRouter();
const searchKeyword = ref('');

const activeTab = ref('hot');
const loading = ref(false);
const movies = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = ref(0);

async function loadList() {
  loading.value = true;
  try {
    const api = activeTab.value === 'hot' ? getHotShowing : getComingShowing;
    const page = await api({ pageNo: currentPage.value, pageSize: pageSize.value });
    // 后端返回 MyBatis-Plus Page：{ records, total, current, size, pages }
    movies.value = page.records || [];
    totalPages.value = page.pages || 0;
  } catch (err) {
    movies.value = [];
    totalPages.value = 0;
  } finally {
    loading.value = false;
  }
}

function switchTab(tab) {
  if (tab === activeTab.value) return;
  activeTab.value = tab;
  currentPage.value = 1;
  loadList();
}

function goPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  loadList();
}

const pages = computed(() => {
  const list = [];
  for (let i = 1; i <= totalPages.value; i++) list.push(i);
  return list;
});

function goSearch() {
  const kw = searchKeyword.value.trim();
  if (!kw) {
    router.push('/search');
    return;
  }
  router.push({ name: 'search', query: { q: encodeURIComponent(kw) } });
}

function onSearchKeydown(e) {
  if (e.key === 'Enter') {
    goSearch();
  }
}

onMounted(loadList);
</script>

<template>
  <section class="home-page">
    <!-- 搜索框 -->
    <div class="home-search">
      <div class="home-search-bar">
        <Search :size="18" class="search-icon" />
        <input
          v-model="searchKeyword"
          type="text"
          class="search-input"
          placeholder="搜索电影、导演、演员..."
          @keydown="onSearchKeydown"
        />
        <button class="search-btn" type="button" @click="goSearch">
          搜索
        </button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="movie-tabs">
      <button
        class="movie-tab"
        :class="{ active: activeTab === 'hot' }"
        type="button"
        @click="switchTab('hot')"
      >
        正在热映
      </button>
      <button
        class="movie-tab"
        :class="{ active: activeTab === 'coming' }"
        type="button"
        @click="switchTab('coming')"
      >
        即将上映
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <Loader2 :size="28" class="spin" />
      <span>加载中...</span>
    </div>

    <!-- 电影列表 -->
    <template v-else-if="movies.length > 0">
      <div class="movie-grid">
        <RouterLink
          v-for="m in movies"
          :key="m.id"
          :to="`/movie/${m.id}`"
          class="movie-card"
        >
          <div class="movie-poster">
            <img
              v-if="m.posterUrl"
              :src="m.posterUrl"
              :alt="m.name"
              loading="lazy"
            />
            <div v-else class="poster-placeholder">🎬</div>
          </div>
          <div class="movie-info">
            <h3 class="movie-title">{{ m.name }}</h3>
            <p class="movie-meta">
              <span v-if="m.duration">{{ m.duration }} 分钟</span>
              <span v-if="m.categories">· {{ m.categories }}</span>
            </p>
            <p class="movie-meta" v-if="m.director">导演：{{ m.director }}</p>
            <div class="movie-footer">
              <span v-if="m.minPrice != null" class="movie-price">¥{{ m.minPrice }} 起</span>
              <span v-if="m.cinemaCount != null" class="movie-cinemas">{{ m.cinemaCount }} 家影院</span>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="page-btn"
          type="button"
          :disabled="currentPage <= 1"
          @click="goPage(currentPage - 1)"
        >上一页</button>
        <button
          v-for="p in pages"
          :key="p"
          class="page-btn"
          :class="{ active: p === currentPage }"
          type="button"
          @click="goPage(p)"
        >{{ p }}</button>
        <button
          class="page-btn"
          type="button"
          :disabled="currentPage >= totalPages"
          @click="goPage(currentPage + 1)"
        >下一页</button>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <p>暂无电影数据</p>
      <p class="empty-sub">请确认后端 movie-ticket-master 服务已启动并导入数据</p>
    </div>
  </section>
</template>

<style scoped>
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.home-page {
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
  padding: 48px 0;
}

/* 首页搜索框 */
.home-search {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
}

.home-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 500px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 50px;
  padding: 0 4px 0 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.home-search-bar:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.home-search-bar .search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.home-search-bar .search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 10px;
  font-size: 14px;
  background: transparent;
}

.home-search-bar .search-btn {
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.home-search-bar .search-btn:hover {
  background: var(--color-primary-dark);
}

/* Tabs */
.movie-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border);
  margin-bottom: 32px;
}
.movie-tab {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 160ms ease, border-color 160ms ease;
}
.movie-tab:hover { color: var(--primary); }
.movie-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: var(--muted);
}

/* Grid */
.movie-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.movie-card {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.movie-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
.movie-poster {
  aspect-ratio: 2/3;
  background: #eee;
  overflow: hidden;
}
.movie-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.poster-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 48px;
  background: linear-gradient(135deg, #f4f6f4, #e2e8e4);
}
.movie-info {
  padding: 14px 16px 16px;
}
.movie-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.movie-meta {
  margin: 2px 0;
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.movie-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.movie-price {
  color: var(--danger);
  font-weight: 700;
  font-size: 14px;
}
.movie-cinemas {
  font-size: 12px;
  color: var(--muted);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  color: #18201c;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}
.page-btn:hover:not(:disabled):not(.active) {
  border-color: var(--primary);
  color: var(--primary);
}
.page-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 80px 0;
  color: var(--muted);
}
.empty-state p { margin: 8px 0; }
.empty-sub { font-size: 13px; }

@media (max-width: 960px) {
  .movie-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .movie-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
