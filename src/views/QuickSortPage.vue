<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>⚡ 快速排序 (Quick Sort) 可视化演示</h2>
    </div>

    <div class="flex-container">
      <!-- 原生控制面板 -->
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

      <!-- 左右分栏主容器 - 核心优化：固定布局 -->
      <div class="main-visual-container">
        <!-- 左侧：递归调用栈 - 滚动优化 -->
        <div class="call-stack-container">
          <div class="stack-header">
            <h3 class="stack-title">🔍 快速排序 - 分治执行流程</h3>
            <div class="stack-tip">
              <span class="tip-item"><span class="tip-dot active-dot"></span> 执行中</span>
              <span class="tip-item"><span class="tip-dot completed-dot"></span> 已完成</span>
            </div>
          </div>
          <!-- 核心：滚动容器 + 自动滚动到最新项 -->
          <div class="stack-scroll-container" ref="stackScrollRef">
            <div class="stack-list">
              <div 
                class="stack-item" 
                v-for="(item, idx) in callStack" 
                :key="idx"
                :class="{ 
                  active: idx === callStack.length - 1, 
                  completed: item.completed,
                  even: idx % 2 === 0
                }"
                :ref="idx === callStack.length - 1 ? 'activeStackItem' : null"
              >
                <div class="stack-item-header">
                  <span class="stack-index">{{ idx + 1 }}</span>
                  <span 
                    class="stack-status" 
                    :class="{ 'status-active': idx === callStack.length - 1, 'status-completed': item.completed }"
                  >
                    {{ idx === callStack.length - 1 ? '执行中' : (item.completed ? '已完成' : '等待中') }}
                  </span>
                </div>
                <div class="stack-item-body">
                  <div class="stack-info-row">
                    <span class="info-label">排序区间：</span>
                    <span class="info-value range-value">[ {{ item.low }} , {{ item.high }} ]</span>
                  </div>
                  <div class="stack-info-row">
                    <span class="info-label">基准值(Pivot)：</span>
                    <span class="info-value pivot-value">{{ item.pivot }}</span>
                  </div>
                  <div class="stack-desc">
                    将区间分为：≤{{ item.pivot }} 和 ≥{{ item.pivot }} 两部分
                  </div>
                </div>
              </div>
              <!-- 空状态提示 -->
              <div class="empty-stack" v-if="callStack.length === 0">
                📌 点击「开始」按钮查看分治执行流程
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：D3容器 - 完全固定 -->
        <div ref="chartRef" class="d3-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'

// 基础配置
const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 300

// 核心状态
const arraySize = ref(DEFAULT_SIZE)
const speedMs = ref(DEFAULT_SPEED)
const isSorting = ref(false)
const isPaused = ref(false)
const isAborted = ref(false)

// D3 核心引用
const chartRef = ref(null)
let svg = null
let xScale = null
let yScale = null

// 滚动容器引用
const stackScrollRef = ref(null)
const activeStackItem = ref(null)

// 性能统计数据
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('平均 O(n log n)，最坏 O(n²)')
const spaceComplexity = ref('O(log n)')

// 排序核心数据
const array = ref([])
const currentHighlight = ref([])
const sortedIndices = ref([])
let sortTimer = null
let timeUpdateTimer = null
let sortStartTime = 0
let pauseTotalTime = 0
let pauseStartTime = 0
let sortGenerator = null
let totalSteps = 0
let currentStep = 0

// 递归调用栈核心数据
const callStack = ref([])
let completedStackLevel = 0

// ==================== 滚动优化：自动滚动到最新栈项 ====================
watch(callStack, async () => {
  await nextTick()
  if (stackScrollRef.value && activeStackItem.value) {
    // 平滑滚动到当前执行的栈项
    stackScrollRef.value.scrollTop = activeStackItem.value.offsetTop - 20
  }
}, { immediate: false })

// ==================== D3 初始化 ====================
function initD3() {
  if (!chartRef.value) return
  
  d3.select(chartRef.value).selectAll('*').remove()
  
  const containerWidth = chartRef.value.clientWidth
  const containerHeight = chartRef.value.clientHeight
  
  svg = d3.select(chartRef.value)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight)
  
  xScale = d3.scaleBand()
    .domain(d3.range(arraySize.value))
    .range([30, containerWidth - 30])
    .padding(0.1)
  
  yScale = d3.scaleLinear()
    .domain([0, 500])
    .range([containerHeight - 40, 40])
  
  renderBars()
}

// ==================== 渲染柱子 ====================
function renderBars() {
  if (!svg || array.value.length === 0) return
  
  svg.selectAll('.bar-group').remove()
  
  const barGroups = svg.selectAll('.bar-group')
    .data(array.value)
    .enter()
    .append('g')
    .attr('class', 'bar-group')
    .attr('transform', function(d, i) {
      return 'translate(' + xScale(i) + ', 0)'
    })

  barGroups.append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', function(d) { return yScale(d) })
    .attr('width', xScale.bandwidth())
    .attr('height', function(d) { return yScale(0) - yScale(d) })
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('fill', function(d, i) {
      if (sortedIndices.value.includes(i)) return '#10b981'
      if (currentHighlight.value.includes(i)) return '#ef4444'
      return '#3b82f6'
    })

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

// ==================== 工具函数 ====================
function generateRandomArray() {
  array.value = Array.from({ length: arraySize.value }, function() {
    return Math.floor(Math.random() * 450) + 50
  })
  totalSteps = arraySize.value * Math.log2(arraySize.value) * 2
  currentStep = 0
  callStack.value = []
  completedStackLevel = 0
  
  compareCount.value = 0
  swapCount.value = 0
  progress.value = 0
  usedTime.value = 0
  currentHighlight.value = []
  sortedIndices.value = []
  pauseTotalTime = 0
  sortStartTime = 0
  
  initD3()
}

function resetSortStatus(isResetAll = true) {
  currentHighlight.value = []
  sortedIndices.value = []
  isPaused.value = false
  isAborted.value = false
  sortGenerator = null
  callStack.value = []
  completedStackLevel = 0
  
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  sortTimer = null
  timeUpdateTimer = null
  
  if (isResetAll) {
    compareCount.value = 0
    swapCount.value = 0
    progress.value = 0
    usedTime.value = 0
    pauseTotalTime = 0
    sortStartTime = 0
    isSorting.value = false
  }
  
  if (svg) renderBars()
}

function handleReset() {
  pauseSort()
  isAborted.value = true
  
  arraySize.value = DEFAULT_SIZE
  speedMs.value = DEFAULT_SPEED
  
  resetSortStatus(true)
  
  setTimeout(function() {
    isAborted.value = false
    generateRandomArray()
  }, 50)
}

function handleArraySizeChange() {
  if (arraySize.value < 5) arraySize.value = 5
  if (arraySize.value > 50) arraySize.value = 50
  
  totalSteps = arraySize.value * Math.log2(arraySize.value) * 2
  currentStep = 0
  callStack.value = []
  completedStackLevel = 0
  
  generateRandomArray()
  initD3()
}

function pauseSort() {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    pauseStartTime = Date.now()
    currentHighlight.value = []
    renderBars()
    if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  }
}

function delay(ms) {
  return new Promise(function(resolve) {
    sortTimer = setTimeout(resolve, ms)
  })
}

// ==================== 快速排序核心逻辑 ====================
function* quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotVal = arr[high]
    callStack.value.push({ low, high, pivot: pivotVal, completed: false })
    renderBars()
    yield arr

    const pivotIndex = yield* partition(arr, low, high)
    
    yield* quickSort(arr, low, pivotIndex - 1)
    yield* quickSort(arr, pivotIndex + 1, high)

    const currentStackItem = callStack.value.find(item => item.low === low && item.high === high)
    if(currentStackItem) currentStackItem.completed = true
    renderBars()
    yield arr
  }
}

function* partition(arr, low, high) {
  const pivot = arr[high]
  let i = low - 1
  for (let j = low; j < high; j++) {
    compareCount.value++
    currentHighlight.value = [j, high, i + 1]
    renderBars()
    yield arr
    
    if (arr[j] <= pivot) {
      i++
      [arr[i], arr[j]] = [arr[j], arr[i]]
      swapCount.value++
      currentHighlight.value = [i, j]
      renderBars()
      yield arr
    }
    
    currentStep++
    progress.value = Math.floor((currentStep / totalSteps) * 98)
  }
  
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
  swapCount.value++
  currentHighlight.value = [i+1, high]
  renderBars()
  yield arr
  
  return i + 1
}

async function startQuickSort() {
  if (isSorting.value) return
  isSorting.value = true
  isPaused.value = false
  isAborted.value = false
  
  const arr = [...array.value]
  const n = arr.length
  sortGenerator = quickSort(arr)
  
  sortStartTime = Date.now()
  
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
    
    if (!isAborted.value) {
      sortedIndices.value = Array.from({ length: n }, function(_, idx) {
        return idx
      })
      currentHighlight.value = []
      progress.value = 100
      callStack.value.forEach(item => item.completed = true)
      renderBars()
    }
  } finally {
    clearInterval(timeUpdateTimer)
    isSorting.value = false
  }
}

function startOrResumeSort() {
  if (isPaused.value) {
    pauseTotalTime += Date.now() - pauseStartTime
    isPaused.value = false
    startQuickSort()
    return
  }
  startQuickSort()
}

// ==================== 生命周期 ====================
onMounted(function() {
  generateRandomArray()
  initD3()
  
  // 窗口大小变化时，仅更新D3，不影响布局
  window.addEventListener('resize', function() {
    if (!isSorting.value) initD3()
  })
})

onUnmounted(function() {
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  
  window.removeEventListener('resize', initD3)
})
</script>

<style scoped>
/* 基础样式 */
.sort-page {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden !important; /* 禁止页面整体滚动 */
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}

.page-header {
  padding: 16px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 10;
  flex-shrink: 0; /* 固定头部 */
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
  overflow: hidden !important; /* 禁止容器滚动 */
  box-sizing: border-box;
}

/* 控制面板 */
.control-panel {
  background: #ffffff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; /* 固定控制面板 */
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

/* ==================== 核心优化：左右分栏固定布局 ==================== */
.main-visual-container {
  flex: 1;
  display: flex;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding-bottom: 8px;
  overflow: hidden !important; /* 禁止分栏容器滚动 */
}

/* 左侧：递归调用栈 - 滚动优化 */
.call-stack-container {
  width: 40%;
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden !important; /* 禁止容器本身滚动 */
  border: 1px solid #f0f4f9;
  flex-shrink: 0; /* 固定宽度，不被挤压 */
}

/* 栈标题栏 - 固定 */
.stack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f4f9;
  flex-shrink: 0; /* 固定标题栏 */
}

.stack-title {
  font-size: 16px;
  color: #1e293b;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stack-tip {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.active-dot {
  background-color: #4f46e5;
}

.completed-dot {
  background-color: #10b981;
}

/* 核心：滚动容器 - 唯一可滚动区域 */
.stack-scroll-container {
  flex: 1;
  overflow-y: auto !important; /* 仅垂直滚动 */
  overflow-x: hidden !important; /* 禁止水平滚动 */
  padding-right: 4px;
  scroll-behavior: smooth; /* 平滑滚动 */
  /* 优化滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f8fafc;
}

/* 滚动条美化 - Chrome/Safari */
.stack-scroll-container::-webkit-scrollbar {
  width: 6px;
}
.stack-scroll-container::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 3px;
  margin: 4px 0; /* 上下留空，不贴边 */
}
.stack-scroll-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.stack-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 栈列表 */
.stack-list {
  display: flex;
  flex-direction: column;
  gap: 8px; /* 减小间距，显示更多内容 */
  padding: 0 2px;
}

/* 栈项样式 */
.stack-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px; /* 减小内边距，优化密度 */
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px; /* 微调字体大小 */
  color: #475569;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stack-item.even {
  background: #fafbfc;
}

.stack-item.active {
  background: linear-gradient(135deg, #eef2ff 0%, #f5f7ff 100%);
  border-color: #4f46e5;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
}

.stack-item.completed {
  background: linear-gradient(135deg, #f0fdf4 0%, #f5fdf7 100%);
  border-color: #10b981;
  opacity: 0.95;
}

.stack-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.stack-index {
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.stack-item.active .stack-index {
  background: #4f46e5;
  color: white;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.stack-item.completed .stack-index {
  background: #10b981;
  color: white;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.stack-status {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background-color: #4f46e5;
  color: white;
}

.status-completed {
  background-color: #10b981;
  color: white;
}

.stack-item-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 4px;
}

.stack-info-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-label {
  color: #64748b;
  font-weight: 500;
  min-width: 65px;
  font-size: 11px;
}

.info-value {
  font-weight: 600;
  color: #1e293b;
}

.range-value {
  color: #3b82f6;
  font-family: monospace;
}

.pivot-value {
  color: #ef4444;
  font-family: monospace;
  font-size: 12px;
}

.stack-desc {
  font-size: 10px;
  color: #94a3b8;
  padding-left: 4px;
  margin-top: 1px;
  font-style: italic;
}

/* 空状态提示 */
.empty-stack {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.5;
}

/* ==================== 右侧：D3容器 - 完全固定 ==================== */
.d3-container {
  width: 60%;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden !important; /* 禁止D3容器滚动 */
  min-height: 300px;
  flex-shrink: 0; /* 固定宽度，不被挤压 */
  flex-grow: 1; /* 占满剩余空间 */
}

:deep(.bar-label) {
  user-select: none;
}

/* 响应式适配 - 保持右侧优先 */
@media (max-width: 900px) {
  .main-visual-container {
    flex-direction: column;
  }
  .call-stack-container {
    width: 100%;
    height: 35%; /* 限制左侧高度 */
    flex-shrink: 1;
  }
  .d3-container {
    width: 100%;
    height: 65%; /* 右侧占更多空间 */
    min-height: 250px;
    flex-shrink: 1;
  }
  :deep(.bar-label) {
    font-size: 10px;
  }
  .stack-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

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
  
  .page-header {
    padding: 10px 12px;
  }
  
  .flex-container {
    padding: 8px 10px;
  }
  
  .call-stack-container {
    padding: 12px;
  }
  
  .stack-item {
    padding: 8px 10px;
  }
}
</style>