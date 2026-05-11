<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>📥 插入排序 (Insertion Sort) 可视化演示</h2>
    </div>

    <div class="flex-container">
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

      <div ref="chartRef" class="d3-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'

// 基础配置（和冒泡/选择完全一致）
const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 300

// 核心状态
const arraySize = ref(DEFAULT_SIZE)
const speedMs = ref(DEFAULT_SPEED)
const isSorting = ref(false)
const isPaused = ref(false)
const isAborted = ref(false)

// D3 引用
const chartRef = ref(null)
let svg = null
let xScale = null
let yScale = null

// 统计数据
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n²)')
const spaceComplexity = ref('O(1)')

// 排序数据（和冒泡/选择完全一致）
const array = ref([])
const currentHighlight = ref([]) // 当前高亮索引
const sortedIndices = ref([])    // 已排序索引

// 定时器
let sortTimer = null
let timeUpdateTimer = null
let sortStartTime = 0

// ==================== D3 初始化（和冒泡/选择完全一致）====================
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
  
  // 定义比例尺（和冒泡/选择一致）
  xScale = d3.scaleBand()
    .domain(d3.range(arraySize.value))
    .range([50, containerWidth - 50])
    .padding(0.1)
  
  yScale = d3.scaleLinear()
    .domain([0, 500])
    .range([containerHeight - 50, 50])
  
  // 渲染柱子
  renderBars()
}

// ==================== 渲染柱子（动画和冒泡/选择完全一致）====================
function renderBars() {
  if (!svg || array.value.length === 0) return
  
  // 移除旧柱子
  svg.selectAll('.bar-group').remove()
  
  // 创建柱子组
  const barGroups = svg.selectAll('.bar-group')
    .data(array.value)
    .enter()
    .append('g')
    .attr('class', 'bar-group')
    .attr('transform', function(d, i) {
      return 'translate(' + xScale(i) + ', 0)'
    })

  // 绘制柱子（基础样式，无额外动画）
  barGroups.append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', function(d) { return yScale(d) })
    .attr('width', xScale.bandwidth())
    .attr('height', function(d) { return yScale(0) - yScale(d) })
    .attr('rx', 6)
    .attr('ry', 6)
    // 颜色逻辑和冒泡/选择完全一致
    .attr('fill', function(d, i) {
      if (sortedIndices.value.includes(i)) return '#10b981'  // 已排序：绿色
      if (currentHighlight.value.includes(i)) return '#ef4444' // 比较中：红色
      return '#3b82f6'                                       // 默认：蓝色
    })

  // 数值标签（和冒泡/选择完全一致）
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

// ==================== 工具函数（和冒泡/选择完全一致）====================
function generateRandomArray() {
  array.value = Array.from({ length: arraySize.value }, function() {
    return Math.floor(Math.random() * 450) + 50
  })
  
  // 重置所有状态
  compareCount.value = 0
  swapCount.value = 0
  progress.value = 0
  usedTime.value = 0
  currentHighlight.value = []
  sortedIndices.value = []
  
  initD3()
}

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
  
  setTimeout(function() {
    isAborted.value = false
    generateRandomArray()
  }, 50)
}

function handleArraySizeChange() {
  if (arraySize.value < 5) arraySize.value = 5
  if (arraySize.value > 50) arraySize.value = 50
  generateRandomArray()
}

function pauseSort() {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    currentHighlight.value = [] 
    renderBars() 
  }
}

function delay(ms) {
  return new Promise(function(resolve) {
    sortTimer = setTimeout(resolve, ms)
  })
}

// ==================== 插入排序核心逻辑（动画和冒泡/选择一致）====================
async function insertionSort() {
  if (isSorting.value) return
  isSorting.value = true
  isPaused.value = false
  isAborted.value = false
  
  const arr = [...array.value] 
  const n = arr.length
  const totalSteps = n * (n - 1) 
  let currentStep = 0
  
  // 记录开始时间
  sortStartTime = performance.now()
  
  // 时间更新定时器
  timeUpdateTimer = setInterval(function() {
    if (!isPaused.value) {
      usedTime.value = Math.round(performance.now() - sortStartTime)
    }
  }, 50)
  
  try {
    for (let i = 1; i < n; i++) {
      if (isAborted.value) break
      
      // 暂停判断
      while (isPaused.value) {
        await delay(50)
        if (isAborted.value) break
      }
      
      const key = arr[i]
      let j = i - 1
      
      // 标记当前比较元素（和冒泡/选择一致的红色高亮）
      currentHighlight.value = [i, j]
      renderBars()
      await delay(speedMs.value)
      
      // 向前比较并移动元素
      while (j >= 0 && arr[j] > key) {
        if (isAborted.value) break
        while (isPaused.value) {
          await delay(50)
          if (isAborted.value) break
        }
        
        // 统计比较次数
        compareCount.value++
        currentStep++
        
        // 更新进度
        progress.value = Math.floor((currentStep / totalSteps) * 100)
        
        // 移动元素
        arr[j + 1] = arr[j]
        
        // 标记移动的元素（红色高亮）
        currentHighlight.value = [j, j + 1]
        array.value = [...arr] 
        renderBars()
        await delay(speedMs.value)
        
        // 统计交换次数
        swapCount.value++
        j--
      }
      
      // 插入元素
      arr[j + 1] = key
      array.value = [...arr] 
      
      // 清空高亮，标记已排序
      currentHighlight.value = []
      sortedIndices.value = Array.from({ length: i + 1 }, function(_, idx) {
        return idx
      })
      renderBars()
      await delay(speedMs.value)
    }
    
    // 排序完成：标记所有元素为已排序（绿色）
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

function startOrResumeSort() {
  if (isPaused.value) {
    isPaused.value = false
    insertionSort()
    return
  }
  insertionSort()
}

// ==================== 生命周期（和冒泡/选择完全一致）====================
onMounted(function() {
  generateRandomArray()
  initD3()
  window.addEventListener('resize', initD3)
  
  watch([arraySize, speedMs], function() {
    if (!isSorting.value) {
      initD3()
      renderBars()
    }
  })
})

onUnmounted(function() {
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  window.removeEventListener('resize', initD3)
})
</script>

<style scoped>
/* 样式和冒泡/选择排序完全一致，无额外动画样式 */
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

/* 响应式适配（和冒泡/选择完全一致） */
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