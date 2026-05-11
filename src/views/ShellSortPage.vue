<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>🔍 希尔排序 (Shell Sort) 可视化演示</h2>
    </div>

    <div class="flex-container">
      <!-- 控制面板（和插入/冒泡排序完全一致的原生HTML） -->
      <div class="control-panel">
        <div class="stats-row">
          <div class="stat-item">比较次数：<span>{{ compareCount }}</span></div>
          <div class="stat-item">交换次数：<span>{{ swapCount }}</span></div>
          <div class="stat-item">已用时长：<span>{{ usedTime }} ms</span></div>
          <div class="stat-item">进度：<span>{{ progress }}%</span></div>
          <div class="stat-item">时间复杂度：<span>{{ timeComplexity }}</span></div>
          <div class="stat-item">空间复杂度：<span>{{ spaceComplexity }}</span></div>
        </div>
        <div class="btn-row">
          <button @click="generateRandomArray" :disabled="isSorting">随机数组</button>
          <button @click="startOrResumeSort" :disabled="isSorting && !isPaused">开始</button>
          <button @click="pauseSort" :disabled="!isSorting || isPaused">暂停</button>
          <button @click="handleReset">重置</button>
          <div class="config-row">
            <label>数组长度：</label>
            <input
              type="number"
              v-model.number="arraySize"
              min="5"
              max="50"
              @change="handleArraySizeChange"
              :disabled="isSorting"
            >
            <label>速度(ms)：</label>
            <input
              type="number"
              v-model.number="speedMs"
              min="50"
              max="1000"
              :disabled="isSorting"
            >
          </div>
        </div>
      </div>

      <!-- D3 容器（和插入/冒泡排序完全一致） -->
      <div ref="chartRef" class="d3-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

// 基础配置（和插入/冒泡排序完全一致）
const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 300

// 核心状态（变量名和插入/冒泡排序完全一致）
const arraySize = ref(DEFAULT_SIZE)
const speedMs = ref(DEFAULT_SPEED)
const isSorting = ref(false)
const isPaused = ref(false)
const isAborted = ref(false)

// D3 引用（和插入/冒泡排序完全一致）
const chartRef = ref(null)
let svg = null
let xScale = null
let yScale = null

// 统计数据（和插入/冒泡排序完全一致）
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n log²n) ～ O(n²)')
const spaceComplexity = ref('O(1)')

// 排序数据（变量名和插入/冒泡排序完全一致）
const array = ref([])
const currentHighlight = ref([]) // 替换原compareIndices，和插入排序命名一致
const sortedIndices = ref([])
let sortTimer = null
let timeUpdateTimer = null
let sortStartTime = 0
let pauseTotalTime = 0
let pauseStartTime = 0
let sortGenerator = null
let totalSteps = 0
let currentStep = 0

// ==================== D3 初始化（和插入/冒泡排序完全一致）====================
function initD3() {
  if (!chartRef.value) return
  
  // 清空容器
  d3.select(chartRef.value).selectAll('*').remove()
  
  // 获取容器尺寸
  const containerWidth = chartRef.value.clientWidth
  const containerHeight = chartRef.value.clientHeight
  
  // 创建 SVG
  svg = d3.select(chartRef.value)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight)
  
  // 定义比例尺（和插入/冒泡排序一致）
  xScale = d3.scaleBand()
    .domain(d3.range(arraySize.value))
    .range([50, containerWidth - 50])
    .padding(0.1)
  
  yScale = d3.scaleLinear()
    .domain([0, 500])
    .range([containerHeight - 50, 50])
  
  // 立即渲染
  renderBars()
}

// ==================== 渲染柱子（和插入/冒泡排序完全一致）====================
function renderBars() {
  if (!svg || array.value.length === 0) return
  
  // 移除旧的柱子组
  svg.selectAll('.bar-group').remove()
  
  // 创建新的柱子组
  const barGroups = svg.selectAll('.bar-group')
    .data(array.value)
    .enter()
    .append('g')
    .attr('class', 'bar-group')
    .attr('transform', function(d, i) {
      return 'translate(' + xScale(i) + ', 0)'
    })

  // 绘制柱子（颜色逻辑和插入/冒泡排序完全一致）
  barGroups.append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', function(d) { return yScale(d) })
    .attr('width', xScale.bandwidth())
    .attr('height', function(d) { return yScale(0) - yScale(d) })
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('fill', function(d, i) {
      if (sortedIndices.value.includes(i)) return '#10b981'  // 已排序：绿色
      if (currentHighlight.value.includes(i)) return '#ef4444' // 比较中：红色
      return '#3b82f6'                                       // 默认：蓝色
    })

  // 数值标签（和插入/冒泡排序完全一致）
  barGroups.append('text')
    .attr('class', 'bar-label')
    .attr('x', xScale.bandwidth() / 2)
    .attr('y', function(d) { return yScale(d) - 8 })
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('fill', '#1e293b')
    .text(function(d) { return d })
}

// ==================== 工具函数（和插入/冒泡排序完全一致）====================
// 生成随机数组
function generateRandomArray() {
  array.value = Array.from({ length: arraySize.value }, function() {
    return Math.floor(Math.random() * 450) + 50
  })
  totalSteps = arraySize.value * Math.log2(arraySize.value) * 3
  currentStep = 0
  
  // 重置状态（和插入排序逻辑一致）
  compareCount.value = 0
  swapCount.value = 0
  progress.value = 0
  usedTime.value = 0
  currentHighlight.value = []
  sortedIndices.value = []
  pauseTotalTime = 0
  sortStartTime = 0
  
  // 重新初始化D3
  initD3()
}

// 重置（和插入/冒泡排序逻辑一致）
function handleReset() {
  isAborted.value = true
  
  // 清空定时器
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  
  // 恢复默认值
  arraySize.value = DEFAULT_SIZE
  speedMs.value = DEFAULT_SPEED
  
  // 重置状态
  isSorting.value = false
  isPaused.value = false
  
  // 重新生成数组
  setTimeout(function() {
    isAborted.value = false
    generateRandomArray()
  }, 50)
}

// 数组长度改变处理
function handleArraySizeChange() {
  if (arraySize.value < 5) arraySize.value = 5
  if (arraySize.value > 50) arraySize.value = 50
  generateRandomArray()
}

// 暂停排序（和插入/冒泡排序逻辑一致）
function pauseSort() {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    pauseStartTime = Date.now()
    currentHighlight.value = [] // 清空高亮
    renderBars() // 刷新视图
    if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  }
}

// 延时函数（改名delay，和插入排序一致）
function delay(ms) {
  return new Promise(function(resolve) {
    sortTimer = setTimeout(resolve, ms)
  })
}

// ==================== 希尔排序核心逻辑（保留算法，适配统一命名）====================
function* shellSort(arr) {
  let n = arr.length
  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      let temp = arr[i]
      let j = i
      while (j >= gap && arr[j - gap] > temp) {
        // 统计比较次数
        compareCount.value++
        arr[j] = arr[j - gap]
        
        // 高亮当前比较的索引（和插入排序命名一致）
        currentHighlight.value = [j, j - gap]
        renderBars() // 实时渲染
        yield arr
        
        j -= gap
        currentStep++
        progress.value = Math.floor((currentStep / totalSteps) * 98)
      }
      arr[j] = temp
      // 统计交换次数
      swapCount.value++
      
      // 高亮当前插入的索引
      currentHighlight.value = [j]
      renderBars() // 实时渲染
      yield arr
    }
  }
}

// 排序执行逻辑（适配统一命名和风格）
async function startShellSort() {
  if (isSorting.value) return
  isSorting.value = true
  isPaused.value = false
  isAborted.value = false
  
  const arr = [...array.value]
  const n = arr.length
  sortGenerator = shellSort(arr)
  
  // 记录开始时间
  sortStartTime = Date.now()
  
  // 时间更新定时器（和插入排序逻辑一致）
  timeUpdateTimer = setInterval(function() {
    if (!isPaused.value) {
      usedTime.value = Math.round(Date.now() - sortStartTime - pauseTotalTime)
    }
  }, 50)
  
  try {
    while (!isPaused.value && !isAborted.value) {
      const result = sortGenerator.next()
      if (result.done) break
      
      array.value = [...result.value]
      await delay(speedMs.value)
    }
    
    // 排序完成收尾（和插入排序逻辑一致）
    if (!isAborted.value) {
      sortedIndices.value = Array.from({ length: n }, function(_, idx) {
        return idx
      })
      currentHighlight.value = []
      progress.value = 100
      renderBars()
    }
  } finally {
    clearInterval(timeUpdateTimer)
    isSorting.value = false
  }
}

// 开始/继续排序（和插入/冒泡排序逻辑一致）
function startOrResumeSort() {
  if (isPaused.value) {
    // 继续排序
    pauseTotalTime += Date.now() - pauseStartTime
    isPaused.value = false
    startShellSort()
    return
  }
  // 开始新排序
  startShellSort()
}

// ==================== 生命周期（和插入/冒泡排序完全一致）====================
onMounted(function() {
  // 初始化数组和D3
  generateRandomArray()
  initD3()
  
  // 监听窗口大小变化
  window.addEventListener('resize', initD3)
})

onUnmounted(function() {
  // 清理定时器
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  
  // 移除窗口监听
  window.removeEventListener('resize', initD3)
})
</script>

<style scoped>
/* 样式和插入/冒泡排序完全一致，一字不差 */
.sort-page {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-header {
  padding: 16px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.back-btn {
  display: inline-block;
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #4338ca;
  transform: translateY(-1px);
}

h2 {
  font-size: 20px;
  color: #1e293b;
  margin: 0;
  font-weight: 700;
}

.flex-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

.control-panel {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.stat-item {
  font-size: 14px;
  color: #475569;
}

.stat-item span {
  font-weight: 600;
  color: #1e293b;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #4f46e5;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  background: #4338ca;
}

button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.config-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.config-row label {
  font-size: 14px;
  color: #475569;
}

.config-row input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
}

.d3-container {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

:deep(.bar-label) {
  user-select: none;
}

/* 响应式适配（和插入/冒泡排序完全一致） */
@media (max-width: 768px) {
  .stats-row {
    gap: 8px;
  }
  
  .btn-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .config-row {
    margin-left: 0;
    justify-content: space-between;
  }
  
  .d3-container {
    min-height: 300px;
  }
  
  :deep(.bar-label) {
    font-size: 10px;
  }
}
</style>