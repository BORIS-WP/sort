<!-- src/views/HeapSortPage.vue -->
<template>
  <div class="sort-page">
    <div class="page-header">
      <router-link to="/" class="back-btn">← 返回算法首页</router-link>
      <h2>⛰️ 堆排序 (Heap Sort) 可视化演示</h2>
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

      <!-- 核心：左右分栏容器 左侧D3堆结构 右侧柱状图 -->
      <div class="main-box">
        <!-- 左侧：D3重构版 堆结构可视化 + 图例说明 -->
        <div class="heap-box">
          <div class="title-text">🌴 堆结构可视化 (完全二叉树 | 最大堆)</div>
          
          <!-- ✅ 新增：堆结构图例说明 -->
          <div class="heap-legend">
            <div class="legend-title">📝 堆节点说明</div>
            <div class="legend-list">
              <div class="legend-item">
                <div class="legend-color root-color"></div>
                <div class="legend-text">根节点 (堆顶，索引0)</div>
              </div>
              <div class="legend-item">
                <div class="legend-color leaf-color"></div>
                <div class="legend-text">叶子节点 (无子节点)</div>
              </div>
              <div class="legend-item">
                <div class="legend-color normal-color"></div>
                <div class="legend-text">普通节点 (非根/非叶子)</div>
              </div>
              <div class="legend-item">
                <div class="legend-color active-color"></div>
                <div class="legend-text">激活节点 (正在比较/交换)</div>
              </div>
              <div class="legend-item">
                <div class="legend-color sorted-color"></div>
                <div class="legend-text">已排序节点 (已放到正确位置)</div>
              </div>
              <div class="legend-item">
                <div class="legend-text tip-text">💡 堆节点索引 ↔ 右侧柱状图索引 一一对应</div>
              </div>
            </div>
          </div>

          <!-- D3 渲染容器 -->
          <div ref="heapTreeRef" class="heap-tree-d3"></div>
        </div>

        <!-- 右侧：原有柱状图 完全保留+美化 -->
        <div class="chart-box">
          <div class="title-text">📊 数值排序柱状图 (带数值标注)</div>
          <div class="array-container">
            <div
              v-for="(value, index) in array"
              :key="index"
              class="bar-wrapper"
              :style="{ width: `${100 / arraySize - 0.6}%` }"
            >
              <!-- ✅ 新增：显示索引，确保与堆节点对应 -->
              <div class="bar-index">[{{ index }}]</div>
              <div
                class="array-bar"
                :style="{
                  height: `${value}px`,
                  backgroundColor: getBarColor(index),
                }"
                :title="`索引：${index} | 数值：${value}`"
              ></div>
              <div class="bar-num">{{ value }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
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

// 性能统计数据
const compareCount = ref(0)
const swapCount = ref(0)
const progress = ref(0)
const usedTime = ref(0)
const timeComplexity = ref('O(n log n)')
const spaceComplexity = ref('O(1)')

// 排序核心数据
const array = ref([])
const compareIndices = ref([])
const sortedIndices = ref([])
const startTime = ref(0)
const pauseTotalTime = ref(0)
const pauseStartTime = ref(0)
let heapSortGenerator = null

// D3 相关引用和变量
const heapTreeRef = ref(null)
let svg = null
let simulation = null

// 生成随机数组
const generateRandomArray = () => {
  array.value = Array.from({ length: arraySize.value }, () => Math.floor(Math.random() * 450) + 50)
  resetSortStatus(false)
  // 生成数组后重新渲染D3图表
  renderHeapTree()
}

// 重置排序状态
const resetSortStatus = (isResetAll = true) => {
  compareIndices.value = []
  sortedIndices.value = []
  isPaused.value = false
  isAborted.value = false
  heapSortGenerator = null
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
    pauseStartTime.value = 0
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

// 暂停排序
const pauseSort = () => {
  if (isSorting.value && !isPaused.value) {
    isPaused.value = true
    pauseStartTime.value = Date.now()
    compareIndices.value = []
    if(timeUpdateTimer) clearInterval(timeUpdateTimer)
  }
}

// 睡眠函数
const sleep = async (ms) => {
  return new Promise(resolve => {
    sortTimer.value = setTimeout(resolve, ms)
  })
}

// ==================== D3 核心渲染逻辑 (修正索引对应关系) ====================
// 构建堆的树形结构数据
const buildHeapTreeData = (arr) => {
  const nodes = []
  const links = []
  
  // 创建所有节点 (✅ 确保索引从0开始，与数组完全对应)
  arr.forEach((value, index) => {
    nodes.push({
      id: index,          // ✅ 关键：节点ID = 数组索引
      value: value,
      level: Math.floor(Math.log2(index + 1)),
      isRoot: index === 0,
      isLeaf: index >= Math.floor(arr.length / 2) && index < arr.length
    })
  })
  
  // 创建父子链接 (✅ 严格按照完全二叉树公式)
  nodes.forEach(node => {
    const leftChild = 2 * node.id + 1  // 左子节点索引
    const rightChild = 2 * node.id + 2 // 右子节点索引
    
    if (leftChild < arr.length) {
      links.push({
        source: node.id,
        target: leftChild
      })
    }
    
    if (rightChild < arr.length) {
      links.push({
        source: node.id,
        target: rightChild
      })
    }
  })
  
  return { nodes, links }
}

// 渲染堆结构 (✅ 优化布局算法，确保显示完整)
const renderHeapTree = () => {
  if (!heapTreeRef.value) return
  
  // 清空容器
  d3.select(heapTreeRef.value).selectAll('*').remove()
  
  const container = heapTreeRef.value
  const width = container.clientWidth
  const height = container.clientHeight - 20 // 预留图例空间
  
  // 创建SVG
  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')
  
  // 构建树形数据
  const { nodes, links } = buildHeapTreeData(array.value)
  
  // ✅ 优化节点布局算法，避免溢出
  const maxLevel = Math.ceil(Math.log2(arraySize.value + 1))
  const levelHeight = height / (maxLevel + 1)
  const horizontalPadding = width * 0.1
  
  // 为每个节点计算坐标 (✅ 确保同级节点均匀分布)
  nodes.forEach(node => {
    const level = node.level
    const levelStartIndex = Math.pow(2, level) - 1
    const nodeIndexInLevel = node.id - levelStartIndex
    const levelNodeCount = Math.min(Math.pow(2, level), arraySize.value - levelStartIndex)
    
    // 计算X坐标：均匀分布
    const x = horizontalPadding + (nodeIndexInLevel / (levelNodeCount - 1 || 1)) * (width - 2 * horizontalPadding)
    // 计算Y坐标：层级分布
    const y = 40 + level * levelHeight
    
    node.x = x
    node.y = y
  })
  
  // 绘制连接线
  const link = svg.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('x1', d => nodes[d.source].x)
    .attr('y1', d => nodes[d.source].y)
    .attr('x2', d => nodes[d.target].x)
    .attr('y2', d => nodes[d.target].y)
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('stroke-linecap', 'round')
  
  // 绘制节点
  const node = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', d => `node node-${d.id} ${d.isRoot ? 'root' : ''} ${d.isLeaf ? 'leaf' : ''}`)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    // ✅ 添加上下文提示，显示索引和数值
    .append('title')
    .text(d => `索引：${d.id} | 数值：${d.value}`)
  
  // 重新选择节点组，添加图形元素
  const nodeGroups = svg.selectAll('.node')
  
  // 节点背景圆
  nodeGroups.append('circle')
    .attr('r', d => d.isRoot ? 27 : 23)
    .attr('fill', d => {
      if (sortedIndices.value.includes(d.id)) {
        return d3.interpolate('#10b981', '#047857')(0.5) // 已排序-绿色
      } else if (compareIndices.value.includes(d.id)) {
        return d3.interpolate('#ef4444', '#dc2626')(0.5) // 激活-红色
      } else if (d.isRoot) {
        return d3.interpolate('#1d4ed8', '#1e40af')(0.5) // 根节点-深蓝
      } else if (d.isLeaf) {
        return d3.interpolate('#93c5fd', '#60a5fa')(0.5) // 叶子节点-浅蓝
      } else {
        return d3.interpolate('#3b82f6', '#2563eb')(0.5) // 普通节点-蓝色
      }
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .attr('filter', d => compareIndices.value.includes(d.id) 
      ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' 
      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
  
  // ✅ 节点索引（小字体显示在左上角）
  nodeGroups.append('text')
    .attr('x', d => d.isRoot ? -15 : -12)
    .attr('y', d => d.isRoot ? -10 : -8)
    .attr('fill', '#fff')
    .attr('font-size', 10)
    .attr('font-weight', 600)
    .text(d => `[${d.id}]`)
  
  // 节点数值（居中显示）
  nodeGroups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.3em')
    .attr('fill', '#fff')
    .attr('font-size', d => d.isRoot ? 15 : 14)
    .attr('font-weight', 600)
    .text(d => d.value)
  
  // 更新节点状态的函数
  window.updateHeapNodeStatus = () => {
    if (!svg) return
    
    // 更新节点颜色和样式
    svg.selectAll('.node circle')
      .attr('fill', d => {
        if (sortedIndices.value.includes(d.id)) {
          return d3.interpolate('#10b981', '#047857')(0.5)
        } else if (compareIndices.value.includes(d.id)) {
          return d3.interpolate('#ef4444', '#dc2626')(0.5)
        } else if (d.isRoot) {
          return d3.interpolate('#1d4ed8', '#1e40af')(0.5)
        } else if (d.isLeaf) {
          return d3.interpolate('#93c5fd', '#60a5fa')(0.5)
        } else {
          return d3.interpolate('#3b82f6', '#2563eb')(0.5)
        }
      })
      .attr('filter', d => compareIndices.value.includes(d.id) 
        ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' 
        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
    
    // 更新节点数值
    svg.selectAll('.node text:last-of-type')
      .text(d => array.value[d.id])
  }
}

// 监听数组变化，更新D3渲染
watch([array, compareIndices, sortedIndices], () => {
  if (window.updateHeapNodeStatus) {
    window.updateHeapNodeStatus()
  }
})

// 监听容器大小变化，重新渲染
const resizeObserver = new ResizeObserver(() => {
  if (isSorting.value) return
  renderHeapTree()
})

// ==================== 堆排序核心逻辑 (修正数组更新逻辑) ====================
function* heapSort(arr, stats) {
  const n = arr.length
  // 构建最大堆
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(arr, stats, n, i)
  }
  // 逐个提取堆顶放到末尾
  for (let i = n - 1; i > 0; i--) {
    // ✅ 交换堆顶和当前最后一个元素
    [arr[0], arr[i]] = [arr[i], arr[0]]
    stats.swaps.value++
    sortedIndices.value.push(i)
    // ✅ 立即更新数组，确保视图同步
    array.value = [...arr]
    yield { highlights: [0, i], value: [...arr] }
    yield* heapify(arr, stats, i, 0)
  }
}

function* heapify(arr, stats, n, i) {
  let largest = i
  const left = 2 * i + 1
  const right = 2 * i + 2
  
  if (left < n) {
    stats.comparisons.value++
    if (arr[left] > arr[largest]) largest = left
    // ✅ 立即更新高亮和数组
    compareIndices.value = [i, left]
    yield { highlights: [i, left], value: [...arr] }
  }
  
  if (right < n) {
    stats.comparisons.value++
    if (arr[right] > arr[largest]) largest = right
    // ✅ 立即更新高亮和数组
    compareIndices.value = [i, right]
    yield { highlights: [i, right], value: [...arr] }
  }
  
  if (largest !== i) {
    // ✅ 交换元素
    [arr[i], arr[largest]] = [arr[largest], arr[i]]
    stats.swaps.value++
    // ✅ 立即更新数组和高亮
    array.value = [...arr]
    compareIndices.value = [i, largest]
    yield { highlights: [i, largest], value: [...arr] }
    yield* heapify(arr, stats, n, largest)
  }
}

// 排序执行逻辑 (✅ 修正数组同步逻辑)
const startHeapSort = async () => {
  const len = array.value.length
  const stats = { comparisons: compareCount, swaps: swapCount }
  // ✅ 深拷贝数组，避免直接修改原数组
  const sortArr = JSON.parse(JSON.stringify(array.value))
  heapSortGenerator = heapSort(sortArr, stats)
  let step = 0
  const totalSteps = len * Math.log2(len) * 2

  // 实时计时
  timeUpdateTimer = setInterval(() => {
    if(!isPaused.value && isSorting.value){
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }
  }, 100)

  while (!isPaused.value && !isAborted.value) {
    const result = heapSortGenerator.next()
    if (result.done) break

    // ✅ 修正：强制同步数组和高亮状态
    if (result.value?.highlights) {
      compareIndices.value = [...result.value.highlights]
      array.value = [...result.value.value]
    }
    
    step++
    progress.value = Math.floor((step / totalSteps) * 98)
    await sleep(speedMs.value)
  }

  // 排序完成收尾
  if (!isAborted.value) {
    sortedIndices.value = [...Array(len).keys()]
    compareIndices.value = []
    progress.value = 100
    usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
  }
  
  if(timeUpdateTimer) clearInterval(timeUpdateTimer)
  isSorting.value = false
}

// 开始/继续排序逻辑
const startOrResumeSort = async () => {
  if (isAborted.value) resetSortStatus(false)
  
  if (isPaused.value) {
    pauseTotalTime.value += Date.now() - pauseStartTime.value
    isPaused.value = false
    // 继续计时
    timeUpdateTimer = setInterval(() => {
      usedTime.value = Date.now() - startTime.value - pauseTotalTime.value
    }, 100)
    await startHeapSort()
    return
  }
  
  if (isSorting.value) return
  
  isSorting.value = true
  startTime.value = Date.now()
  await startHeapSort()
}

// 柱状图颜色函数
const getBarColor = (index) => {
  if (sortedIndices.value.includes(index)) return '#10b981'  // 已排序-绿色
  if (compareIndices.value.includes(index)) return '#ef4444' // 激活-红色
  return '#3b82f6'                                          // 普通-蓝色
}

// 生命周期钩子
onMounted(() => {
  generateRandomArray()
  // 监听容器大小变化
  if (heapTreeRef.value) {
    resizeObserver.observe(heapTreeRef.value)
  }
})

onUnmounted(() => {
  resizeObserver.disconnect()
  if (timeUpdateTimer) clearInterval(timeUpdateTimer)
  if (sortTimer.value) clearTimeout(sortTimer.value)
})
</script>

<style scoped>
/* 基础样式 保留+优化 */
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
  gap: 10px;
}

/* 核心：左右分栏布局 */
.main-box {
  display: flex;
  flex: 1;
  gap: 12px;
  width: 100%;
  height: 100%;
}
/* 左侧堆结构容器 占比45% */
.heap-box {
  flex: 0 0 45%;
  background: #ffffff;
  border-radius: 16px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
/* 右侧柱状图容器 占比55% */
.chart-box {
  flex: 0 0 55%;
  background: #ffffff;
	border-radius: 16px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.title-text {
  text-align: center;
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
  margin-bottom: 8px;
}

/* ✅ 堆结构图例说明样式 */
.heap-legend {
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
  max-height: 120px;
  overflow-y: auto;
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
  gap: 6px;
  font-size: 11px;
  color: #475569;
  width: calc(50% - 4px); /* 两列布局 */
}
.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #fff;
  flex-shrink: 0;
}
.root-color { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); }
.leaf-color { background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%); }
.normal-color { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.active-color { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.sorted-color { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
.tip-text {
  width: 100%;
  color: #64748b;
  font-style: italic;
  margin-top: 4px;
}

/* D3 堆结构容器样式 */
.heap-tree-d3 {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* 右侧柱状图 美化+索引显示 */
.array-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1px;
	padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  box-sizing: border-box;
  overflow: hidden !important;
}
.bar-wrapper {
  display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
  height:100%;
  width: 100%;
}
/* ✅ 柱状图索引显示 */
.bar-index {
  font-size: 9px;
  color: #64748b;
  margin-bottom: 2px;
  font-weight: 600;
}
.array-bar {
  border-radius: 4px 4px 0 0;
  transition: background-color 0.1s ease, height 0.2s ease;
  flex-shrink: 0;
  width: 100%;
}
.bar-num {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  white-space: nowrap;
}

/* 统计面板样式 */
:deep(.stats-grid) {
  display:flex; flex-wrap:nowrap; gap:18px; align-items:center; justify-content:flex-start; width:100%;
}
:deep(.stats-item) {
  display:flex; align-items:center; gap:6px; font-size:14px; padding:0; border:none;
}
:deep(.stats-item span) {
  font-weight: 600;
  color: #1e293b;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .page-header { flex-direction: column; gap:8px; align-items:flex-start; padding:10px 12px; }
  .flex-container { padding:8px 10px !important; }
  .main-box { flex-direction: column; gap:8px; }
  .heap-box, .chart-box { flex: 0 0 50%; width:100%; }
  .legend-item { width: 100%; } /* 小屏图例单列显示 */
  .bar-num { font-size:10px; }
  .bar-index { font-size:8px; }
  :deep(.stats-grid) { flex-wrap:wrap; gap:10px; }
}
</style>