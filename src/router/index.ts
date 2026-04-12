import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/ai-question-generator/'),
  routes: [
    {
      path: '/',
      redirect: '/ai-exam'
    },
    {
      path: '/ai-exam',
      name: 'AIExam',
      component: () => import('../views/AIExam.vue'),
      meta: { title: 'AI 组卷' }
    },
    {
      path: '/smart-import',
      name: 'SmartImport',
      component: () => import('../views/SmartImport.vue'),
      meta: { title: '智能导入' }
    },
    {
      path: '/original-create',
      name: 'OriginalCreate',
      component: () => import('../views/OriginalCreate.vue'),
      meta: { title: '原创出题' }
    },
    {
      path: '/question-bank',
      name: 'QuestionBank',
      component: () => import('../views/QuestionBank.vue'),
      meta: { title: '我的题库' }
    },

  ]
})

export default router
