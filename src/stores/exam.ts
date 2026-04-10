import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ChatMessage,
  ExamCondition,
  ExamPaper,
  Question,
  ReasoningStep,
  QuestionVersion,
  ExamSummary
} from '../types'
import { mockQuestions, initialMessages } from '../mock'
import { adaptQuestion as apiAdaptQuestion, type AdaptQuestionParams } from '../api'

export const useExamStore = defineStore('exam', () => {
  // ==================== 基础状态 ====================

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

  // ==================== 思考气泡状态 ====================

  const thinkingText = ref('')
  const isThinking = ref(false)
  const isThinkingCompleted = ref(false)
  const thinkingDuration = ref(0)
  const thinkingStartTime = ref(0)
  const isThinkingCancelled = ref(false)

  // ==================== 试卷摘要 ====================

  const examSummary = ref<ExamSummary | null>(null)

  // ==================== 版本管理 ====================

  const questionVersions = ref<Map<string, QuestionVersion[]>>(new Map())
  const globalUndoStack = ref<Array<{ questionId: string; version: QuestionVersion }>>([])

  // ==================== 辅助方法 ====================

  // 更新步骤状态的辅助方法
  function updateStep(stepId: string, updates: Partial<ReasoningStep>) {
    const step = reasoningSteps.value.find(s => s.id === stepId)
    if (step) {
      Object.assign(step, updates)
    }
  }

  // 重新计算试卷总分
  function recalcTotalScore() {
    if (!currentPaper.value) return
    currentPaper.value.totalScore = currentPaper.value.questions.reduce((sum, q) => sum + q.score, 0)
    // 同步更新摘要
    recalcExamSummary()
  }

  // 重新计算试卷摘要
  function recalcExamSummary() {
    if (!currentPaper.value) return
    const questions = currentPaper.value.questions
    examSummary.value = {
      totalQuestions: questions.length,
      bankQuestions: questions.filter(q => q.source === 'bank').length,
      aiQuestions: questions.filter(q => q.source === 'ai').length,
      difficultyDistribution: {
        easy: questions.filter(q => q.difficulty === 'easy').length,
        medium: questions.filter(q => q.difficulty === 'medium').length,
        hard: questions.filter(q => q.difficulty === 'hard').length
      },
      totalScore: questions.reduce((sum, q) => sum + q.score, 0),
      duration: currentPaper.value.duration
    }
  }

  // ==================== 版本管理方法 ====================

  // 推入版本快照
  function pushVersion(questionId: string, question: Question, action: string) {
    const version: QuestionVersion = {
      question: JSON.parse(JSON.stringify(question)),
      action,
      timestamp: new Date().toISOString()
    }

    // 记录到该题目的版本列表
    const versions = questionVersions.value.get(questionId) || []
    versions.push(version)
    questionVersions.value.set(questionId, versions)

    // 推入全局撤销栈
    globalUndoStack.value.push({ questionId, version })
  }

  // 获取某题目的所有版本
  function getVersions(questionId: string): QuestionVersion[] {
    return questionVersions.value.get(questionId) || []
  }

  // 恢复到指定版本
  function restoreVersion(questionId: string, versionIndex: number) {
    if (!currentPaper.value) return
    const versions = questionVersions.value.get(questionId)
    if (!versions || versionIndex < 0 || versionIndex >= versions.length) return

    const idx = currentPaper.value.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return

    const targetVersion = versions[versionIndex]
    currentPaper.value.questions[idx] = JSON.parse(JSON.stringify(targetVersion.question))
    recalcTotalScore()
  }

  // 撤销最后一次操作
  function undoLastAction(): { success: boolean; message: string } {
    if (globalUndoStack.value.length === 0 || !currentPaper.value) {
      return { success: false, message: '没有可撤销的操作' }
    }

    const last = globalUndoStack.value.pop()!
    const idx = currentPaper.value.questions.findIndex(q => q.id === last.questionId)
    if (idx === -1) {
      return { success: false, message: '题目不存在' }
    }

    currentPaper.value.questions[idx] = JSON.parse(JSON.stringify(last.version.question))
    recalcTotalScore()
    return { success: true, message: `已撤销：${last.version.action}` }
  }

  // ==================== 取消生成 ====================

  function cancelGenerate() {
    isThinkingCancelled.value = true
    isGenerating.value = false
    isThinking.value = false
    isThinkingCompleted.value = false
    isReasoningRunning.value = false
  }

  // ==================== 生成题目（模拟流式思考模式） ====================

  async function generateExam(cond?: Partial<ExamCondition>) {
    if (cond) {
      Object.assign(condition.value, cond)
    }

    isGenerating.value = true
    showPreview.value = false
    generateProgress.value = { bank: 0, ai: 0, total: 0 }
    isReasoningRunning.value = true
    isReasoningCompleted.value = false

    // 重置思考气泡状态
    thinkingText.value = ''
    isThinking.value = true
    isThinkingCompleted.value = false
    thinkingDuration.value = 0
    thinkingStartTime.value = Date.now()
    isThinkingCancelled.value = false

    const c = condition.value
    const total = c.count || 15

    // 模拟流式思考内容（逐句追加）
    const thinkingChunks: string[] = [
      `正在分析出题需求...`,
      `学科：${c.subject || '数学'}，年级：${c.grade || '高一'}，题型：${c.questionTypes?.join('、') || '选择题、填空题'}。`,
      `难度要求：${c.difficulty || '中等'}，知识点范围：${c.knowledgePoints?.join('、') || '函数与导数'}。`,
      `目标题目数量：${total} 道，考试时长：${c.duration || 60} 分钟。`,
      `正在检索题库，匹配已有题目...`,
      `已从题库中找到 ${Math.min(Math.ceil(total * 0.6), mockQuestions.length)} 道匹配题目。`,
      `剩余 ${Math.max(total - Math.min(Math.ceil(total * 0.6), mockQuestions.length), 0)} 道题目将由 AI 生成补充。`,
      `正在根据知识点和难度要求生成原创题目...`,
      `题目生成完成，正在进行组卷排版...`,
      `试卷组卷完成，共 ${total} 道题目。`
    ]

    // 逐句追加思考内容，模拟流式效果
    for (let i = 0; i < thinkingChunks.length; i++) {
      if (isThinkingCancelled.value) {
        thinkingText.value += '\n\n[生成已取消]'
        isThinking.value = false
        isGenerating.value = false
        isReasoningRunning.value = false
        return
      }
      thinkingText.value += (i === 0 ? '' : '\n\n') + thinkingChunks[i]
      // 每句 80-200ms 延时
      const delay = 80 + Math.floor(Math.random() * 120)
      await new Promise(r => setTimeout(r, delay))
    }

    // 思考结束
    thinkingDuration.value = Date.now() - thinkingStartTime.value
    isThinking.value = false
    isThinkingCompleted.value = true

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
    const allQuestions = [...bankMatched, ...aiGenerated]
    currentPaper.value = {
      id: `paper-${Date.now()}`,
      title: `${c.grade === 'grade10' ? '高一' : '高一'}数学${c.knowledgePoints?.[0] || ''}${c.scene === 'homework' ? '课后练习' : '测试'}`,
      subject: c.subject || 'math',
      grade: c.grade || 'grade10',
      scene: c.scene || 'homework',
      questions: allQuestions,
      totalScore: allQuestions.reduce((sum, q) => sum + q.score, 0),
      duration: c.duration || 60,
      schoolName: '',
      createdAt: new Date().toISOString()
    }

    // 计算试卷摘要
    recalcExamSummary()

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
      content: `试卷生成完成！共 ${generateProgress.value.total} 道题目（题库匹配 ${bankMatched.length} 道，AI 生成 ${aiGenerated.length} 道），请在右侧卷面中查看和调整。\n\n您可以：\n- 点击上方步骤查看详细过程\n- 点击题目进行编辑\n- 对单题进行改编\n- 导出为 Word 文档`,
      type: 'text',
      timestamp: new Date().toISOString()
    })

    isGenerating.value = false
    isReasoningRunning.value = false
    isReasoningCompleted.value = true
    showPreview.value = true
  }

  // ==================== 消息操作 ====================

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    messages.value.push({
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    })
  }

  // ==================== 题目操作（带版本记录） ====================

  // 改编题目（带版本记录）
  async function adaptQuestion(questionId: string, type: 'difficulty' | 'questionType' | 'knowledgePoint') {
    const paper = currentPaper.value
    if (!paper) return

    const idx = paper.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return

    const original = paper.questions[idx]

    // 保存当前版本
    const actionMap = {
      difficulty: '换难度',
      questionType: '换题型',
      knowledgePoint: '换知识点'
    }
    pushVersion(questionId, original, actionMap[type])

    try {
      // 调用 Coze API 进行题目改编
      const params: AdaptQuestionParams = {
        grade: original.grade,
        id: original.id,
        question_image: '',
        question_query: `根据原题改编，${type === 'difficulty' ? '改变难度' : type === 'questionType' ? '改变题型' : '改变知识点'}`,
        question_text: original.content,
        single_model: false,
        subject: original.subject,
        term: '',
        textbook: '',
        unit: ''
      }

      const response = await apiAdaptQuestion(params)

      // 处理 Coze API 响应格式
      let adaptedQuestion = null
      
      try {
        // 检查是否有 workflow_result
        if (response.data && response.data.workflow_result) {
          // 解析 workflow_result JSON 字符串
          const workflowResult = JSON.parse(response.data.workflow_result)
          if (workflowResult.output) {
            adaptedQuestion = {
              content: workflowResult.output,
              answer: '',
              analysis: ''
            }
          }
        } else if (response.data && response.data.adapted_questions && response.data.adapted_questions.length > 0) {
          // 标准格式
          adaptedQuestion = response.data.adapted_questions[0]
        } else if (response.adapted_questions && response.adapted_questions.length > 0) {
          adaptedQuestion = response.adapted_questions[0]
        }
      } catch (error) {
        console.error('解析响应失败:', error)
      }

      if (adaptedQuestion) {
        // 构建改编后的题目
        const adapted: Question = {
          ...original,
          id: `adapted-${Date.now()}`,
          content: adaptedQuestion.content || adaptedQuestion.question_text || '',
          options: adaptedQuestion.options,
          answer: adaptedQuestion.answer || '',
          analysis: adaptedQuestion.analysis || '',
          source: 'ai'
        }

        paper.questions[idx] = adapted
        recalcTotalScore()
      }
    } catch (error) {
      console.error('改编题目失败:', error)
      // 失败时使用本地逻辑作为降级方案
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
      recalcTotalScore()
    }
  }

  // 删除题目
  function removeQuestion(questionId: string) {
    if (!currentPaper.value) return
    currentPaper.value.questions = currentPaper.value.questions.filter(q => q.id !== questionId)
    recalcTotalScore()
  }

  // 替换单题（带版本记录）
  async function replaceQuestion(questionId: string) {
    if (!currentPaper.value) return

    const idx = currentPaper.value.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return

    const original = currentPaper.value.questions[idx]

    // 保存当前版本
    pushVersion(questionId, original, '替换题目')

    try {
      // 调用 Coze API 生成新题目
      const params: AdaptQuestionParams = {
        grade: original.grade,
        id: original.id,
        question_image: '',
        question_query: '生成一道类似但不同的新题目',
        question_text: original.content,
        single_model: false,
        subject: original.subject,
        term: '',
        textbook: '',
        unit: ''
      }

      const response = await apiAdaptQuestion(params)

      // 处理 Coze API 响应格式
      let adaptedQuestion = null
      
      try {
        // 检查是否有 workflow_result
        if (response.data && response.data.workflow_result) {
          // 解析 workflow_result JSON 字符串
          const workflowResult = JSON.parse(response.data.workflow_result)
          if (workflowResult.output) {
            adaptedQuestion = {
              content: workflowResult.output,
              answer: '',
              analysis: ''
            }
          }
        } else if (response.data && response.data.adapted_questions && response.data.adapted_questions.length > 0) {
          // 标准格式
          adaptedQuestion = response.data.adapted_questions[0]
        } else if (response.adapted_questions && response.adapted_questions.length > 0) {
          adaptedQuestion = response.adapted_questions[0]
        }
      } catch (error) {
        console.error('解析响应失败:', error)
      }

      if (adaptedQuestion) {
        // 构建替换后的题目
        const replaced: Question = {
          ...original,
          id: `replaced-${Date.now()}`,
          content: adaptedQuestion.content || adaptedQuestion.question_text || '',
          options: adaptedQuestion.options,
          answer: adaptedQuestion.answer || '',
          analysis: adaptedQuestion.analysis || '',
          source: 'ai'
        }

        currentPaper.value.questions[idx] = replaced
        recalcTotalScore()
      }
    } catch (error) {
      console.error('替换题目失败:', error)
      // 失败时使用本地逻辑作为降级方案
      const randomQ = mockQuestions[Math.floor(Math.random() * mockQuestions.length)]
      currentPaper.value.questions[idx] = {
        ...randomQ,
        id: `replaced-${Date.now()}`,
        source: 'ai'
      }
      recalcTotalScore()
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

  // ==================== 批量操作 ====================

  // 更新单题分数
  function updateQuestionScore(questionId: string, newScore: number) {
    if (!currentPaper.value) return
    const q = currentPaper.value.questions.find(q => q.id === questionId)
    if (!q) return
    q.score = newScore
    recalcTotalScore()
  }

  // 批量删除题目
  function batchRemoveQuestions(questionIds: string[]) {
    if (!currentPaper.value) return
    currentPaper.value.questions = currentPaper.value.questions.filter(
      q => !questionIds.includes(q.id)
    )
    recalcTotalScore()
  }

  // 批量改编题目
  function batchAdaptQuestions(questionIds: string[], type: 'difficulty' | 'questionType' | 'knowledgePoint') {
    questionIds.forEach(id => adaptQuestion(id, type))
  }

  // 批量更新分数
  function batchUpdateScore(questionIds: string[], newScore: number) {
    if (!currentPaper.value) return
    questionIds.forEach(questionId => {
      const q = currentPaper.value!.questions.find(q => q.id === questionId)
      if (q) q.score = newScore
    })
    recalcTotalScore()
  }

  // ==================== 重置 ====================

  function reset() {
    messages.value = [...initialMessages]
    currentPaper.value = null
    showPreview.value = false
    isGenerating.value = false
    generateProgress.value = { bank: 0, ai: 0, total: 0 }
    reasoningSteps.value = []
    isReasoningRunning.value = false
    isReasoningCompleted.value = false

    // 清理思考气泡状态
    thinkingText.value = ''
    isThinking.value = false
    isThinkingCompleted.value = false
    thinkingDuration.value = 0
    thinkingStartTime.value = 0
    isThinkingCancelled.value = false

    // 清理试卷摘要
    examSummary.value = null

    // 清理版本管理
    questionVersions.value = new Map()
    globalUndoStack.value = []
  }

  return {
    // 基础状态
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

    // 思考气泡状态
    thinkingText,
    isThinking,
    isThinkingCompleted,
    thinkingDuration,
    thinkingStartTime,
    isThinkingCancelled,

    // 试卷摘要
    examSummary,

    // 版本管理
    questionVersions,
    globalUndoStack,

    // 方法
    generateExam,
    addMessage,
    adaptQuestion,
    removeQuestion,
    replaceQuestion,
    moveQuestion,
    pushVersion,
    getVersions,
    restoreVersion,
    undoLastAction,
    recalcTotalScore,
    cancelGenerate,
    updateQuestionScore,
    batchRemoveQuestions,
    batchAdaptQuestions,
    batchUpdateScore,
    reset
  }
})
