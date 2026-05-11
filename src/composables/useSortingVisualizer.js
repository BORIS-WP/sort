
import { ref } from 'vue'

export function useSortingVisualizer() {
  // 核心响应式数据
  const array = ref([])
  const compareIndices = ref([]) // 正在比较的索引
  const sortedIndices = ref([])  // 已排序的索引

  // 生成随机数组 - 高度区间 50~500px，避免过短/过长
  const generateRandomArray = (size = 20) => {
    array.value = Array.from({ length: size }, () => 
      Math.floor(Math.random() * 450) + 50
    )
    resetMarkers()
  }

  // 重置颜色标记
  const resetMarkers = () => {
    compareIndices.value = []
    sortedIndices.value = []
  }

  // 初始化生成数组
  generateRandomArray()

  return {
    array,
    compareIndices,
    sortedIndices,
    generateRandomArray,
    resetMarkers
  }
}