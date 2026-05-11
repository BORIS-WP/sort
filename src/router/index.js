
import { createRouter, createWebHistory } from 'vue-router'
// 导入你的页面组件
import HomePage from '@/views/HomePage.vue'
import BubbleSortPage from '@/views/BubbleSortPage.vue'
import QuickSortPage from '@/views/QuickSortPage.vue'
import BucketSortPage from '@/views/BucketSortPage.vue'
import CountingSortPage from '@/views/CountingSortPage.vue'
import RadixSortPage from '@/views/RadixSortPage.vue'
import ShellSortPage from '@/views/ShellSortPage.vue'
import MergeSortPage from '@/views/MergeSortPage.vue'
import InsertionSortPage from '@/views/InsertionSortPage.vue'
import SelectionSortPage from '@/views/SelectionSortPage.vue'
import HeapSortPage from '@/views/HeapSortPage.vue'

// 路由规则数组
const routes = [
  {
    path: '/',        // 根路径 → npm run dev默认打开的页面
    name: 'Home',
    component: HomePage
  },
  {
    path: '/bubble',
    name: 'BubbleSort',
    component: BubbleSortPage
  },
  {
    path: '/quick',
    name: 'QuickSort',
    component: QuickSortPage
  }
  ,{
    path: '/bucket',
    name: 'BucketSort',
    component: BucketSortPage
  },
  {
    path: '/counting',
    name: 'CountingSort',
    component: CountingSortPage
  },
  {
    path: '/radix',
    name: 'RadixSort',
    component: RadixSortPage
  },
    {
    path: '/shell',
    name: 'ShellSort',
    component: ShellSortPage
  },
    {
    path: '/merge',
    name: 'MergeSort',
    component: MergeSortPage
  },
  {
    path: '/insertion',
    name: 'InsertionSort',
    component: InsertionSortPage
  },
    {
    path: '/selection',
    name: 'SelectionSort',
    component: SelectionSortPage
  },
  {
    path: '/heap',
    name: 'HeapSort',
    component: HeapSortPage
  },
  
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 导出路由，给main.js使用
export default router