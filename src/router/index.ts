import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页', tabbar: true, tabIcon: 'home-o', tabLabel: '首页' }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/Calendar.vue'),
    meta: { title: '日历', tabbar: true, tabIcon: 'calendar-o', tabLabel: '日历' }
  },
  {
    path: '/record',
    name: 'Record',
    component: () => import('@/views/Record.vue'),
    meta: { title: '记录', tabbar: true, tabIcon: 'edit', tabLabel: '记录' }
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/Statistics.vue'),
    meta: { title: '统计', tabbar: true, tabIcon: 'chart-trending-o', tabLabel: '统计' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { title: '我的', tabbar: true, tabIcon: 'user-o', tabLabel: '我的' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
