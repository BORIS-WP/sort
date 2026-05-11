<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>基数排序</h2>
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

      <div class="main-container">
        <!-- 左侧：多轮分桶图 -->
        <div class="buckets-section">
          <div class="section-title">
            📊 第 {{ currentRound }} 轮分桶 (位数: {{ currentDigit }})
          </div>
          <div class="buckets-container">
            <div 
              v-for="(bucket, digit) in buckets" 
              :key="`bucket-${digit}`"
              class="bucket-column"
              :class="{
                'bucket-active': digit === currentBucketDigit,
                'bucket-completed': processedBuckets.includes(digit),
                'bucket-pending': !processedBuckets.includes(digit) && digit !== currentBucketDigit
              }"
            >
              <div class="bucket-header">
                <div class="bucket-label">桶 {{ digit }}</div>
                <div class="bucket-count">{{ bucket.length }} 个</div>
              </div>
              
              <div class="bucket-content">
                <div 
                  v-for="(num, idx) in bucket" 
                  :key="`bucket-${digit}-num-${idx}`"
                  class="bucket-element"
                  :style="{ 
                    backgroundColor: getBucketElementColor(digit, idx),
                    animationDelay: `${idx * 0.05}s`
                  }"
                >
                  {{ num }}
                </div>
                
                <div v-if="bucket.length === 0" class="empty-bucket">
                  空
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：排序过程数组 -->
        <div class="array-section">
          <div class="section-title">📈 排序过程数组</div>
          <div class="array-container">
            <div
              v-for="(value, index) in array"
              :key="index"
              class="array-bar"
              :style="{
                height: `${(value / 1000) * 350}px`, /* 将数值按比例映射到350px的最大高度 */
                backgroundColor: getBarColor(index),
                width: `${100 / arraySize - 0.6}%`
              }"
              :title="`索引: ${index}, 数值: ${value}`"
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
import { ref, onMounted, onUnmounted } from 'vue'
import ControlsPanel from '../components/ControlsPanel.vue'

// 初始默认值
const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 500

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
const timeComplexity = ref('O(d*(n+k))')
const spaceComplexity = ref('O(n+k)')

// 排序核心数据
const array = ref([])
const compareIndices = ref([])
const sortedIndices = ref([])
const startTime = ref(0)
const pauseTotalTime = ref(0)
const pauseStartTime = ref(0)

// 基数排序可视化相关
const buckets = ref(Array.from({ length: 10 }, () => []))
const currentRound = ref(0)
const currentDigit = ref(0)
const currentBucketDigit = ref(-1)
const processedBuckets = ref([])

// 生成随机数组 (限制在较小范围内便于观察)
const generateRandomArray = () => {
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 999) + 1)
  resetSortStatus(false)
}

// 重置排序状态
const resetSortStatus = (isResetAll = true) => {
  compareIndices.value = []
  sortedIndices.value = []
  buckets.value = Array.from({ length: 10 }, () => [])
  currentRound.value = 0
  currentDigit.value = 0
  currentBucketDigit.value = -1
  processedBuckets.value = []
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

// 获取某一位的数字
const getDigit = (num, digitPlace) => {
  return Math.floor(num / Math.pow(10, digitPlace)) % 10
}

// 桶内元素颜色标记
const getBucketElementColor = (bucketDigit, elementIndex) => {
  if (bucketDigit === currentBucketDigit.value) {
    return '#ef4444' // 正在处理的桶
  }
  if (processedBuckets.value.includes(bucketDigit)) {
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

// ==================== 基数排序核心算法 ====================
const radixSort = async () => {
  const len = array.value.length
  if (len === 0) return

  timeUpdateTimer = setInterval(() => {
    if(!isPaused.value && isSorting.value){
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }
  }, 100)

  // 找到最大数，确定位数
  const maxNum = Math.max(...array.value)
  const maxDigits = Math.floor(Math.log10(maxNum)) + 1

  // 逐位进行计数排序
  for (let digit = 0; digit < maxDigits; digit++) {
    if (isPaused.value || isAborted.value) {
      if (timeUpdateTimer) clearInterval(timeUpdateTimer)
      return
    }
    
    currentRound.value = digit + 1
    currentDigit.value = digit
    currentBucketDigit.value = -1
    processedBuckets.value = []
    
    // 清空桶
    buckets.value = Array.from({ length: 10 }, () => [])
    
    // 将数组元素分配到桶中
    for (let i = 0; i < len; i++) {
      if (isPaused.value || isAborted.value) {
        if (timeUpdateTimer) clearInterval(timeUpdateTimer)
        return
      }
      
      compareIndices.value = [i]
      const num = array.value[i]
      const digitValue = getDigit(num, digit)
      
      buckets.value[digitValue].push(num)
      currentBucketDigit.value = digitValue
      
      compareCount.value++
      progress.value = Math.floor((digit / maxDigits) * 100 + (i / len) * (100 / maxDigits) * 0.3)
      
      await sleep(speedMs.value / 15)
    }
    
    // 从桶中收集元素回数组
    let index = 0
    for (let bucketDigit = 0; bucketDigit < 10; bucketDigit++) {
      if (isPaused.value || isAborted.value) {
        if (timeUpdateTimer) clearInterval(timeUpdateTimer)
        return
      }
      
      currentBucketDigit.value = bucketDigit
      processedBuckets.value.push(bucketDigit)
      
      const bucket = buckets.value[bucketDigit]
      for (let j = 0; j < bucket.length; j++) {
        if (isPaused.value || isAborted.value) {
          if (timeUpdateTimer) clearInterval(timeUpdateTimer)
          return
        }
        
        array.value[index] = bucket[j]
        compareIndices.value = [index]
        index++
        
        swapCount.value++
        progress.value = Math.floor((digit / maxDigits) * 100 + 30 + (index / len) * (100 / maxDigits) * 0.7)
        
        await sleep(speedMs.value / 10)
      }
    }
  }

  // 排序完成
  sortedIndices.value = [...Array(len).keys()]
  compareIndices.value = []
  currentBucketDigit.value = -1
  processedBuckets.value = []
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
    
    await radixSort()
    return
  }
  
  if (isSorting.value) return
  
  isSorting.value = true
  startTime.value = Date.now()
  await radixSort()
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

.main-container {
  display: flex;
  gap: 16px;
  flex: 1;
  height: 100%;
}

.buckets-section, .array-section {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 300px;
}

.section-title {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.buckets-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 8px;
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
  height: 4px;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(90deg, #e2e8f0, #e2e8f0);
}

.bucket-active {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
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
  display: flex;
  flex-direction: column;
  align-items: center;
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
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
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
  align-items: flex-end;
}

.bar-value {
  position: absolute;
  top: -24px;
  font-size: 10px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
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
  
  .main-container {
    flex-direction: column;
  }
  
  .buckets-section, .array-section {
    height: 45%;
    min-height: 250px;
  }
  
  .buckets-container {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
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
    top: -20px;
  }
  
  .array-container {
    padding-bottom: 60px;
  }
  
  .bucket-label {
    font-size: 11px;
  }
  
  .bucket-count {
    font-size: 9px;
  }
}

/* 滚动条美化 */
.array-container::-webkit-scrollbar,
.bucket-content::-webkit-scrollbar,
.buckets-container::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.array-container::-webkit-scrollbar-track,
.bucket-content::-webkit-scrollbar-track,
.buckets-container::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 3px;
}

.array-container::-webkit-scrollbar-thumb,
.bucket-content::-webkit-scrollbar-thumb,
.buckets-container::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}
</style>