<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>🧩 归并排序 (Merge Sort) 可视化演示</h2>
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

      <!-- ✅ 核心布局：页面主体 左右分栏 (左侧纵向流程图 + 右侧柱状图) -->
      <div class="main-content">
        <!-- 左侧：纵向分层流程图 (严格分左右分区 + 从上到下深度递增) -->
        <div class="left-flow">
          <!-- ✅ 新增：图例说明区域 -->
          <div class="flow-legend">
            <div class="legend-title">📝 流程图说明</div>
            <div class="legend-list">
              <div class="legend-item">
                <div class="legend-color node-left"></div>
                <div class="legend-text">左分区节点（永久标识）</div>
              </div>
              <div class="legend-item">
                <div class="legend-color node-right"></div>
                <div class="legend-text">右分区节点（永久标识）</div>
              </div>
              <div class="legend-item">
                <div class="legend-color node-left node-split"></div>
                <div class="legend-text">左分区 · 分割中</div>
              </div>
              <div class="legend-item">
                <div class="legend-color node-right node-split"></div>
                <div class="legend-text">右分区 · 分割中</div>
              </div>
              <div class="legend-item">
                <div class="legend-color node-left node-merge"></div>
                <div class="legend-text">左分区 · 合并中</div>
              </div>
              <div class="legend-item">
                <div class="legend-color node-right node-merge"></div>
                <div class="legend-text">右分区 · 合并中</div>
              </div>
              <div class="legend-item">
                <div class="legend-color node-active"></div>
                <div class="legend-text">当前激活节点（正在处理）</div>
              </div>
              <div class="legend-item">
                <div class="legend-text depth-tip">📌 深度：递归拆分的层级（数字越大，拆分越细）</div>
              </div>
            </div>
          </div>
          
          <div class="merge-flow-container">
            <div class="flow-main">
              <div class="flow-layer" v-for="(layer, depth) in flowLayers" :key="depth">
                <div class="layer-header">
                  <span class="depth-text">深度 {{ depth }}</span>
                </div>
                <div class="node-wrap">
                  <div 
                    v-for="node in layer" 
                    :key="node.id"
                    class="flow-node"
                    :class="{
                      'node-left': node.pos === 'left',
                      'node-right': node.pos === 'right',
                      'node-split': node.status === 'split',
                      'node-merge': node.status === 'merge',
                      'node-active': node.isActive
                    }"
                  >
                    [{{ node.start }}~{{ node.end }}]
                    <span class="node-status">{{ node.status === 'split' ? '分割' : '合并' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：柱状图排序区 (带顶部数值 + 三色标记) -->
        <div class="right-chart">
        
          <div class="array-container">
            <div
              v-for="(value, index) in array"
              :key="index"
              class="bar-wrapper"
              :style="{ width: `${100 / arraySize - 0.8}%` }"
            >
              <div
                class="array-bar"
                :style="{
                  height: `${value}px`,
                  backgroundColor: getBarColor(index),
                }"
                :title="`数值：${value}`"
              ></div>
              <div class="bar-value">{{ value }}</div>
            </div>
          </div>
        </div>
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

// 性能统计数据 - 实时更新
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n log n)')
const spaceComplexity = ref('O(n)')

// 排序核心数据
const array = ref([])
const compareIndices = ref([])
const sortedIndices = ref([])
const startTime = ref(0)
const pauseTotalTime = ref(0)
const pauseStartTime = ref(0)
let sortGenerator = null
let totalSteps = 0
let currentStep = 0

// ✅ 核心数据：纵向分层+左右分区 专属配置
const flowLayers = ref([])
let nodeIdCounter = 0
let maxDepth = 0
// 计算递归深度
const getDepth = (start, end) => {
  const len = end - start + 1
  return Math.floor(Math.log2(arraySize.value / len))
}
// 标记左右分区 (核心：永久区分左/右)
const getNodePos = (start, mid, end) => {
  const center = mid || Math.floor((arraySize.value -1)/2)
  return start <= center ? 'left' : 'right'
}

// 添加【带左右分区】的流程节点
const addFlowNode = (start, end, status, mid) => {
  const depth = getDepth(start, end)
  maxDepth = Math.max(maxDepth, depth)
  if (!flowLayers.value[depth]) flowLayers.value[depth] = []
  const node = {
    id: nodeIdCounter++,
    start, end, status, depth,
    pos: getNodePos(start, mid, end), // left=左分区 | right=右分区
    isActive: false
  }
  flowLayers.value[depth].push(node)
  return node
}
// 高亮当前处理节点
const setActiveNode = (target) => {
  flowLayers.value.forEach(layer => {
    layer.forEach(node => node.isActive = node.id === target.id)
  })
}

// 生成随机数组
const generateRandomArray = () => {
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 450) + 50)
  totalSteps = arraySize.value * Math.log2(arraySize.value) * 2
  currentStep = 0
  flowLayers.value = []
  nodeIdCounter = 0
  maxDepth = 0
  resetSortStatus(false)
}

// 重置排序状态（含定时器销毁）
const resetSortStatus = (isResetAll = true) => {
  compareIndices.value = []
  sortedIndices.value = []
  isPaused.value = false
  isAborted.value = false
  sortGenerator = null
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
    flowLayers.value = []
    nodeIdCounter = 0
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
  totalSteps = newSize * Math.log2(newSize) * 2
  currentStep = 0
  flowLayers.value = []
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

// ✅ 归并排序核心生成器 - 完美联动【纵向分层+左右分区】
function* mergeSort(arr, start = 0, end = arr.length - 1) {
  const mid = Math.floor((start + end) / 2)
  const splitNode = addFlowNode(start, end, 'split', mid)
  setActiveNode(splitNode)
  yield arr

  if (start < end) {
    // 递归分割左分区
    yield* mergeSort(arr, start, mid)
    // 递归分割右分区
    yield* mergeSort(arr, mid + 1, end)
    
    // 合并左右分区
    const mergeNode = addFlowNode(start, end, 'merge', mid)
    setActiveNode(mergeNode)
    yield arr

    yield* merge(arr, start, mid, end)
    setActiveNode({id:-1})
    yield arr
  }
}

// 合并函数
function* merge(arr, start, mid, end) {
  const left = arr.slice(start, mid + 1)
  const right = arr.slice(mid + 1, end + 1)
  let i = 0, j = 0, k = start

  while (i < left.length && j < right.length) {
    compareCount.value++
    compareIndices.value = [k]
    yield arr
    if (left[i] <= right[j]) arr[k++] = left[i++]
    else arr[k++] = right[j++]
    swapCount.value++
    currentStep++
    progress.value = Math.floor((currentStep / totalSteps) * 98)
  }
  while (i < left.length) { arr[k++] = left[i++]; swapCount.value++; yield arr }
  while (j < right.length) { arr[k++] = right[j++]; swapCount.value++; yield arr }
}

// 生成器驱动的排序执行逻辑
const startMergeSort = async () => {
  const len = array.value.length
  const sortArr = [...array.value]
  sortGenerator = mergeSort(sortArr)

  timeUpdateTimer = setInterval(() => {
    if(!isPaused.value && isSorting.value){
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }
  }, 100)

  while (!isPaused.value && !isAborted.value) {
    const result = sortGenerator.next()
    if (result.done) break
    array.value = [...result.value]
    await sleep(speedMs.value)
  }

  if (!isAborted.value) {
    sortedIndices.value = [...Array(len).keys()]
    compareIndices.value = []
    progress.value = 100
    usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
  }
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  isSorting.value = false
}

// 开始/继续排序逻辑
const startOrResumeSort = async () => {
  if (isAborted.value) resetSortStatus(false)
  if (isPaused.value) {
    pauseTotalTime.value += Date.now() - pauseStartTime.value
    isPaused.value = false
    timeUpdateTimer = setInterval(() => { usedTime.value = Date.now() - startTime.value - pauseTotalTime.value }, 100)
    await startMergeSort()
    return
  }
  if (isSorting.value) return
  isSorting.value = true
  startTime.value = Date.now()
  await startMergeSort()
}

// 柱状图三色标记 (统一标准)
const getBarColor = (index) => {
  if (sortedIndices.value.includes(index)) return '#10b981'
  if (compareIndices.value.includes(index)) return '#ef4444'
  return '#3b82f6'
}

// 初始化数组
generateRandomArray()
</script>

<style scoped>
/* 基础样式 - 不变 */
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
.back-btn:hover { background: #4338ca; transform: translateY(-1px); }
h2 { font-size: 20px; color: #1e293b; margin: 0; font-weight:700; }
.flex-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 16px !important;
  overflow: hidden !important;
  box-sizing: border-box;
  gap: 12px;
}

/* ✅ 核心布局：页面主体 左右分栏 (左侧流程图 40% | 右侧柱状图 60%) 不变 */
.main-content {
  display: flex;
  flex-direction: row;
  gap: 12px;
  width: 100%;
	height: 100%;
  flex: 1;
}
.left-flow {
  width: 40%;
	height: 100%;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.right-chart {
  width: 60%;
	height: 100%;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flow-title, .chart-title {
  font-size: 13px;
  color: #334155;
  font-weight: 600;
  text-align: center;
}

/* ✅ 新增：图例说明样式 */
.flow-legend {
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.legend-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
}
.legend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #475569;
  width: calc(50% - 4px); /* 两列布局，更紧凑 */
}
.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid #94a3b8;
  flex-shrink: 0;
}
.depth-tip {
  width: 100%;
  color: #64748b;
  font-style: italic;
}

/* ✅ 核心改版：左侧流程图 → 纵向垂直排布 (重中之重，从上到下深度递增) */
.merge-flow-container {
  flex: 1;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.flow-main {
  display: flex;
  flex-direction: column; /* 纵向排布核心：改为column */
  align-items: flex-start;
  gap: 10px;
  overflow-y: auto; /* 纵向滚动 */
  overflow-x: hidden;
  padding-right: 6px;
  flex: 1;
  width: 100%;
}
.flow-layer {
  display: flex;
  flex-direction: row; /* 同层级节点 横向并排 */
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e2e8f0;
}
.flow-layer:last-child { border-bottom: none; padding-bottom: 0; }
.layer-header {
  padding: 4px 8px;
  background: #f1f5f9;
  border-radius: 6px;
  min-width: 70px;
  text-align: center;
  flex-shrink: 0;
}
.depth-text {
  font-size: 12px;
	color: #64748b;
	font-weight: 600;
}
.node-wrap { 
  display: flex; 
  flex-direction: row; 
  gap: 8px; 
  flex: 1;
  flex-wrap: wrap;
}

/* ✅ 节点核心样式 - 严格区分 左/右分区 + 分割/合并 + 激活态 (配色不变，辨识度拉满) */
.flow-node {
  padding: 6px 10px;
  border-radius: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  transition: all 0.2s ease;
  min-width: 80px;
}
/* 左分区节点 - 浅蓝色 永久标识 */
.node-left { background: #e0f2fe; border: 1px solid #90caf9; }
/* 右分区节点 - 浅紫色 永久标识 */
.node-right { background: #f3e8ff; border: 1px solid #c7d2fe; }
/* 分割状态 - 加深底色，标识正在拆分 */
.node-left.node-split { background: #bae6fd; }
.node-right.node-split { background: #e9d5ff; }
/* 合并状态 - 变浅绿/浅青，标识正在合并 */
.node-left.node-merge { background: #dcfce7; border-color: #86efac; }
.node-right.node-merge { background: #ccfbf1; border-color: #5eead4; }
/* 激活节点 - 高亮红+放大+阴影，当前正在处理的节点 */
.node-active {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  transform: scale(1.03);
  box-shadow: 0 1px 3px rgba(239,68,68,0.15);
}
.node-status {
  display: block;
  font-size: 9px;
  color: #475569;
  margin-top: 2px;
	font-weight: 400;
}

/* ✅ 右侧柱状图+顶部数值 样式 - 无改动，完美保留 */
.array-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
	padding: 10px;
  background: #f8fafc;
  border-radius:8px;
  box-sizing: border-box;
  overflow:hidden !important;
  width: 100%;
}
.bar-wrapper {
  display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
  height:100%;
}
.array-bar {
  border-radius:4px 4px 0 0;
  transition:background-color 0.1s ease;
  flex-shrink:0;
  width:100%;
}
.bar-value {
  font-size:11px; font-weight:600; color:#1e293b;
  margin-bottom:4px; white-space:nowrap;
}

/* 统计面板样式 */
:deep(.stats-grid) {
  display:flex; flex-wrap:nowrap; gap:18px; align-items:center; justify-content:flex-start;
  width:100%;
}
:deep(.stats-item) {
  display:flex; align-items:center; gap:6px; font-size:14px; padding:0; border:none;
}

/* 响应式适配小屏 - 自动切换上下布局 */
@media (max-width:768px) {
  .main-content { flex-direction: column; }
  .left-flow, .right-chart { width: 100%; height: 50%; }
  .flex-container { padding:8px 10px !important; }
  .flow-node { min-width:70px; padding:4px 8px; }
  .bar-value { font-size:10px; }
  :deep(.stats-grid) { flex-wrap:wrap; gap:10px; }
  /* 小屏下图例改为单列 */
  .legend-item { width: 100%; }
}
</style>