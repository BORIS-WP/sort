
<template>
  <div class="controls-panel">
    <div class="control-main">
      <div class="control-group">
        <label>数组长度：</label>
        <input
          type="range"
          min="5"
          max="100"
          v-model.number="localArraySize"
          @change="onArraySizeChange"
          class="range-input"
        />
        <div class="size-input-box">
          <input
            type="number"
            v-model.number="localArraySize"
            min="5"
            max="100"
            @change="onArraySizeChange"
            @blur="validArraySize"
            class="custom-size-input"
          />
          <span class="size-text">项</span>
        </div>
      </div>

      <div class="control-group">
        <label>动画速度：</label>
        <input
          type="range"
          min="50"
          max="1000"
          step="50"
          v-model.number="localSpeedMs"
          @change="onSpeedChange"
          class="range-input"
        />
        <span class="speed-value">{{ localSpeedMs }} ms</span>
      </div>

      <div class="button-group">
        <button @click="onRandomize" :disabled="isSorting && !isPaused" class="btn random-btn">随机数据</button>
        <button 
          @click="onStart" 
          :disabled="isSorting && !isPaused" 
          class="btn start-btn"
        >
          {{ isPaused ? '继续' : '开始排序' }}
        </button>
        <button 
          @click="onPause" 
          v-if="isSorting && !isPaused" 
          class="btn pause-btn"
        >
          暂停
        </button>
        <button @click="onReset" class="btn reset-btn">重置</button>
      </div>
    </div>

    <div class="statistics-panel">
      <h4 class="stats-title">📊 排序性能统计</h4>
      <div class="stats-grid">
        <div class="stats-item">
          <span class="label">比较次数：</span>
          <span class="value">{{ compareCount }}</span>
        </div>
        <div class="stats-item">
          <span class="label">交换次数：</span>
          <span class="value">{{ swapCount }}</span>
        </div>
        <div class="stats-item">
          <span class="label">时间复杂度：</span>
          <span class="value">{{ timeComplexity }}</span>
        </div>
        <div class="stats-item">
          <span class="label">空间复杂度：</span>
          <span class="value">{{ spaceComplexity }}</span>
        </div>
        <div class="stats-item">
          <span class="label">排序进度：</span>
          <span class="value">{{ progress }} %</span>
        </div>
        <div class="stats-item">
          <span class="label">已用时长：</span>
          <span class="value">{{ formatTime(usedTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  arraySize: { type: Number, default: 20, required: true },
  speedMs: { type: Number, default: 300, required: true },
  isSorting: { type: Boolean, default: false, required: true },
  isPaused: { type: Boolean, default: false, required: true },
  compareCount: { type: Number, default: 0, required: false },
  swapCount: { type: Number, default: 0, required: false },
  timeComplexity: { type: String, default: 'O(n²)', required: false },
  spaceComplexity: { type: String, default: 'O(1)', required: false },
  progress: { type: Number, default: 0, required: false },
  usedTime: { type: Number, default: 0, required: false }
})

const emit = defineEmits([
  'update-array-size',
  'update-speed-ms',
  'randomize',
  'start',
  'pause',
  'reset'
])

const DEFAULT_SIZE = 20
const DEFAULT_SPEED = 300

const localArraySize = ref(props.arraySize)
const localSpeedMs = ref(props.speedMs)

watch([() => props.arraySize, () => props.speedMs], ([newSize, newSpeed]) => {
  localArraySize.value = newSize
  localSpeedMs.value = newSpeed
}, { immediate: true })

const validArraySize = () => {
  if (localArraySize.value < 5) localArraySize.value = 5
  if (localArraySize.value > 100) localArraySize.value = 100
  if (isNaN(localArraySize.value)) localArraySize.value = DEFAULT_SIZE
}

const onArraySizeChange = () => {
  validArraySize()
  emit('update-array-size', localArraySize.value)
}
const onSpeedChange = () => emit('update-speed-ms', localSpeedMs.value)
const onRandomize = () => emit('randomize')
const onStart = () => emit('start')
const onPause = () => emit('pause')
const onReset = () => {
  localArraySize.value = DEFAULT_SIZE
  localSpeedMs.value = DEFAULT_SPEED
  emit('reset')
}

const formatTime = (ms) => {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
</script>

<style scoped>
.controls-panel {
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 16px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  border: 1px solid #f1f5f9;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.control-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
}
.control-group label {
  font-weight: 600;
  color: #1e293b;
  min-width: 88px;
  font-size: 15px;
}
.range-input {
  flex: 1;
  max-width: 200px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
}
.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
	height: 18px;
  border-radius: 50%;
  background: #4f46e5;
  cursor: pointer;
  transition: all 0.2s ease;
}
.range-input::-webkit-slider-thumb:hover {
  background: #4338ca;
  transform: scale(1.1);
}
.size-input-box {
  display: flex;
  align-items: center;
  gap: 4px;
}
.custom-size-input {
 	width: 50px;
  height: 28px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #4f46e5;
  background: #f0f1ff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 4px;
  outline: none;
}
.custom-size-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 2px rgba(79,70,229,0.1);
}
.size-text {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}
.speed-value {
  width: 70px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #4f46e5;
  background: #f0f1ff;
  padding: 3px 8px;
  border-radius: 4px;
}
.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.btn:active:not(:disabled) {
  transform: translateY(0);
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}
.random-btn { background: #64748b; }
.random-btn:hover:not(:disabled) { background: #475569; }
.start-btn { background: #10b981; }
.start-btn:hover:not(:disabled) { background: #059669; }
.pause-btn { background: #f59e0b; }
.pause-btn:hover:not(:disabled) { background: #d97706; }
.reset-btn { background: #ef4444; }
.reset-btn:hover:not(:disabled) { background: #dc2626; }

.statistics-panel {
  flex: 1;
  min-width: 260px;
  background: #f8fafc;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
.stats-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #1e293b;
  font-weight: 600;
}
.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  justify-content: flex-start;
}
.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 4px 0;
  border-bottom: none;
  gap: 6px;
}
.stats-item .label {
  color: #64748b;
  font-weight: 500;
}
.stats-item .value {
  color: #1e293b;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 768px) {
  .controls-panel {
    flex-direction: column;
    gap: 12px;
    padding: 10px 12px;
  }
  .statistics-panel {
    min-width: unset;
    width: 100%;
  }
}
</style>