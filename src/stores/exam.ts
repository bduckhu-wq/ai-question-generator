import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, ExamCondition, ExamPaper, Question, ReasoningStep } from '../types'
import { mockQuestions, initialMessages } from '../mock'

export const useExamStore = defineStore('exam', () => {
  // 对话消息
  const messages = ref<ChatMessage[]>([...initialMessages])
  
  // 出题条件
  const condition = ref<ExamCondition>({
    subject: 'math',
    grade: 'grade10',
    questionTypes: ['choice', 'fillBlank'],
    difficulty: 'medium',
    difficultyRatio: { easy: 30, medium: 50, hard: 20 },
    knowledgePoints: ['函数与导数'],
    scene: 'homework',
    count: 15,
    duration: 60
  })
  
  // 当前试卷
  const currentPaper = ref<ExamPaper | null>(null)
  
  // 是否展示卷面预览
  const showPreview = ref(false)
  
  // 是否正在生成
  const isGenerating = ref(false)
  
  // 生成进度（保留兼容）
  const generateProgress = ref({ bank: 0, ai: 0, total: 0 })

  // 推理步骤
  const reasoningSteps = ref<ReasoningStep[]>([])
  const reasoningTitle = ref('AI 出题推理过程')
  const isReasoningRunning = ref(false)
  const isReasoningCompleted = ref(false)

  // 更新步骤状态的辅助方法
  function updateStep(stepId: string, updates: Partial<ReasoningStep>) {
    const step = reasoningSteps.value.find(s => s.id === stepId)
    if (step) {
      Object.assign(step, updates)
    }
  }

  // 生成题目（带推理步骤）
  async function generateExam(cond?: Partial<ExamCondition>) {
    if (cond) {
      Object.assign(condition.value, cond)
    }
    
    isGenerating.value = true
    showPreview.value = false
    generateProgress.value = { bank: 0, ai: 0, total: 0 }
    isReasoningRunning.value = true
    isReasoningCompleted.value = false

    const c = condition.value
    const total = c.count || 15

    // 初始化推理步骤
    reasoningSteps.value = [
      {
        id: 'parse',
        title: '解析出题需求',
        description: '正在分析您的出题条件...',
        status: 'running',
        startedAt: new Date().toISOString()
      },
      {
        id: 'search',
        title: '检索题库匹配',
        status: 'pending'
      },
      {
        id: 'generate',
        title: 'AI 生成题目',
        status: 'pending'
      },
      {
        id: 'compose',
        title: '组卷排版',
        status: 'pending'
      }
    ]

    // ===== 步骤 1: 解析需求 =====
    const parseStart = Date.now()
    await new Promise(r => setTimeout(r, 600))
    const parseDuration = Date.now() - parseStart
    updateStep('parse', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      duration: parseDuration,
      detail: `已解析出题条件，准备为您生成试卷。`,
      detailItems: [
        `学科：${c.subject || '数学'}`,
        `年级：${c.grade || '高一'}`,
        `题型：${c.questionTypes?.join('、') || '选择题、填空题'}`,
        `难度：${c.difficulty || '中等'}`,
        `知识点：${c.knowledgePoints?.join('、') || '函数与导数'}`,
        `数量：${total} 道`
      ]
    })

    // ===== 步骤 2: 检索题库 =====
    updateStep('search', {
      status: 'running',
      description: '正在从题库中检索匹配题目...',
      startedAt: new Date().toISOString()
    })
    const searchStart = Date.now()

    const bankMatched = mockQuestions.filter(q => {
      if (c.subject && q.subject !== c.subject) return false
      if (c.grade && q.grade !== c.grade) return false
      if (c.difficulty && q.difficulty !== c.difficulty) return true
      return true
    }).slice(0, Math.min(Math.ceil(total * 0.6), mockQuestions.length))

    // 模拟逐题检索进度
    for (let i = 0; i < bankMatched.length; i++) {
      await new Promise(r => setTimeout(r, 200))
      generateProgress.value.bank = i + 1
      updateStep('search', {
        description: `已匹配 ${i + 1}/${bankMatched.length} 道题库题目...`
      })
    }

    const searchDuration = Date.now() - searchStart
    updateStep('search', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      duration: searchDuration,
      description: undefined,
      detail: `从题库中检索到 ${bankMatched.length} 道匹配题目。`,
      detailItems: bankMatched.map((q, i) => `第${i + 1}题：[${q.type === 'choice' ? '选择题' : q.type === 'fillBlank' ? '填空题' : '解答题'}] ${q.content.substring(0, 40)}...`)
    })

    // ===== 步骤 3: AI 生成 =====
    updateStep('generate', {
      status: 'running',
      description: 'AI 正在生成补充题目...',
      startedAt: new Date().toISOString()
    })
    const genStart = Date.now()

    const aiNeeded = total - bankMatched.length
    const aiGenerated: Question[] = []
    for (let i = 0; i < aiNeeded; i++) {
      await new Promise(r => setTimeout(r, 300))
      const baseQ = mockQuestions[i % mockQuestions.length]
      aiGenerated.push({
        ...baseQ,
        id: `ai-${Date.now()}-${i}`,
        source: 'ai'
      })
      generateProgress.value.ai = i + 1
      updateStep('generate', {
        description: `正在生成第 ${i + 1}/${aiNeeded} 道 AI 题目...`
      })
    }

    const genDuration = Date.now() - genStart
    updateStep('generate', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      duration: genDuration,
      description: undefined,
      detail: `AI 生成了 ${aiGenerated.length} 道原创题目来补充试卷。`,
      detailItems: aiGenerated.map((q, i) => `第${i + 1}题：[${q.type === 'choice' ? '选择题' : q.type === 'fillBlank' ? '填空题' : '解答题'}] ${q.content.substring(0, 40)}...`)
    })

    // ===== 步骤 4: 组卷排版 =====
    updateStep('compose', {
      status: 'running',
      description: '正在排版组卷...',
      startedAt: new Date().toISOString()
    })
    const composeStart = Date.now()
    await new Promise(r => setTimeout(r, 500))
    const composeDuration = Date.now() - composeStart

    generateProgress.value.total = bankMatched.length + aiGenerated.length

    // 创建试卷
    currentPaper.value = {
      id: `paper-${Date.now()}`,
      title: `${c.grade === 'grade10' ? '高一' : '高一'}数学${c.knowledgePoints?.[0] || ''}${c.scene === 'homework' ? '课后练习' : '测试'}`,
      subject: c.subject || 'math',
      grade: c.grade || 'grade10',
      scene: c.scene || 'homework',
      questions: [...bankMatched, ...aiGenerated],
      totalScore: [...bankMatched, ...aiGenerated].reduce((sum, q) => sum + q.score, 0),
      duration: c.duration || 60,
      schoolName: '',
      createdAt: new Date().toISOString()
    }

    updateStep('compose', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      duration: composeDuration,
      description: undefined,
      detail: `试卷组卷完成，共 ${generateProgress.value.total} 道题目，满分 ${currentPaper.value.totalScore} 分。`,
      detailItems: [
        `试卷标题：${currentPaper.value.title}`,
        `题目总数：${generateProgress.value.total} 道（题库 ${bankMatched.length} + AI ${aiGenerated.length}）`,
        `满分：${currentPaper.value.totalScore} 分`,
        `考试时长：${currentPaper.value.duration} 分钟`
      ]
    })

    // 添加完成消息
    messages.value.push({
      id: `msg-done-${Date.now()}`,
      role: 'assistant',
      content: `✅ 试卷生成完成！共 ${generateProgress.value.total} 道题目（题库匹配 ${bankMatched.length} 道，AI 生成 ${aiGenerated.length} 道），请在右侧卷面中查看和调整。\n\n您可以：\n• 点击上方步骤查看详细过程\n• 点击题目进行编辑\n• 对单题进行改编\n• 导出为 Word 文档`,
      type: 'text',
      timestamp: new Date().toISOString()
    })
    
    isGenerating.value = false
    isReasoningRunning.value = false
    isReasoningCompleted.value = true
    showPreview.value = true
  }
  
  // 添加消息
  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    messages.value.push({
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    })
  }
  
  // 改编题目
  function adaptQuestion(questionId: string, type: 'difficulty' | 'questionType' | 'knowledgePoint') {
    const paper = currentPaper.value
    if (!paper) return
    
    const idx = paper.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return
    
    const original = paper.questions[idx]
    let adapted: Question
    
    switch (type) {
      case 'difficulty':
        const difficulties = ['easy', 'medium', 'hard'] as const
        const nextDiff = difficulties[(difficulties.indexOf(original.difficulty) + 1) % 3]
        adapted = { ...original, id: `adapted-${Date.now()}`, difficulty: nextDiff, source: 'ai' }
        break
      case 'questionType':
        const types = ['choice', 'fillBlank', 'shortAnswer', 'judgment'] as const
        const currentIndex = types.indexOf(original.type as typeof types[number])
        const nextType = types[(currentIndex + 1) % types.length]
        adapted = { ...original, id: `adapted-${Date.now()}`, type: nextType, source: 'ai', options: nextType === 'choice' ? original.options : undefined }
        break
      default:
        adapted = { ...original, id: `adapted-${Date.now()}`, source: 'ai' }
    }
    
    paper.questions[idx] = adapted
  }
  
  // 删除题目
  function removeQuestion(questionId: string) {
    if (!currentPaper.value) return
    currentPaper.value.questions = currentPaper.value.questions.filter(q => q.id !== questionId)
    currentPaper.value.totalScore = currentPaper.value.questions.reduce((sum, q) => sum + q.score, 0)
  }
  
  // 替换单题
  async function replaceQuestion(questionId: string) {
    if (!currentPaper.value) return
    
    const idx = currentPaper.value.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return
    
    const randomQ = mockQuestions[Math.floor(Math.random() * mockQuestions.length)]
    currentPaper.value.questions[idx] = {
      ...randomQ,
      id: `replaced-${Date.now()}`,
      source: 'ai'
    }
  }
  
  // 移动题目
  function moveQuestion(fromIndex: number, toIndex: number) {
    if (!currentPaper.value) return
    const questions = [...currentPaper.value.questions]
    const [moved] = questions.splice(fromIndex, 1)
    questions.splice(toIndex, 0, moved)
    currentPaper.value.questions = questions
  }
  
  // 重置
  function reset() {
    messages.value = [...initialMessages]
    currentPaper.value = null
    showPreview.value = false
    isGenerating.value = false
    generateProgress.value = { bank: 0, ai: 0, total: 0 }
    reasoningSteps.value = []
    isReasoningRunning.value = false
    isReasoningCompleted.value = false
  }
  
  return {
    messages,
    condition,
    currentPaper,
    showPreview,
    isGenerating,
    generateProgress,
    reasoningSteps,
    reasoningTitle,
    isReasoningRunning,
    isReasoningCompleted,
    generateExam,
    addMessage,
    adaptQuestion,
    removeQuestion,
    replaceQuestion,
    moveQuestion,
    reset
  }
})
