<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>🎯 选择排序 (Selection Sort) 可视化演示</h2>
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
              @change="handleArraySizeChange(arraySize)"
              :disabled="isSorting"
            >
            <label>速度(ms)：</label>
            <input 
              type="number" 
              v-model.number="speedMs" 
              min="50" 
              max="1000" 
              @change="speedMs = $event.target.value"
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

// 初始配置
const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 300

// 核心状态
const arraySize = ref(DEFAULT_SIZE)
const speedMs = ref(DEFAULT_SPEED)
const isSorting = ref(false)
const isPaused = ref(false)
const isAborted = ref(false)

// D3引用
const chartRef = ref(null)
let svg = null
let xScale = null
let yScale = null
let sortTimer = null      // 排序延时器
let timeUpdateTimer = null // 时间更新定时器

// 统计数据（核心修复：确保重置能清空所有数据）
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n²)')
const spaceComplexity = ref('O(1)')

// 排序数据
const array = ref([])
const startTime = ref(0)         // 排序开始时间
const pauseTotalTime = ref(0)    // 累计暂停时长
const pauseStartTime = ref(0)    // 单次暂停开始时间

// 高亮/排序状态（核心修复：重置时清空所有高亮）
const currentI = ref(-1)         // 当前外层循环索引
const currentJ = ref(-1)         // 当前内层循环索引
const currentMin = ref(-1)       // 当前最小值索引
const sortedIndices = ref([])    // 已排序索引

// ✅ 初始化D3（保持和冒泡排序一致）
const initD3 = () => {
  if (!chartRef.value) return
  
  // 清空容器
  d3.select(chartRef.value).selectAll('*').remove()
  
  // 获取容器尺寸
  const containerWidth = chartRef.value.clientWidth
  const containerHeight = chartRef.value.clientHeight
  
  // 创建SVG容器
  svg = d3.select(chartRef.value)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight)
    .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
  
  // 定义比例尺
  xScale = d3.scaleBand()
    .domain(d3.range(arraySize.value))
    .range([50, containerWidth - 50])
    .padding(0.1)
  
  yScale = d3.scaleLinear()
    .domain([0, 500])
    .range([containerHeight - 50, 50])
  
  // 渲染初始柱子
  renderBars()
}

// ✅ 渲染柱子（核心修复：依赖最新状态渲染）
const renderBars = () => {
  if (!svg) return
  
  // 移除旧柱子
  svg.selectAll('.bar-group').remove()
  
  // 绑定数据创建柱子组
  const barGroups = svg.selectAll('.bar-group')
    .data(array.value)
    .enter()
    .append('g')
    .attr('class', 'bar-group')
    .attr('transform', (d, i) => `translate(${xScale(i)}, 0)`)
  
  // 绘制柱子
  barGroups.append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', d => yScale(d))
    .attr('width', xScale.bandwidth())
    .attr('height', d => yScale(0) - yScale(d))
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('fill', (_, i) => {
      // 已排序：绿色 | 对比中：红色 | 未处理：蓝色
      if (sortedIndices.value.includes(i)) return '#10b981'
      if (i === currentI.value || i === currentJ.value || i === currentMin.value) return '#ef4444'
      return '#3b82f6'
    })
    .attr('filter', (_, i) => {
      if (i === currentI.value || i === currentJ.value || i === currentMin.value) {
        return 'drop-shadow(0 4px 3px rgba(239, 68, 68, 0.3))'
      }
      return 'drop-shadow(0 2px 3px rgba(59, 130, 246, 0.2))'
    })
  
  // 绘制数值标签
  barGroups.append('text')
    .attr('class', 'bar-label')
    .attr('x', xScale.bandwidth() / 2)
    .attr('y', d => yScale(d) - 8)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('fill', '#1e293b')
    .text(d => d)
  
  // 添加hover提示
  barGroups.append('title')
    .text((d, i) => `第${i+1}个元素：${d}`)
}

// ✅ 生成随机数组（核心修复：重置所有状态）
const generateRandomArray = () => {
  // 1. 生成新数组
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 450) + 50)
  
  // 2. 清空所有统计数据（核心修复点）
  compareCount.value = 0
  swapCount.value = 0
  progress.value = 0
  usedTime.value = 0
  
  // 3. 清空所有排序状态（核心修复点）
  currentI.value = -1
  currentJ.value = -1
  currentMin.value = -1
  sortedIndices.value = []
  
  // 4. 重置定时器（核心修复点）
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  sortTimer = null
  timeUpdateTimer = null
  
  // 5. 重置排序标记
  isSorting.value = false
  isPaused.value = false
  isAborted.value = false
  pauseTotalTime.value = 0
  pauseStartTime.value = 0
  
  // 6. 重新渲染
  nextTick(() => initD3())
}

// ✅ 重置所有（核心修复：强制终止+彻底重置）
const handleReset = () => {
  // 1. 强制终止排序进程
  isAborted.value = true
  
  // 2. 清空所有定时器（核心修复点）
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  sortTimer = null
  timeUpdateTimer = null
  
  // 3. 恢复默认配置
  arraySize.value = DEFAULT_SIZE
  speedMs.value = DEFAULT_SPEED
  
  // 4. 延迟执行重置（确保排序进程完全终止）
  setTimeout(() => {
    isAborted.value = false
    generateRandomArray() // 调用生成数组，自动清空所有数据
  }, 50)
}

// ✅ 数组长度改变（保持和冒泡一致）
const handleArraySizeChange = (newSize) => {
  if (newSize < 5) newSize = 5
  if (newSize > 50) newSize = 50
  arraySize.value = newSize
  generateRandomArray()
}

// ✅ 暂停排序（保持和冒泡一致）
const pauseSort = () => {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    pauseStartTime.value = Date.now()
    // 清空高亮，仅保留已排序
    currentI.value = -1
    currentJ.value = -1
    currentMin.value = -1
    renderBars()
  }
}

// ✅ 延时函数（封装定时器，方便清理）
const sleep = (ms) => {
  return new Promise(resolve => {
    sortTimer = setTimeout(resolve, ms)
  })
}

// ✅ 选择排序核心（保持算法逻辑，优化状态管理）
const selectionSort = async () => {
  const len = array.value.length
  const totalSteps = len * (len - 1) / 2 // 总步骤数
  let currentStep = 0
  
  // 初始化时间更新定时器
  timeUpdateTimer = setInterval(() => {
    if (!isPaused.value && isSorting.value) {
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }
  }, 50)
  
  try {
    for (let i = 0; i < len - 1 && !isAborted.value; i++) {
      // 暂停判断
      while (isPaused.value && !isAborted.value) {
        await sleep(50) // 暂停时轮询，避免卡死
      }
      if (isAborted.value) break
      
      // 更新外层循环状态
      currentI.value = i
      currentMin.value = i
      
      for (let j = i + 1; j < len && !isAborted.value; j++) {
        // 暂停判断
        while (isPaused.value && !isAborted.value) {
          await sleep(50)
        }
        if (isAborted.value) break
        
        // 更新内层循环状态
        currentJ.value = j
        
        // 统计比较次数
        compareCount.value++
        currentStep++
        
        // 更新进度
        progress.value = Math.floor((currentStep / totalSteps) * 100)
        
        // 渲染当前状态
        renderBars()
        
        // 等待指定速度
        await sleep(speedMs.value)
        
        // 更新最小值索引
        if (array.value[j] < array.value[currentMin.value]) {
          currentMin.value = j
        }
      }
      
      // 交换最小值和当前位置
      if (currentMin.value !== i && !isAborted.value) {
        [array.value[i], array.value[currentMin.value]] = [array.value[currentMin.value], array.value[i]]
        swapCount.value++
        renderBars()
        await sleep(speedMs.value / 2)
      }
      
      // 标记已排序
      sortedIndices.value.push(i)
      currentI.value = -1
      currentJ.value = -1
      currentMin.value = -1
      renderBars()
    }
    
    // 排序完成（核心修复：确保进度100%）
    if (!isAborted.value) {
      sortedIndices.value = [...Array(len).keys()]
      progress.value = 100
      renderBars()
    }
  } finally {
    // 清理定时器
    clearInterval(timeUpdateTimer)
    timeUpdateTimer = null
    isSorting.value = false
  }
}

// ✅ 开始/继续排序（核心修复：重置终止标记）
const startOrResumeSort = async () => {
  // 1. 如果是终止状态，先重置
  if (isAborted.value) {
    isAborted.value = false
  }
  
  // 2. 如果是暂停状态，继续排序
  if (isPaused.value) {
    pauseTotalTime.value += Date.now() - pauseStartTime.value
    isPaused.value = false
    await selectionSort()
    return
  }
  
  // 3. 如果正在排序，直接返回
  if (isSorting.value) return
  
  // 4. 开始新排序
  isSorting.value = true
  startTime.value = Date.now()
  await selectionSort()
}

// ✅ 窗口resize监听
const handleResize = () => {
  if (chartRef.value) {
    initD3()
  }
}

// 生命周期
onMounted(() => {
  generateRandomArray()
  nextTick(() => initD3())
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (sortTimer) clearTimeout(sortTimer)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  if (svg) svg.remove()
})
</script>

<style scoped>
/* 样式保持和冒泡排序完全一致 */
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

:deep(.bar) {
  transition: all 0.2s ease;
}

:deep(.bar-label) {
  user-select: none;
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
  
  .d3-container {
    min-height: 300px;
  }
  
  :deep(.bar-label) {
    font-size: 10px;
  }
}
</style>