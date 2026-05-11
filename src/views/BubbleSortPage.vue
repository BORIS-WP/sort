<!-- src/views/BubbleSortPage.vue -->
<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>🫧 冒泡排序 (Bubble Sort) 可视化演示</h2>
    </div>

    <div class="flex-container">
      <!-- 控制面板 -->
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

      <!-- D3.js 绘图容器 -->
      <div ref="chartRef" class="d3-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
// 导入D3.js核心模块
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

// D3.js 核心引用
const chartRef = ref(null)
let svg = null          // D3 SVG容器
let xScale = null       // X轴比例尺
let yScale = null       // Y轴比例尺
let sortTimer = null    // 排序定时器

// 统计数据
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n²)')
const spaceComplexity = ref('O(1)')

// 排序数据
const array = ref([])
let originalArray = []  // 保存原始数组用于重置
const sortCursor = ref({ i: 0, j: 0 })
const startTime = ref(0)
const pauseTotalTime = ref(0)
const pauseStartTime = ref(0)

// ✅ 初始化D3.js容器（核心方法）
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
  
  // 创建比例尺
  // X轴：线性比例尺，分配每个柱子的宽度和间距
  xScale = d3.scaleBand()
    .domain(d3.range(arraySize.value))
    .range([50, containerWidth - 50])
    .padding(0.1)
  
  // Y轴：线性比例尺，映射数值到高度
  const maxValue = Math.max(...array.value, 100) // 确保有最小值避免比例尺错误
  yScale = d3.scaleLinear()
    .domain([0, maxValue])
    .range([containerHeight - 50, 50]) // 反转Y轴（SVG Y轴向下）
  
  // 绘制初始柱状图
  renderBars()
}

// ✅ 渲染/更新D3柱状图（核心可视化方法）
const renderBars = (highlightIndices = [], sortedIndices = []) => {
  if (!svg) return
  
  // 创建比例尺（因为可能在渲染时数组最大值改变了）
  const maxValue = Math.max(...array.value, 100)
  yScale.domain([0, maxValue])
  
  // 绑定数据并创建柱子组
  const barGroups = svg.selectAll('.bar-group')
    .data(array.value, (d, i) => i) // 使用索引作为key，确保数据绑定正确
    .join(
      enter => {
        const groups = enter
          .append('g')
          .attr('class', 'bar-group')
        
        // 添加矩形
        groups.append('rect')
          .attr('class', 'bar')
          .attr('x', (d, i) => xScale(i))
          .attr('y', d => yScale(d))
          .attr('width', xScale.bandwidth())
          .attr('height', d => yScale(0) - yScale(d))
          .attr('rx', 6)
          .attr('ry', 6)
          .attr('fill', (d, i) => {
            if (highlightIndices.includes(i)) return '#ef4444'
            if (sortedIndices.includes(i)) return '#10b981'
            return '#3b82f6'
          })
          .attr('filter', (d, i) => {
            if (highlightIndices.includes(i)) return 'url(#highlight-shadow)'
            return 'url(#default-shadow)'
          })
        
        // 添加数值标签
        groups.append('text')
          .attr('class', 'bar-label')
          .attr('x', (d, i) => xScale(i) + xScale.bandwidth() / 2)
          .attr('y', d => yScale(d) - 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', 11)
          .attr('font-weight', 600)
          .attr('fill', '#1e293b')
          .text(d => d)
        
        // 添加柱子hover提示
        groups.append('title')
          .text((d, i) => `第${i+1}个元素：${d}`)
        
        return groups
      },
      update => {
        // 更新现有元素的位置
        update.select('.bar-group')
          .attr('transform', (d, i) => `translate(${xScale(i)}, 0)`)
        
        // 更新矩形
        update.select('.bar')
          .transition()
          .duration(speedMs.value / 2)
          .attr('y', d => yScale(d))
          .attr('height', d => yScale(0) - yScale(d))
          .attr('fill', (d, i) => {
            if (highlightIndices.includes(i)) return '#ef4444'
            if (sortedIndices.includes(i)) return '#10b981'
            return '#3b82f6'
          })
          .attr('filter', (d, i) => {
            if (highlightIndices.includes(i)) return 'url(#highlight-shadow)'
            return 'url(#default-shadow)'
          })
        
        // 更新标签
        update.select('.bar-label')
          .transition()
          .duration(speedMs.value / 2)
          .attr('y', d => yScale(d) - 8)
          .text(d => d)
        
        return update
      },
      exit => exit.remove()
    )
  
  // 添加滤镜定义（只添加一次）
  if (svg.select('#default-shadow').empty()) {
    const defs = svg.append('defs')
    
    // 默认阴影
    const defaultShadow = defs.append('filter')
      .attr('id', 'default-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%')
    
    defaultShadow.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 2)
      .attr('stdDeviation', 3)
      .attr('flood-color', 'rgba(59, 130, 246, 0.2)')
    
    // 高亮阴影
    const highlightShadow = defs.append('filter')
      .attr('id', 'highlight-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%')
    
    highlightShadow.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 4)
      .attr('stdDeviation', 3)
      .attr('flood-color', 'rgba(239, 68, 68, 0.3)')
  }
}

// 生成随机数组
const generateRandomArray = () => {
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 450) + 50)
  originalArray = [...array.value] // 保存原始数组
  resetSortStatus(false)
  nextTick(() => {
    initD3() // 重新初始化D3
  })
}

// 重置排序状态
const resetSortStatus = (isResetAll = true) => {
  isPaused.value = false
  isAborted.value = false
  sortCursor.value = { i: 0, j: 0 }
  
  if (sortTimer) {
    clearTimeout(sortTimer)
    sortTimer = null
  }
  
  if (isResetAll) {
    compareCount.value = 0
    swapCount.value = 0
    progress.value = 0
    usedTime.value = 0
    pauseTotalTime.value = 0
    startTime.value = 0
    isSorting.value = false
  }
}

// 重置所有
const handleReset = () => {
  isAborted.value = true
  arraySize.value = DEFAULT_SIZE
  speedMs.value = DEFAULT_SPEED
  resetSortStatus(true)
  generateRandomArray()
}

// 数组长度改变
const handleArraySizeChange = (newSize) => {
  if (newSize < 5) newSize = 5
  if (newSize > 50) newSize = 50
  arraySize.value = newSize
  generateRandomArray()
}

// 暂停排序
const pauseSort = () => {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    pauseStartTime.value = Date.now()
    // 高亮已排序的柱子
    const sortedIdx = [...Array(arraySize.value).keys()].filter(idx => idx >= arraySize.value - sortCursor.value.i - 1)
    renderBars([], sortedIdx)
  }
}

// 计算总比较次数（用于进度计算）
const getTotalComparisons = (n) => {
  // 冒泡排序最坏情况下比较次数为 n*(n-1)/2
  return (n * (n - 1)) / 2
}

// ✅ 纯D3.js冒泡排序核心（异步+动画）
const bubbleSort = async () => {
  const len = array.value.length
  const totalComparisons = getTotalComparisons(len)
  let currentComparison = 0
  
  const { i: startI, j: startJ } = sortCursor.value
  
  for (let i = startI; i < len - 1 && !isAborted.value; i++) {
    let hasSwapped = false
    const startJVal = i === startI ? startJ : 0
    
    for (let j = startJVal; j < len - 1 - i && !isAborted.value; j++) {
      // 暂停/终止判断
      while (isPaused.value && !isAborted.value) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      if (isAborted.value) return
      
      // 1. 高亮当前对比的两个柱子
      compareCount.value++
      currentComparison++
      const highlightIdx = [j, j+1]
      const sortedIdx = [...Array(len).keys()].filter(idx => idx >= len - i)
      
      // 更新耗时和进度
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
      progress.value = Math.min(100, Math.floor((currentComparison / totalComparisons) * 100))
      
      // 渲染高亮状态
      renderBars(highlightIdx, sortedIdx)
      
      // 2. 交换元素
      if (array.value[j] > array.value[j + 1]) {
        [array.value[j], array.value[j + 1]] = [array.value[j + 1], array.value[j]]
        swapCount.value++
        hasSwapped = true
        
        // 交换后重新渲染，保持高亮
        renderBars(highlightIdx, sortedIdx)
      }
      
      // 3. 等待指定时间（控制排序速度）
      await new Promise(resolve => {
        sortTimer = setTimeout(() => {
          // 取消高亮（仅保留已排序柱子）
          renderBars([], sortedIdx)
          resolve()
        }, speedMs.value)
      })
    }
    
    sortCursor.value = { i: i + 1, j: 0 }
  }
  
  // 排序完成
  finishSort()
}

// 排序完成收尾
const finishSort = () => {
  if (!isAborted.value) {
    progress.value = 100
    usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    // 所有柱子标为绿色（已排序）
    renderBars([], [...Array(arraySize.value).keys()])
  }
  isSorting.value = false
}

// 开始/继续排序
const startOrResumeSort = async () => {
  if (isAborted.value) {
    resetSortStatus(false)
  }
  
  if (isPaused.value) {
    // 继续排序
    isPaused.value = false
    pauseTotalTime.value += Date.now() - pauseStartTime.value
    await bubbleSort()
    return
  }
  
  if (isSorting.value) return
  
  // 开始新排序
  isSorting.value = true
  resetSortStatus(false)
  startTime.value = Date.now()
  await bubbleSort()
}

// 监听窗口大小变化，重新渲染D3图表
const handleResize = () => {
  if (chartRef.value) {
    initD3()
  }
}

// 生命周期钩子
onMounted(() => {
  // 初始化数据和D3
  generateRandomArray()
  nextTick(() => initD3())
  
  // 添加窗口resize监听
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 移除监听和清理资源
  window.removeEventListener('resize', handleResize)
  if (sortTimer) clearTimeout(sortTimer)
  if (svg) {
    svg.remove()
    svg = null
  }
})
</script>

<style scoped>
/* 全局样式 */
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

/* 页面头部 */
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

/* 弹性容器 */
.flex-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

/* 控制面板 */
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

button:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-1px);
}

button:disabled {
  background: #cbd5e1;
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
  text-align: center;
}

/* D3.js 容器样式（占满剩余空间） */
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

/* D3 元素样式（穿透scoped） */
:deep(.bar) {
  transition: all 0.2s ease;
}

:deep(.bar-label) {
  user-select: none;
}

/* 响应式适配 */
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