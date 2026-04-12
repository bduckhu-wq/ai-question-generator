import { ref, computed } from 'vue'
import { useExamStore } from '../stores/exam'
import type { QuestionType } from '../types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type?: 'text' | 'thinking' | 'summary-card' | 'clarify' | 'param-summary'
  data?: any
  timestamp: number
}

export function useExamChat() {
  const examStore = useExamStore()
  const messages = ref<ChatMessage[]>([])
  const step = ref<'init' | 'confirm' | 'generating' | 'done'>('init')
  const inputText = ref('')
  const greetingText = ref('')
  const fullGreeting = '请描述您的出题需求，或选择一个快捷场景。'
  const greetingDone = ref(false)

  const inputPlaceholder = computed(() => {
    if (step.value === 'init') return '描述您的出题需求，如：帮我出一份高一数学函数单元测验'
    return '补充说明（可选）'
  })

  // 快捷场景
  const quickScenes = [
    { key: 'homework', label: '课后练习', icon: '📖', description: '15道题·基础难度·覆盖当天知识点', defaults: { scene: 'homework' as const, difficultyRatio: { easy: 40, medium: 50, hard: 10 }, count: 15, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } },
    { key: 'unitTest', label: '单元测验', icon: '📋', description: '20道题·中等难度·覆盖单元知识点', defaults: { scene: 'unitTest' as const, difficultyRatio: { easy: 30, medium: 50, hard: 20 }, count: 20, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
    { key: 'midterm', label: '期中复习', icon: '📊', description: '25道题·综合难度·覆盖期中范围', defaults: { scene: 'midterm' as const, difficultyRatio: { easy: 30, medium: 40, hard: 30 }, count: 25, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
    { key: 'special', label: '专项训练', icon: '🎯', description: '12道题·中高难度·针对薄弱环节', defaults: { scene: 'special' as const, difficultyRatio: { easy: 20, medium: 50, hard: 30 }, count: 12, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } }
  ]

  function addMsg(role: 'user' | 'assistant', content: string, type = 'text', data?: any) {
    messages.value.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      role, content, type, data,
      timestamp: Date.now()
    })
  }

  function formatMessage(content: string) {
    return content.replace(/\n/g, '<br>')
  }

  function startTypingEffect() {
    let i = 0
    const typeTimer = setInterval(() => {
      if (i < fullGreeting.length) { 
        greetingText.value += fullGreeting[i]
        i++ 
      }
      else { 
        clearInterval(typeTimer)
        greetingDone.value = true 
      }
    }, 40)
  }

  return {
    messages,
    step,
    inputText,
    greetingText,
    greetingDone,
    inputPlaceholder,
    quickScenes,
    addMsg,
    formatMessage,
    startTypingEffect
  }
}
