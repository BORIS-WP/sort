<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>🪣 桶排序 (Bucket Sort) 可视化演示</h2>
    </div>

    <div class="flex-container">
      <ControlsPanel
        :array-size="arraySize"
        :speed-ms="speedMs"
        :is-sorting="isSorting"
        :is-paused="isPaused"
        :compare-count="compareCount"
        :swap-count="swapCount"
        :time-complexity="timeComplexity"
        :space-complexity="spaceComplexity"
        :progress="progress"
        :used-time="usedTime"
        @update-array-size="handleArraySizeChange"
        @update-speed-ms="speedMs = $event"
        @randomize="generateRandomArray"
        @start="startOrResumeSort"
        @pause="pauseSort"
        @reset="handleReset"
      />

      <div class="charts-container">
        <!-- 左侧：纯CSS网格桶可视化 -->
        <div class="chart-box">
          <div class="chart-title">📊 桶排序分桶过程</div>
          
          <div class="bucket-desc">
            <div class="desc-title">🔍 分桶标签说明</div>
            <ul class="desc-list">
              <li>📦 桶编号：排序时划分的数值区间容器</li>
              <li>📏 数值范围：每个桶容纳的数值区间</li>
              <li>🔢 元素数量：当前桶内的元素个数</li>
              <li>🟥 浅红标签：正在处理的桶 | 🟩 浅绿标签：已处理完成</li>
            </ul>
          </div>
          
          <div class="bucket-grid">
            <div 
              v-for="(bucket, idx) in buckets" 
              :key="`bucket-${idx}`"
              class="bucket-column"
              :class="{
                'bucket-active': idx === currentBucketIdx.value,
                'bucket-completed': idx < currentBucketIdx.value,
                'bucket-pending': idx > currentBucketIdx.value && currentBucketIdx.value !== -1
              }"
            >
              <div class="bucket-header">
                <div class="bucket-info">
                  <span class="bucket-label">桶 {{ idx + 1 }}</span>
                  <span class="bucket-count">{{ bucket.length }}</span>
                </div>
                <div class="bucket-range">{{ bucketRangeText[idx] || '空' }}</div>
              </div>
              
              <div class="bucket-content">
                <div 
                  v-for="(value, elemIdx) in bucket" 
                  :key="`bucket-${idx}-elem-${elemIdx}`"
                  class="bucket-element"
                  :style="{ 
                    backgroundColor: getBucketElementColor(idx, elemIdx),
                    animationDelay: `${elemIdx * 0.05}s`
                  }"
                >
                  {{ value }}
                </div>
                
                <div v-if="bucket.length === 0" class="empty-bucket">
                  空
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：原始数组柱状图 -->
        <div class="chart-box array-chart-box">
          <div class="chart-title">📈 原始/排序数组</div>
          <div class="array-container">
            <div
              v-for="(value, index) in array"
              :key="index"
              class="array-bar"
              :style="{
                height: `${(value / 500) * 300}px`, /* 将数值按比例映射到300px的最大高度 */
                backgroundColor: getBarColor(index),
                width: `${100 / arraySize - 0.6}%`
              }"
              :title="`数值：${value}`"
            >
              <span class="bar-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import ControlsPanel from '../components/ControlsPanel.vue'

// 初始默认值
const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 300

// 基础配置
const arraySize = ref(DEFAULT_SIZE)
const speedMs = ref(DEFAULT_SPEED)
const isSorting = ref(false)
const isPaused = ref(false)
const isAborted = ref(false)
const sortTimer = ref(null)
let timeUpdateTimer = null

// 性能统计
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n + k)')
const spaceComplexity = ref('O(n + k)')

// 排序核心数据
const array = ref([])
const compareIndices = ref([])
const sortedIndices = ref([])
const startTime = ref(0)
const pauseTotalTime = ref(0)
const pauseStartTime = ref(0)

// 桶排序可视化相关
const buckets = ref([])
const bucketRangeText = ref([])
const currentBucketIdx = ref(-1)

// 生成随机数组
const generateRandomArray = () => {
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 450) + 50)
  resetSortStatus(false)
}

// 重置排序状态
const resetSortStatus = (isResetAll = true) => {
  compareIndices.value = []
  sortedIndices.value = []
  buckets.value = []
  bucketRangeText.value = []
  currentBucketIdx.value = -1
  isPaused.value = false
  isAborted.value = false
  
  if (sortTimer.value) clearTimeout(sortTimer.value)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  sortTimer.value = null
  timeUpdateTimer = null
  
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

// 重置按钮逻辑
const handleReset = () => {
  pauseSort()
  isAborted.value = true
  arraySize.value = DEFAULT_SIZE
  speedMs.value = DEFAULT_SPEED
  resetSortStatus(true)
  generateRandomArray()
}

// 数组长度改变处理
const handleArraySizeChange = (newSize) => {
  arraySize.value = newSize
  generateRandomArray()
}

// 暂停排序
const pauseSort = () => {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    pauseStartTime.value = Date.now()
    compareIndices.value = []
    if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  }
}

// 睡眠函数
const sleep = async (ms) => {
  return new Promise(resolve => {
    sortTimer.value = setTimeout(resolve, ms)
  })
}

// 桶内元素颜色标记
const getBucketElementColor = (bucketIndex, elementIndex) => {
  if (bucketIndex === currentBucketIdx.value) {
    return '#ef4444' // 正在处理的桶
  }
  if (bucketIndex < currentBucketIdx.value) {
    return '#10b981' // 已处理完成的桶
  }
  return '#3b82f6' // 待处理的桶
}

// 柱状图颜色标记
const getBarColor = (index) => {
  if (sortedIndices.value.includes(index)) return '#10b981'
  if (compareIndices.value.includes(index)) return '#ef4444'
  return '#3b82f6'
}

// ==================== 桶排序核心算法 ====================
const bucketSort = async () => {
  const len = array.value.length
  if (len === 0) return

  timeUpdateTimer = setInterval(() => {
    if(!isPaused.value && isSorting.value){
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }
  }, 100)

  const min = Math.min(...array.value)
  const max = Math.max(...array.value)
  const bucketCount = Math.floor(len / 2) || 1
  const bucketRange = (max - min) / bucketCount
  
  // 初始化桶
  buckets.value = Array(bucketCount).fill().map(() => [])
  bucketRangeText.value = []
  
  // 生成桶范围文本
  for (let i = 0; i < bucketCount; i++) {
    const start = Math.round(min + i * bucketRange)
    const end = i === bucketCount - 1 
      ? Math.round(max) 
      : Math.round(min + (i + 1) * bucketRange - 1)
    bucketRangeText.value.push(`${start} ~ ${end}`)
  }

  // 1. 分桶阶段
  for (let i = 0; i < len; i++) {
    if (isPaused.value || isAborted.value) {
      if (timeUpdateTimer) clearInterval(timeUpdateTimer)
      return
    }
    
    compareIndices.value = [i]
    let val = array.value[i]
    let idx = Math.floor((val - min) / bucketRange)
    if (idx === bucketCount) idx--
    
    buckets.value[idx].push(val)
    compareCount.value++
    progress.value = Math.floor((i / len) * 30)
    
    await sleep(speedMs.value / 10)
  }

  progress.value = 30

  // 2. 桶内排序 + 合并阶段
  let result = []
  for (let b = 0; b < buckets.value.length; b++) {
    if (isPaused.value || isAborted.value) {
      if (timeUpdateTimer) clearInterval(timeUpdateTimer)
      return
    }
    
    currentBucketIdx.value = b
    let bucket = buckets.value[b]
    
    // 桶内插入排序
    for (let i = 1; i < bucket.length; i++) {
      if (isPaused.value || isAborted.value) {
        if (timeUpdateTimer) clearInterval(timeUpdateTimer)
        return
      }
      
      let key = bucket[i]
      let j = i - 1
      compareIndices.value = [result.length + i]
      
      while (j >= 0 && bucket[j] > key) {
        bucket[j + 1] = bucket[j]
        j--
        swapCount.value++
        await sleep(speedMs.value / 20)
      }
      
      bucket[j + 1] = key
      compareCount.value++
      await sleep(speedMs.value / 20)
    }
    
    // 合并桶
    result = result.concat(bucket)
    array.value.splice(0, array.value.length, ...result)
    
    progress.value = 30 + Math.floor(((b + 1) / buckets.value.length) * 70)
    await sleep(speedMs.value / 5)
  }

  // 排序完成
  sortedIndices.value = [...Array(len).keys()]
  compareIndices.value = []
  currentBucketIdx.value = -1
  progress.value = 100
  
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
  isSorting.value = false
}

// 开始/继续排序
const startOrResumeSort = async () => {
  if (isAborted.value) {
    resetSortStatus(false)
  }
  
  if (isPaused.value) {
    pauseTotalTime.value += Date.now() - pauseStartTime.value
    isPaused.value = false
    
    timeUpdateTimer = setInterval(() => {
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }, 100)
    
    await bucketSort()
    return
  }
  
  if (isSorting.value) return
  
  isSorting.value = true
  startTime.value = Date.now()
  await bucketSort()
}

// 监听窗口大小变化
const resizeHandler = () => {
  // 网格布局会自动适应
}

// 生命周期钩子
onMounted(() => {
  generateRandomArray()
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  if (sortTimer.value) clearTimeout(sortTimer.value)
})
</script>

<style scoped>
.sort-page {
  width: 100%;
  height: calc(100vh - 30px);
  margin: 0 auto 30px auto;
  overflow: hidden !important;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 10;
  flex-shrink: 0;
}

.back-btn {
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
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
  padding: 10px 16px !important;
  overflow: hidden !important;
  box-sizing: border-box;
  gap: 10px;
}

.charts-container {
  flex: 1;
  display: flex;
  gap: 12px;
  height: 100%;
  width: 100%;
}

.chart-box {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 300px;
}

.array-chart-box {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.chart-title {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.bucket-desc {
  background: #f8fafc;
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.desc-title {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}

.desc-list {
  margin: 0;
  padding-left: 16px;
  font-size: 10px;
  color: #475569;
  line-height: 1.4;
}

.desc-list li {
  margin-bottom: 1px;
}

.bucket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  overflow-y: auto;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
  flex: 1;
  height: 100%;
}

.bucket-column {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  transition: all 0.2s ease;
  position: relative;
}

.bucket-column::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(90deg, #e2e8f0, #e2e8f0);
}

.bucket-active {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.bucket-active::before {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.bucket-completed {
  border-color: #10b981;
  background-color: #f0fdf4;
}

.bucket-completed::before {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.bucket-pending {
  border-color: #94a3b8;
  background-color: #f8fafc;
  opacity: 0.8;
}

.bucket-pending::before {
  background: linear-gradient(90deg, #94a3b8, #cbd5e1);
}

.bucket-header {
  margin-bottom: 8px;
  flex-shrink: 0;
}

.bucket-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.bucket-label {
  font-weight: 700;
  font-size: 12px;
  color: #1e293b;
}

.bucket-count {
  font-weight: 700;
  font-size: 10px;
  color: #0284c7;
  background: #dbeafe;
  padding: 2px 6px;
  border-radius: 12px;
}

.bucket-range {
  font-size: 10px;
  color: #475569;
  text-align: center;
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 4px;
}

.bucket-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  padding: 4px;
}

.bucket-element {
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 6px;
  text-align: center;
  cursor: default;
  user-select: none;
  transition: all 0.2s ease;
  animation: fadeInUp 0.3s ease forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-bucket {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-style: italic;
  font-size: 12px;
}

.array-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  padding: 12px 12px 120px 12px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  margin-top: 10px;
  box-sizing: border-box;
  overflow: hidden !important;
}

.array-bar {
  border-radius: 4px 4px 0 0;
  transition: background-color 0.1s ease;
  flex-shrink: 0;
  position: relative;
  display: flex;
  justify-content: center;
}

.bar-value {
  position: absolute;
  top: -20px;
  font-size: 10px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 12px;
  }
  
  .flex-container {
    padding: 8px 10px !important;
  }
  
  .charts-container {
    flex-direction: column;
  }
  
  .chart-box {
    height: 50%;
    min-height: 200px;
  }
  
  .bucket-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
  
  .bucket-column {
    min-height: 150px;
    padding: 6px;
  }
  
  .bucket-element {
    font-size: 10px;
    padding: 4px 6px;
  }
  
  .bar-value {
    font-size: 8px;
    top: -16px;
  }
  
  .array-container {
    padding-bottom: 40px;
  }
  
  .bucket-range {
    font-size: 9px;
  }
  
  .bucket-label {
    font-size: 11px;
  }
}

/* 滚动条美化 */
.array-container::-webkit-scrollbar,
.bucket-content::-webkit-scrollbar,
.bucket-grid::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.array-container::-webkit-scrollbar-track,
.bucket-content::-webkit-scrollbar-track,
.bucket-grid::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 3px;
}

.array-container::-webkit-scrollbar-thumb,
.bucket-content::-webkit-scrollbar-thumb,
.bucket-grid::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}
</style>