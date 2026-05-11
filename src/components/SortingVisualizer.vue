<template>
  <div class="sorting-visualizer">
    <!-- 原有模板内容不变 -->
    <header>
      <h1>📊 十大排序算法可视化演示</h1>
      <p>冒泡 · 选择 · 插入 · 希尔 · 快排 · 归并 · 堆 · 计数 · 桶 · 基数</p>
    </header>

    <div class="main-layout">
      <aside class="control-panel">
        <div class="control-card">
          <!-- 数据设置区域 -->
          <section class="data-controls">
            <h3 class="section-title">📈 数据设置</h3>
            
            <div class="control-group">
              <label>数据规模</label>
              <div class="slider-container">
                <input
                  type="range"
                  min="5"
                  max="60"
                  v-model.number="arraySize"
                  @change="resetArray"
                  class="slider"
                />
                <span class="slider-value">{{ arraySize }}</span>
              </div>
            </div>
          </section>

          <!-- 算法选择区域 -->
          <section class="algorithm-controls">
            <h3 class="section-title">⚙️ 算法设置</h3>
            
            <div class="control-group">
              <label>选择算法</label>
              <select 
                v-model="selectedAlgorithm" 
                :disabled="isRunning" 
                class="algorithm-select"
              >
                <option value="bubble">冒泡排序</option>
                <option value="selection">选择排序</option>
                <option value="insertion">插入排序</option>
                <option value="shell">希尔排序</option>
                <option value="quick">快速排序</option>
                <option value="merge">归并排序</option>
                <option value="heap">堆排序</option>
                <option value="counting">计数排序</option>
                <option value="bucket">桶排序</option>
                <option value="radix">基数排序</option>
              </select>
              <div class="tooltip" v-if="tooltipText">{{ tooltipText }}</div>
            </div>

            <div class="control-group speed-control">
              <label>播放速度</label>
              <div class="slider-container">
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  v-model.number="speed"
                  class="slider"
                />
                <span class="slider-value">{{ speed }}ms</span>
              </div>
            </div>
          </section>

          <!-- 控制按钮区域 -->
          <section class="action-controls">
            <h3 class="section-title">🎮 操作控制</h3>
            
            <div class="button-group">
              <button @click="startSort" :disabled="isRunning" class="btn primary">
                ▶ 开始
              </button>
              <button @click="pauseSort" v-if="isRunning" class="btn warning">
                ⏸ 暂停
              </button>
              <button @click="resetArray" class="btn secondary">
                🔁 重置
              </button>
            </div>
          </section>

          <!-- 统计信息区域 -->
          <section class="stats-section">
            <h3 class="section-title">📊 性能统计</h3>
            <div class="stat-item">
              <span class="label">比较次数</span>
              <span class="value">{{ stats.comparisons }}</span>
            </div>
            <div class="stat-item">
              <span class="label">交换/移动</span>
              <span class="value">{{ stats.swaps }}</span>
            </div>
            <div class="stat-item">
              <span class="label">算法时间复杂度</span>
              <span class="value">{{ timeComplexity }}</span>
            </div>
            <div class="stat-item">
              <span class="label">算法空间复杂度</span>
              <span class="value">{{ spaceComplexity }}</span>
            </div>
            <div class="stat-item">
              <span class="label">当前进度</span>
              <span class="value">{{ progressPercentage }}%</span>
            </div>
            <div class="stat-item">
              <span class="label">已用时长</span>
              <span class="value">{{ elapsedTime }}s</span>
            </div>
            <div class="status-indicator">
              <span :class="['status-text', statusClass]">{{ statusText }}</span>
            </div>
          </section>
        </div>
      </aside>

      <main class="visualization-area">
        <div class="canvas-wrapper">
          <canvas ref="canvasRef" width="800" height="500"></canvas>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const canvasRef = ref(null)
const ctx = ref(null)
const arraySize = ref(25)
const selectedAlgorithm = ref('bubble')
const isRunning = ref(false)
const speed = ref(200)
const stats = ref({ comparisons: 0, swaps: 0 })
const statusText = ref('就绪')
const startTime = ref(null)
const elapsedTime = ref(0)
const progressPercentage = ref(0)
const totalOperations = ref(0) // 新增：预估总操作数

const tooltipMap = {
  bubble: '相邻元素两两比较，大者后移',
  selection: '每次选出最小值放到前面',
  insertion: '将元素插入到已排序部分的正确位置',
  shell: '插入排序的改进版，按间隔分组排序',
  quick: '分治法：选基准，分区递归',
  merge: '分治法：拆分后合并有序子数组',
  heap: '利用堆结构（完全二叉树）进行选择排序',
  counting: '适用于小整数范围，统计每个值出现次数',
  bucket: '将数据分到多个桶中，分别排序后合并',
  radix: '按位（个十百...）从低到高依次排序'
}
const tooltipText = ref(tooltipMap[selectedAlgorithm.value])

const complexityInfo = {
  bubble: { time: 'O(n²)', space: 'O(1)' },
  selection: { time: 'O(n²)', space: 'O(1)' },
  insertion: { time: 'O(n²)', space: 'O(1)' },
  shell: { time: 'O(n^1.3)', space: 'O(1)' },
  quick: { time: 'O(n log n)', space: 'O(log n)' },
  merge: { time: 'O(n log n)', space: 'O(n)' },
  heap: { time: 'O(n log n)', space: 'O(1)' },
  counting: { time: 'O(n+k)', space: 'O(k)' },
  bucket: { time: 'O(n+k)', space: 'O(n+k)' },
  radix: { time: 'O(d*(n+k))', space: 'O(n+k)' }
}

watch(selectedAlgorithm, (val) => {
  tooltipText.value = tooltipMap[val]
})

let currentArray = []
let animationSteps = []
let stepIndex = 0
let animationTimer = null
let timerInterval = null

onMounted(() => {
  ctx.value = canvasRef.value.getContext('2d')
  resetArray()
})

function generateArray() {
  const arr = []
  for (let i = 0; i < arraySize.value; i++) {
    arr.push(Math.floor(Math.random() * 90) + 10)
  }
  return arr
}

function resetArray() {
  if (isRunning.value) pauseSort()
  currentArray = generateArray()
  stats.value = { comparisons: 0, swaps: 0 }
  statusText.value = '就绪'
  elapsedTime.value = 0
  progressPercentage.value = 0
  drawArray(currentArray, new Set())
}

// 预估总操作数（用于进度计算）
function estimateTotalOperations(algorithm, size) {
  const n = size;
  switch (algorithm) {
    case 'bubble':
    case 'selection':
    case 'insertion':
      return n * n;
    case 'shell':
      return Math.ceil(n * 1.5);
    case 'quick':
    case 'heap':
      return Math.ceil(n * Math.log2(n) * 2);
    case 'merge':
      return Math.ceil(n * Math.log2(n) * 1.5);
    case 'counting':
    case 'bucket':
    case 'radix':
      return n * 3;
    default:
      return n * n;
  }
}

const timeComplexity = computed(() => {
  return complexityInfo[selectedAlgorithm.value]?.time || 'N/A'
})

const spaceComplexity = computed(() => {
  return complexityInfo[selectedAlgorithm.value]?.space || 'N/A'
})

// 更新进度（含时间）
function updateProgress() {
  if (!isRunning.value || !startTime.value) return;
  
  const now = Date.now();
  elapsedTime.value = ((now - startTime.value) / 1000).toFixed(2);

  const currentOps = stats.value.comparisons + stats.value.swaps;
  const progress = (currentOps / totalOperations.value) * 100;
  progressPercentage.value = Math.min(100, Math.floor(progress));
}

// ========== 排序生成器 ==========
function* bubbleSort(arr) {
  const n = arr.length
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      stats.value.comparisons++
      updateProgress()
      yield { array: [...arr], highlights: [j, j + 1] }
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        stats.value.swaps++
        updateProgress()
        yield { array: [...arr], highlights: [j, j + 1] }
      }
    }
  }
}

function* selectionSort(arr) {
  const n = arr.length
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i
    for (let j = i + 1; j < n; j++) {
      stats.value.comparisons++
      updateProgress()
      yield { array: [...arr], highlights: [minIdx, j, i] }
      if (arr[j] < arr[minIdx]) {
        minIdx = j
      }
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]]
      stats.value.swaps++
      updateProgress()
      yield { array: [...arr], highlights: [i, minIdx] }
    }
  }
}

function* insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i]
    let j = i - 1
    while (j >= 0) {
      stats.value.comparisons++
      updateProgress()
      yield { array: [...arr], highlights: [j, i] }
      if (arr[j] > key) {
        arr[j + 1] = arr[j]
        stats.value.swaps++
        updateProgress()
        yield { array: [...arr], highlights: [j, j + 1] }
        j--
      } else break
    }
    arr[j + 1] = key
  }
}

function* shellSort(arr) {
  let n = arr.length
  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      let temp = arr[i]
      let j = i
      while (j >= gap && arr[j - gap] > temp) {
        stats.value.comparisons++
        updateProgress()
        yield { array: [...arr], highlights: [j, j - gap] }
        arr[j] = arr[j - gap]
        stats.value.swaps++
        updateProgress()
        yield { array: [...arr], highlights: [j, j - gap] }
        j -= gap
      }
      arr[j] = temp
    }
  }
}

function* quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotGen = partition(arr, low, high)
    let result
    do {
      result = pivotGen.next()
      if (!result.done) {
        updateProgress()
        yield result.value
      }
    } while (!result.done)
    const pi = result.value
    yield* quickSort(arr, low, pi - 1)
    yield* quickSort(arr, pi + 1, high)
  }
}

function* partition(arr, low, high) {
  const pivot = arr[high]
  let i = low - 1
  for (let j = low; j < high; j++) {
    stats.value.comparisons++
    updateProgress()
    yield { array: [...arr], highlights: [j, high, i + 1] }
    if (arr[j] <= pivot) {
      i++
      if (i !== j) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
        stats.value.swaps++
        updateProgress()
        yield { array: [...arr], highlights: [i, j] }
      }
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]]
  stats.value.swaps++
  updateProgress()
  yield { array: [...arr], highlights: [i + 1, high] }
  return i + 1
}

function* mergeSort(arr, start = 0, end = arr.length) {
  if (end - start <= 1) return
  const mid = Math.floor((start + end) / 2)
  yield* mergeSort(arr, start, mid)
  yield* mergeSort(arr, mid, end)
  yield* merge(arr, start, mid, end)
}

function* merge(arr, start, mid, end) {
  const left = arr.slice(start, mid)
  const right = arr.slice(mid, end)
  let i = 0, j = 0, k = start
  while (i < left.length && j < right.length) {
    stats.value.comparisons++
    updateProgress()
    const highlights = [start + i, mid + j]
    if (left[i] <= right[j]) {
      arr[k] = left[i]
      stats.value.swaps++
      updateProgress()
      i++
    } else {
      arr[k] = right[j]
      stats.value.swaps++
      updateProgress()
      j++
    }
    yield { array: [...arr], highlights }
    k++
  }
  while (i < left.length) {
    arr[k] = left[i]
    stats.value.swaps++
    updateProgress()
    yield { array: [...arr], highlights: [k] }
    i++; k++
  }
  while (j < right.length) {
    arr[k] = right[j]
    stats.value.swaps++
    updateProgress()
    yield { array: [...arr], highlights: [k] }
    j++; k++
  }
}

function* heapSort(arr) {
  const n = arr.length
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(arr, n, i)
  }
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]]
    stats.value.swaps++
    updateProgress()
    yield { array: [...arr], highlights: [0, i] }
    yield* heapify(arr, i, 0)
  }
}

function* heapify(arr, n, i) {
  let largest = i
  const l = 2 * i + 1
  const r = 2 * i + 2
  if (l < n) {
    stats.value.comparisons++
    updateProgress()
    if (arr[l] > arr[largest]) largest = l
  }
  if (r < n) {
    stats.value.comparisons++
    updateProgress()
    if (arr[r] > arr[largest]) largest = r
  }
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]]
    stats.value.swaps++
    updateProgress()
    yield { array: [...arr], highlights: [i, largest] }
    yield* heapify(arr, n, largest)
  }
}

async function countingSort(arr) {
  const max = Math.max(...arr)
  const min = Math.min(...arr)
  const range = max - min + 1
  const count = new Array(range).fill(0)
  const output = new Array(arr.length)

  for (let i = 0; i < arr.length; i++) {
    count[arr[i] - min]++
    stats.value.swaps++
    updateProgress()
    await new Promise(r => setTimeout(r, speed.value))
    drawArray([...output.map((v, idx) => v ?? arr[idx])], new Set([i]))
  }

  for (let i = 1; i < count.length; i++) {
    count[i] += count[i - 1]
  }

  for (let i = arr.length - 1; i >= 0; i--) {
    output[count[arr[i] - min] - 1] = arr[i]
    count[arr[i] - min]--
    stats.value.swaps++
    updateProgress()
    await new Promise(r => setTimeout(r, speed.value))
    drawArray(output, new Set([i]))
  }

  for (let i = 0; i < arr.length; i++) {
    arr[i] = output[i]
  }
}

async function bucketSort(arr) {
  const max = Math.max(...arr)
  const min = Math.min(...arr)
  const bucketCount = Math.floor(Math.sqrt(arr.length))
  const bucketRange = (max - min) / bucketCount
  const buckets = Array.from({ length: bucketCount }, () => [])

  for (let val of arr) {
    let idx = Math.min(Math.floor((val - min) / bucketRange), bucketCount - 1)
    buckets[idx].push(val)
    stats.value.swaps++
    updateProgress()
    await new Promise(r => setTimeout(r, speed.value))
    drawArray([...arr], new Set([arr.indexOf(val)]))
  }

  let k = 0
  for (let bucket of buckets) {
    bucket.sort((a, b) => a - b)
    for (let val of bucket) {
      arr[k++] = val
      stats.value.swaps++
      updateProgress()
      await new Promise(r => setTimeout(r, speed.value))
      drawArray([...arr], new Set([k - 1]))
    }
  }
}

async function radixSort(arr) {
  const max = Math.max(...arr)
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const output = new Array(arr.length).fill(0)
    const count = new Array(10).fill(0)

    for (let i = 0; i < arr.length; i++) {
      count[Math.floor((arr[i] / exp) % 10)]++
    }

    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1]
    }

    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor((arr[i] / exp) % 10)
      output[count[digit] - 1] = arr[i]
      count[digit]--
      stats.value.swaps++
      updateProgress()
      await new Promise(r => setTimeout(r, speed.value))
      drawArray([...output.map((v, idx) => v ?? arr[idx])], new Set([i]))
    }

    for (let i = 0; i < arr.length; i++) {
      arr[i] = output[i]
    }
  }
}

async function startSort() {
  if (isRunning.value) return
  isRunning.value = true
  statusText.value = '运行中...'
  stats.value = { comparisons: 0, swaps: 0 }
  startTime.value = Date.now()
  elapsedTime.value = 0
  progressPercentage.value = 0

  // 关键：预估总操作数
  totalOperations.value = estimateTotalOperations(selectedAlgorithm.value, arraySize.value)

  currentArray = [...currentArray]

  const algorithmMap = {
    bubble: bubbleSort,
    selection: selectionSort,
    insertion: insertionSort,
    shell: shellSort,
    quick: quickSort,
    merge: mergeSort,
    heap: heapSort
  }

  const algo = selectedAlgorithm.value
  if (['counting', 'bucket', 'radix'].includes(algo)) {
    try {
      timerInterval = setInterval(() => {
        if (isRunning.value) {
          elapsedTime.value = ((Date.now() - startTime.value) / 1000).toFixed(2)
        }
      }, 100)

      await window[`${algo}Sort`](currentArray)
      statusText.value = '✅ 排序完成！'
    } catch (e) {
      console.error(e)
    } finally {
      isRunning.value = false
      if (timerInterval) clearInterval(timerInterval)
    }
  } else {
    animationSteps = []
    const generator = algorithmMap[algo](currentArray)
    let result
    do {
      result = generator.next()
      if (!result.done) {
        animationSteps.push(result.value)
      }
    } while (!result.done)

    stepIndex = 0
    playNextStep()
  }
}

function playNextStep() {
  if (stepIndex >= animationSteps.length || !isRunning.value) {
    isRunning.value = false
    statusText.value = '✅ 排序完成！'
    if (timerInterval) clearInterval(timerInterval)
    return
  }

  const step = animationSteps[stepIndex]
  currentArray = step.array
  const highlights = new Set(step.highlights || [])
  drawArray(currentArray, highlights)
  stepIndex++

  animationTimer = setTimeout(playNextStep, speed.value)
}

function pauseSort() {
  isRunning.value = false
  if (animationTimer) clearTimeout(animationTimer)
  if (timerInterval) clearInterval(timerInterval)
  statusText.value = '⏸ 已暂停'
}

function drawArray(arr, highlightIndices) {
  const canvas = canvasRef.value
  const context = ctx.value
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)

  const barWidth = canvas.width / arr.length
  const maxHeight = canvas.height - 30

  for (let i = 0; i < arr.length; i++) {
    const height = (arr[i] / 100) * maxHeight
    const x = i * barWidth + 1
    const y = canvas.height - height

    const gradient = context.createLinearGradient(x, y, x, canvas.height)
    if (highlightIndices.has(i)) {
      gradient.addColorStop(0, '#ff6b6b')
      gradient.addColorStop(1, '#ff8e8e')
    } else {
      gradient.addColorStop(0, '#4facfe')
      gradient.addColorStop(1, '#00c9ff')
    }

    context.fillStyle = gradient
    context.fillRect(x, y, barWidth - 2, height)

    if (arr.length <= 20) {
      context.fillStyle = '#333'
      context.font = '10px Arial'
      context.textAlign = 'center'
      context.fillText(arr[i], x + (barWidth - 2) / 2, y - 5)
    }
  }
}

const statusClass = computed(() => {
  if (statusText.value.includes('完成')) return 'success'
  if (statusText.value === '运行中...') return 'running'
  if (statusText.value.includes('暂停')) return 'paused'
  return ''
})
</script>

<style scoped>
.sorting-visualizer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f8fafc;
  color: #1e293b;
  overflow: hidden;
}

header {
  text-align: center;
  margin-bottom: 24px;
}

header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  background: linear-gradient(90deg, #4facfe 0%, #00c9ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 8px;
}

header p {
  color: #64748b;
  font-size: 1.1rem;
}

.main-layout {
  display: flex;
  gap: 24px;
  height: calc(100% - 80px);
  min-height: 0;
}

.control-panel {
  width: 320px;
  flex-shrink: 0;
}

.control-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
}

.data-controls,
.algorithm-controls,
.action-controls,
.stats-section {
  padding: 0 0 16px 0;
  border-bottom: 1px solid #e2e8f0;
}

.data-controls:last-child,
.algorithm-controls:last-child,
.action-controls:last-child,
.stats-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.control-group {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #334155;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #cbd5e1;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4facfe;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  background: #00c9ff;
}

.slider-value {
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  color: #4facfe;
}

.algorithm-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: white;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.algorithm-select:focus {
  outline: none;
  border-color: #4facfe;
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2);
}

.tooltip {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #64748b;
  border-left: 3px solid #4facfe;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(90deg, #4facfe 0%, #00c9ff 100%);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
}

.btn.warning {
  background: #fbbf24;
  color: white;
}

.btn.warning:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

.btn.secondary {
  background: #94a3b8;
  color: white;
}

.btn.secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.3);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed #e2e8f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.label {
  color: #64748b;
  font-size: 0.9rem;
}

.value {
  font-weight: 600;
  color: #0f172a;
}

.status-indicator {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e2e8f0;
  text-align: center;
}

.status-text {
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.status-text.running {
  background: #dbeafe;
  color: #2563eb;
}

.status-text.success {
  background: #d1fae5;
  color: #059669;
}

.status-text.paused {
  background: #fef3c7;
  color: #d97706;
}

@media (max-width: 1200px) {
  .control-panel {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
    height: auto;
  }
  
  .control-panel {
    width: 100%;
    max-height: 400px;
  }
  
  .sorting-visualizer {
    height: auto;
    min-height: 100vh;
  }
}
</style>