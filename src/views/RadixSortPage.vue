
<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>🔢 基数排序 (Radix Sort) 可视化演示</h2>
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

      <div class="array-container">
        <div
          v-for="(value, index) in array"
          :key="index"
          class="array-bar"
          :style="{
            height: `${value}px`,
            backgroundColor: getBarColor(index),
            width: `${100 / arraySize - 0.6}%`
          }"
          :title="`数值：${value}`"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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
let timeUpdateTimer = null;

// 性能统计数据 - 实时动态更新
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(d × (n + k))')
const spaceComplexity = ref('O(n + k)')

// 排序核心数据
const array = ref([])
const compareIndices = ref([])
const sortedIndices = ref([])
const startTime = ref(0)
const pauseTotalTime = ref(0)
const pauseStartTime = ref(0)
let digitSortStep = 0
let totalDigit = 0

// 生成随机数组 (基数排序适配 三位数 更合理)
const generateRandomArray = () => {
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 399) + 100)
  resetSortStatus(false)
}

// 重置排序状态（含定时器销毁，无内存泄漏）
const resetSortStatus = (isResetAll = true) => {
  compareIndices.value = []
  sortedIndices.value = []
  isPaused.value = false
  isAborted.value = false
  digitSortStep = 0
  totalDigit = 0
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

// 核心重置逻辑
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

// 暂停排序函数
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

// ✅ 基数排序核心异步逻辑 完整保留 + 实时统计修复 【一行未改核心逻辑】
async function radixSort(arr) {
  const max = Math.max(...arr)
  let exp = 1
  totalDigit = max.toString().length
  digitSortStep = 0

  while (Math.floor(max / exp) > 0 && !isPaused.value && !isAborted.value) {
    await countingSortByDigit(arr, exp)
    digitSortStep++
    progress.value = Math.floor((digitSortStep / totalDigit) * 95)
    exp *= 10
    await sleep(speedMs.value * 2)
  }
}

async function countingSortByDigit(arr, exp) {
  const n = arr.length
  const output = new Array(n)
  const count = new Array(10).fill(0)

  // 统计当前位数字出现次数
  for (let i = 0; i < n; i++) {
    if(isPaused.value || isAborted.value) return
    const digit = Math.floor(arr[i] / exp) % 10
    count[digit]++
    compareCount.value++
    compareIndices.value = [i]
    await sleep(speedMs.value / 15)
  }

  // 累加计数，确定元素位置
  for (let i = 1; i < 10; i++) {
    if(isPaused.value || isAborted.value) return
    count[i] += count[i - 1]
    compareCount.value++
    await sleep(speedMs.value / 20)
  }

  // 逆序赋值保证稳定性
  for (let i = n - 1; i >= 0; i--) {
    if(isPaused.value || isAborted.value) return
    const digit = Math.floor(arr[i] / exp) % 10
    output[count[digit] - 1] = arr[i]
    count[digit]--
    swapCount.value++
    compareIndices.value = [count[digit]]
    array.value = [...output]
    await sleep(speedMs.value / 10)
  }

  // 更新原数组
  for (let i = 0; i < n; i++) {
    if(isPaused.value || isAborted.value) return
    arr[i] = output[i]
  }
  array.value = [...arr]
}

// 基数排序执行逻辑
const startRadixSort = async () => {
  const sortArr = [...array.value]

  // ✅ 实时更新已用时长 - 每100ms刷新，暂停无缝衔接
  timeUpdateTimer = setInterval(() => {
    if(!isPaused.value && isSorting.value){
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }
  }, 100)

  await radixSort(sortArr)

  // 排序完成收尾
  if (!isAborted.value) {
    sortedIndices.value = [...Array(arraySize.value).keys()]
    compareIndices.value = []
    progress.value = 100
    usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
  }
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  isSorting.value = false
}

// 开始/继续排序逻辑
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
    await startRadixSort()
    return
  }
  if (isSorting.value) return
  
  isSorting.value = true
  startTime.value = Date.now()
  await startRadixSort()
}

// 柱状图三色标记 (全局统一标准)
const getBarColor = (index) => {
  if (sortedIndices.value.includes(index)) return '#10b981'
  if (compareIndices.value.includes(index)) return '#ef4444'
  return '#3b82f6'
}

// 初始化数组
generateRandomArray()
</script>

<style scoped>
/* ✅ 完全统一标准样式 无任何自定义 底部30px边距+无滚动条 */
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
}

.array-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
  padding: 12px;
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
}

/* ✅ 统计面板 强制单行横向紧凑显示 核心样式 */
:deep(.stats-grid) {
  display: flex;
  flex-wrap: nowrap;
  gap: 18px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}
:deep(.stats-item) {
  display: flex;
  align-items: center;
  gap: 6px;
	font-size: 14px;
  padding: 0;
  border: none;
}

/* 响应式适配小屏 全局统一规则 */
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
  .array-container {
    padding: 8px;
    margin-top: 8px;
  }
  :deep(.stats-grid) {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>