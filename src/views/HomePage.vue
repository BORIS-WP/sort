<template>
  <div class="home-page">
    <div class="content-wrapper">
      <header>
        <h1>📊 九大排序算法可视化</h1>
        <p class="subtitle">点击卡片查看详细可视化演示</p>
      </header>

      <!-- 3x3卡片布局 -->
      <main class="algorithm-grid">
        <div
          v-for="algo in algorithms"
          :key="algo.id"
          class="algorithm-card"
          :style="{ '--border-color': algo.color }"
          @click.prevent="handleJump(algo.path)"
        >
          <div class="card-icon">📊</div>
          <h3>{{ algo.title }}</h3>
          <p class="card-desc">{{ algo.desc }}</p>
          <div class="card-hover-effect"></div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const algorithms = [
  { id: 'bubble', title: '冒泡排序', desc: '相邻比较，大者后移', path: '/bubble', color: '#ff6b6b' },
  { id: 'selection', title: '选择排序', desc: '每轮选最小值放前面', path: '/selection', color: '#4ecdc4' },
  { id: 'insertion', title: '插入排序', desc: '将元素插入已排序部分', path: '/insertion', color: '#45b7d1' },
  { id: 'shell', title: '希尔排序', desc: '分组插入排序', path: '/shell', color: '#f9ca24' },
  { id: 'quick', title: '快速排序', desc: '分治 + 基准分区', path: '/quick', color: '#6c5ce7' },
  { id: 'merge', title: '归并排序', desc: '分而治之，合并有序', path: '/merge', color: '#a29bfe' },
  { id: 'heap', title: '堆排序', desc: '利用最大堆选最大值', path: '/heap', color: '#fd79a8' },
  { id: 'counting', title: '基数排序', desc: '按位分配，多轮收集', path: '/counting', color: '#00b894' },
  { id: 'bucket', title: '桶排序', desc: '分桶后分别排序', path: '/bucket', color: '#e17055' }
]

// 无阻塞跳转
function handleJump(path) {
  router.push(path)
}
</script>

<style scoped>
/* 页面外层容器 */
.home-page {
  width: 100%;
  min-height: 100vh;
  padding: 40px 20px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
}

/* 内容包裹层 */
.content-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 标题样式 */
header {
  text-align: center;
  margin-bottom: 40px;
  width: 100%;
}

header h1 {
  font-size: 2.8rem;
  color: #f8f9fa;
  font-weight: 700;
  margin: 0 0 12px 0;
  background: linear-gradient(45deg, #f8f9fa, #adb5bd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.2rem;
  color: #adb5bd;
  margin: 0;
  opacity: 0.8;
}

/* 3x3布局网格 */
.algorithm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  row-gap: 28px;
  justify-content: center;
  align-content: start;
  width: 100%;
  max-width: 900px;
}

/* 卡片样式 */
.algorithm-card {
  position: relative;
  display: block;
  padding: 32px 28px;
  min-height: 160px;
  background: #1e1e1e;
  border: 1px solid #2d2d2d;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  border-left: 4px solid var(--border-color);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 12px;
  opacity: 0.8;
}

.algorithm-card h3 {
  font-size: 1.3rem;
  color: #f8f9fa;
  font-weight: 600;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.card-desc {
  font-size: 0.95rem;
  color: #adb5bd;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
}

/* hover效果 */
.algorithm-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  background: #252525;
  border-color: rgba(255, 255, 255, 0.1);
}

.card-hover-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: 16px;
}

.algorithm-card:hover .card-hover-effect {
  opacity: 1;
}

/* 响应式适配 */
@media (max-width: 992px) {
  .algorithm-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    row-gap: 24px;
  }
  header h1 {
    font-size: 2.4rem;
  }
  .subtitle {
    font-size: 1.1rem;
  }
}

@media (max-width: 768px) {
  .algorithm-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    row-gap: 20px;
  }
  header h1 {
    font-size: 2.1rem;
  }
  .algorithm-card {
    min-height: 140px;
    padding: 28px 24px;
  }
  .card-icon {
    font-size: 1.8rem;
    margin-bottom: 10px;
  }
  .algorithm-card h3 {
    font-size: 1.2rem;
  }
  .card-desc {
    font-size: 0.9rem;
  }
}

@media (max-width: 576px) {
  .algorithm-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    row-gap: 20px;
  }
  .home-page {
    padding: 30px 15px;
  }
  header h1 {
    font-size: 1.8rem;
  }
  .subtitle {
    font-size: 1rem;
  }
  .algorithm-card {
    min-height: 130px;
    padding: 24px 20px;
  }
  .card-icon {
    font-size: 1.6rem;
  }
  .algorithm-card h3 {
    font-size: 1.1rem;
  }
  .card-desc {
    font-size: 0.85rem;
  }
}
</style>
