# AI 组卷流程优化 — 实施计划

> **For agentic workers**: 本计划为 AI Agent 自动执行设计。每个任务包含精确文件路径、完整代码、验证命令。按顺序执行，每完成一个任务勾选 checkbox。
>
> **项目根目录**: `/sessions/69d75798fc9012d6ae86c8ba/workspace/ai-question-generator/`
> **设计文档**: `docs/superpowers/specs/2026-04-08-ai-exam-ux-optimization-design.md`
> **技术栈**: Vue 3 + TypeScript + Element Plus + Pinia + Vite
> **包管理器**: pnpm 或 npm
> **验证方式**: 启动开发服务器手动验证（`pnpm dev` 或 `npm run dev`）

---

## 任务总览

### P1 — 核心体验

- [ ] **任务 1**: 类型定义扩展 + Store 思考状态基础设施
- [ ] **任务 2**: ThinkingBubble.vue 流式思考气泡组件
- [ ] **任务 3**: FlowProgress.vue 流程进度指示器
- [ ] **任务 4**: 状态过渡动画优化（4 处过渡）
- [ ] **任务 5**: SummaryCard.vue 完成摘要卡片
- [ ] **任务 6**: 题目拖拽排序

### P2 — 增强体验

- [ ] **任务 7**: 版本回撤数据层（QuestionVersion + 版本栈）
- [ ] **任务 8**: 版本回撤 UI（VersionPanel + DiffViewer）
- [ ] **任务 9**: 取消生成按钮
- [ ] **任务 10**: 分值调整
- [ ] **任务 11**: 批量操作工具栏
- [ ] **任务 12**: 全局撤销 + 卷面预览缩放/答案切换

### P3 — 锦上添花

- [ ] **任务 13**: 参数配置栏优化
- [ ] **任务 14**: 对话区细节优化

---

## P1 — 核心体验

---

### 任务 1: 类型定义扩展 + Store 思考状态基础设施

**目标**: 在 `types/index.ts` 新增 `QuestionVersion`、`SSEEvent` 类型；在 `exam.ts` 新增思考气泡相关状态和模拟流式输出逻辑，替换旧的固定步骤流水线。

**涉及文件**:
- `src/types/index.ts` — 修改
- `src/stores/exam.ts` — 修改

#### 步骤 1.1: 扩展类型定义

**文件**: `src/types/index.ts`

在文件末尾（`CHAPTER_OPTIONS` 之后）追加以下类型定义：

```typescript
// ========== AI 组卷流程优化 — 新增类型 ==========

// 题目版本快照（用于版本回撤）
export interface QuestionVersion {
  question: Question
  action: string        // 操作描述："换难度"、"自定义改编"、"手动编辑"等
  timestamp: string     // ISO 时间戳
}

// SSE 事件协议（为后端对接准备）
export type SSEEvent =
  | { type: 'thinking_start' }
  | { type: 'thinking_delta'; content: string }
  | { type: 'thinking_end'; duration: number }
  | { type: 'result_start' }
  | { type: 'result_delta'; content: string }
  | { type: 'result_end' }
  | { type: 'paper_ready'; paper: ExamPaper }
  | { type: 'error'; message: string }

// 试卷摘要（用于 SummaryCard）
export interface ExamSummary {
  totalQuestions: number
  bankQuestions: number
  aiQuestions: number
  difficultyDistribution: { easy: number; medium: number; hard: number }
  totalScore: number
  duration: number
}
```

#### 步骤 1.2: 重写 Store — 新增思考状态 + 模拟流式输出

**文件**: `src/stores/exam.ts`

完整替换文件内容为：

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, ExamCondition, ExamPaper, Question, ExamSummary, QuestionVersion } from '../types'
import { mockQuestions, initialMessages } from '../mock'

export const useExamStore = defineStore('exam', () => {
  // ========== 对话消息 ==========
  const messages = ref<ChatMessage[]>([...initialMessages])

  // ========== 出题条件 ==========
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

  // ========== 当前试卷 ==========
  const currentPaper = ref<ExamPaper | null>(null)
  const showPreview = ref(false)
  const isGenerating = ref(false)

  // ========== 思考气泡状态（替代旧的 reasoningSteps） ==========
  const thinkingText = ref('')
  const isThinking = ref(false)
  const isThinkingCompleted = ref(false)
  const thinkingDuration = ref(0)
  const thinkingStartTime = ref(0)
  const isThinkingCancelled = ref(false)

  // ========== 试卷摘要 ==========
  const examSummary = ref<ExamSummary | null>(null)

  // ========== 版本管理 ==========
  const questionVersions = ref<Map<string, QuestionVersion[]>>(new Map())
  const globalUndoStack = ref<Array<{ questionId: string; version: QuestionVersion }>>([])

  // ========== 生成进度（保留兼容） ==========
  const generateProgress = ref({ bank: 0, ai: 0, total: 0 })

  // ========== 旧推理步骤（保留但不再主动使用，兼容过渡） ==========
  const reasoningSteps = ref<any[]>([])
  const reasoningTitle = ref('AI 出题推理过程')
  const isReasoningRunning = ref(false)
  const isReasoningCompleted = ref(false)

  // ========== 版本管理辅助方法 ==========

  /** 压入版本快照 */
  function pushVersion(questionId: string, question: Question, action: string) {
    const version: QuestionVersion = {
      question: { ...question },
      action,
      timestamp: new Date().toISOString()
    }
    const versions = questionVersions.value.get(questionId) || []
    versions.push(version)
    // 每题最多保留 10 个历史版本
    if (versions.length > 10) versions.shift()
    questionVersions.value.set(questionId, versions)
    // 触发响应式更新
    questionVersions.value = new Map(questionVersions.value)

    // 同时压入全局撤销栈
    globalUndoStack.value.push({ questionId, version: version })
  }

  /** 获取某题的版本列表 */
  function getVersions(questionId: string): QuestionVersion[] {
    return questionVersions.value.get(questionId) || []
  }

  /** 恢复到指定版本 */
  function restoreVersion(questionId: string, versionIndex: number) {
    const versions = questionVersions.value.get(questionId)
    if (!versions || !currentPaper.value) return
    const targetVersion = versions[versionIndex]
    if (!targetVersion) return

    const idx = currentPaper.value.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return

    // 压入当前状态作为新版本
    pushVersion(questionId, currentPaper.value.questions[idx], `恢复到版本 #${versionIndex + 1}`)

    // 恢复
    currentPaper.value.questions[idx] = { ...targetVersion.question }
    recalcTotalScore()
  }

  /** 全局撤销 */
  function undoLastAction(): { success: boolean; message: string } {
    if (globalUndoStack.value.length === 0) {
      return { success: false, message: '没有可撤销的操作' }
    }
    const last = globalUndoStack.value.pop()!
    const versions = questionVersions.value.get(last.questionId)
    if (!versions || versions.length < 2 || !currentPaper.value) {
      return { success: false, message: '无法撤销' }
    }
    // 弹出最新版本（当前状态），恢复到上一个版本
    versions.pop()
    const prevVersion = versions[versions.length - 1]
    const idx = currentPaper.value.questions.findIndex(q => q.id === last.questionId)
    if (idx === -1) {
      return { success: false, message: '题目不存在' }
    }
    currentPaper.value.questions[idx] = { ...prevVersion.question }
    recalcTotalScore()
    questionVersions.value = new Map(questionVersions.value)
    return { success: true, message: `已撤销：对题目的${last.version.action}操作` }
  }

  /** 重新计算总分 */
  function recalcTotalScore() {
    if (!currentPaper.value) return
    currentPaper.value.totalScore = currentPaper.value.questions.reduce((sum, q) => sum + q.score, 0)
  }

  // ========== 生成试卷（模拟流式思考） ==========

  async function generateExam(cond?: Partial<ExamCondition>) {
    if (cond) {
      Object.assign(condition.value, cond)
    }

    isGenerating.value = true
    showPreview.value = false
    generateProgress.value = { bank: 0, ai: 0, total: 0 }
    isThinkingCancelled.value = false

    // 重置思考状态
    thinkingText.value = ''
    isThinking.value = true
    isThinkingCompleted.value = false
    thinkingDuration.value = 0
    thinkingStartTime.value = Date.now()
    examSummary.value = null

    const c = condition.value
    const total = c.count || 15

    // 模拟流式输出的思考内容（逐句追加，每句 80-200ms）
    const thinkingChunks: string[] = [
      '正在分析出题需求...\n',
      `学科：${c.subject === 'math' ? '数学' : c.subject}，年级：${c.grade === 'grade10' ? '高一' : c.grade}，题型：${(c.questionTypes || []).join('、')}\n`,
      `难度分配：简单 ${(c.difficultyRatio?.easy ?? 30)}%、中等 ${(c.difficultyRatio?.medium ?? 50)}%、困难 ${(c.difficultyRatio?.hard ?? 20)}%\n`,
      `知识点：${(c.knowledgePoints || []).join('、') || '函数与导数'}\n\n`,
      '正在检索题库...\n',
    ]

    // 根据实际匹配结果动态生成题库检索描述
    const bankMatched = mockQuestions.filter(q => {
      if (c.subject && q.subject !== c.subject) return false
      if (c.grade && q.grade !== c.grade) return false
      return true
    }).slice(0, Math.min(Math.ceil(total * 0.6), mockQuestions.length))

    thinkingChunks.push(`匹配到 ${bankMatched.length} 道相关题目：\n`)
    bankMatched.forEach((q, i) => {
      const typeLabel = q.type === 'choice' ? '选择题' : q.type === 'fillBlank' ? '填空题' : '解答题'
      const diffLabel = q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'
      thinkingChunks.push(`  · ${typeLabel}：${q.content.substring(0, 30)}...（${diffLabel}）\n`)
    })
    thinkingChunks.push('\n')

    const aiNeeded = total - bankMatched.length
    if (aiNeeded > 0) {
      thinkingChunks.push('题库题目不足，AI 正在生成补充题目...\n')
      thinkingChunks.push(`已生成 ${aiNeeded} 道原创题目，覆盖：\n`)
      thinkingChunks.push(`  · 函数零点问题 ${Math.ceil(aiNeeded * 0.3)} 道\n`)
      thinkingChunks.push(`  · 导数求切线方程 ${Math.ceil(aiNeeded * 0.2)} 道\n`)
      thinkingChunks.push(`  · 函数最值优化 ${Math.floor(aiNeeded * 0.2)} 道\n`)
      thinkingChunks.push(`  · 抽象函数推理 ${aiNeeded - Math.ceil(aiNeeded * 0.3) - Math.ceil(aiNeeded * 0.2) - Math.floor(aiNeeded * 0.2)} 道\n\n`)
    }

    thinkingChunks.push('正在组卷排版...\n')
    const typeCount: Record<string, number> = {}
    bankMatched.forEach(q => { typeCount[q.type] = (typeCount[q.type] || 0) + 1 })
    const aiGenerated: Question[] = []
    for (let i = 0; i < aiNeeded; i++) {
      const baseQ = mockQuestions[i % mockQuestions.length]
      aiGenerated.push({ ...baseQ, id: `ai-${Date.now()}-${i}`, source: 'ai' })
    }
    aiGenerated.forEach(q => { typeCount[q.type] = (typeCount[q.type] || 0) + 1 })

    const typeLabels: Record<string, string> = { choice: '选择题', fillBlank: '填空题', shortAnswer: '解答题', judgment: '判断题' }
    const typeDesc = Object.entries(typeCount).map(([t, n]) => `${typeLabels[t] || t} ${n} 道`).join('、')
    thinkingChunks.push(`按题型分组：${typeDesc}\n`)

    const allQuestions = [...bankMatched, ...aiGenerated]
    const totalScore = allQuestions.reduce((sum, q) => sum + q.score, 0)
    thinkingChunks.push(`总分：${totalScore} 分，预计时长：${c.duration || 60} 分钟\n`)

    // 逐 chunk 追加（模拟流式输出）
    for (const chunk of thinkingChunks) {
      if (!isGenerating.value) break  // 支持取消
      await new Promise(r => setTimeout(r, 80 + Math.random() * 120))
      thinkingText.value += chunk
    }

    // 思考结束
    isThinking.value = false
    isThinkingCompleted.value = true
    thinkingDuration.value = Date.now() - thinkingStartTime.value

    if (isThinkingCancelled.value) {
      // 被取消时不创建试卷
      isGenerating.value = false
      return
    }

    // 创建试卷
    generateProgress.value.total = allQuestions.length
    currentPaper.value = {
      id: `paper-${Date.now()}`,
      title: `${c.grade === 'grade10' ? '高一' : '高一'}数学${(c.knowledgePoints || [''])[0] || ''}${c.scene === 'homework' ? '课后练习' : '测试'}`,
      subject: c.subject || 'math',
      grade: c.grade || 'grade10',
      scene: c.scene || 'homework',
      questions: allQuestions,
      totalScore,
      duration: c.duration || 60,
      schoolName: '',
      createdAt: new Date().toISOString()
    }

    // 生成摘要
    const diffDist = { easy: 0, medium: 0, hard: 0 }
    allQuestions.forEach(q => { diffDist[q.difficulty]++ })
    examSummary.value = {
      totalQuestions: allQuestions.length,
      bankQuestions: bankMatched.length,
      aiQuestions: aiGenerated.length,
      difficultyDistribution: diffDist,
      totalScore,
      duration: c.duration || 60
    }

    // 添加完成消息
    messages.value.push({
      id: `msg-done-${Date.now()}`,
      role: 'assistant',
      content: `试卷生成完成！共 ${allQuestions.length} 道题目（题库匹配 ${bankMatched.length} 道，AI 生成 ${aiGenerated.length} 道），请在右侧卷面中查看和调整。`,
      type: 'text',
      timestamp: new Date().toISOString()
    })

    isGenerating.value = false
    showPreview.value = true
  }

  // ========== 取消生成 ==========

  function cancelGenerate() {
    isThinkingCancelled.value = true
    isGenerating.value = false
    isThinking.value = false
    isThinkingCompleted.value = true
    thinkingDuration.value = Date.now() - thinkingStartTime.value
  }

  // ========== 添加消息 ==========
  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    messages.value.push({
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    })
  }

  // ========== 改编题目（带版本记录） ==========
  function adaptQuestion(questionId: string, type: 'difficulty' | 'questionType' | 'knowledgePoint') {
    const paper = currentPaper.value
    if (!paper) return

    const idx = paper.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return

    const original = paper.questions[idx]

    // 压入版本
    pushVersion(questionId, original, type === 'difficulty' ? '换难度' : type === 'questionType' ? '换题型' : '换知识点')

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

  // ========== 删除题目 ==========
  function removeQuestion(questionId: string) {
    if (!currentPaper.value) return
    currentPaper.value.questions = currentPaper.value.questions.filter(q => q.id !== questionId)
    recalcTotalScore()
  }

  // ========== 替换单题（带版本记录） ==========
  async function replaceQuestion(questionId: string) {
    if (!currentPaper.value) return

    const idx = currentPaper.value.questions.findIndex(q => q.id === questionId)
    if (idx === -1) return

    const original = currentPaper.value.questions[idx]
    pushVersion(questionId, original, '替换题目')

    const randomQ = mockQuestions[Math.floor(Math.random() * mockQuestions.length)]
    currentPaper.value.questions[idx] = {
      ...randomQ,
      id: `replaced-${Date.now()}`,
      source: 'ai'
    }
    recalcTotalScore()
  }

  // ========== 移动题目 ==========
  function moveQuestion(fromIndex: number, toIndex: number) {
    if (!currentPaper.value) return
    const questions = [...currentPaper.value.questions]
    const [moved] = questions.splice(fromIndex, 1)
    questions.splice(toIndex, 0, moved)
    currentPaper.value.questions = questions
  }

  // ========== 更新题目分值 ==========
  function updateQuestionScore(questionId: string, newScore: number) {
    if (!currentPaper.value) return
    const q = currentPaper.value.questions.find(q => q.id === questionId)
    if (!q) return
    pushVersion(questionId, q, `调整分值 ${q.score}→${newScore}`)
    q.score = newScore
    recalcTotalScore()
  }

  // ========== 批量删除 ==========
  function batchRemoveQuestions(questionIds: string[]) {
    if (!currentPaper.value) return
    currentPaper.value.questions = currentPaper.value.questions.filter(q => !questionIds.includes(q.id))
    recalcTotalScore()
  }

  // ========== 批量改编 ==========
  function batchAdaptQuestions(questionIds: string[], type: 'difficulty' | 'questionType') {
    questionIds.forEach(id => adaptQuestion(id, type))
  }

  // ========== 批量调整分值 ==========
  function batchUpdateScore(questionIds: string[], newScore: number) {
    questionIds.forEach(id => updateQuestionScore(id, newScore))
  }

  // ========== 重置 ==========
  function reset() {
    messages.value = [...initialMessages]
    currentPaper.value = null
    showPreview.value = false
    isGenerating.value = false
    generateProgress.value = { bank: 0, ai: 0, total: 0 }
    reasoningSteps.value = []
    isReasoningRunning.value = false
    isReasoningCompleted.value = false
    thinkingText.value = ''
    isThinking.value = false
    isThinkingCompleted.value = false
    thinkingDuration.value = 0
    thinkingStartTime.value = 0
    isThinkingCancelled.value = false
    examSummary.value = null
    questionVersions.value = new Map()
    globalUndoStack.value = []
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
    pushVersion,
    getVersions,
    restoreVersion,
    undoLastAction,
    // 操作
    generateExam,
    cancelGenerate,
    addMessage,
    adaptQuestion,
    removeQuestion,
    replaceQuestion,
    moveQuestion,
    updateQuestionScore,
    batchRemoveQuestions,
    batchAdaptQuestions,
    batchUpdateScore,
    reset
  }
})
```

#### 验证

```bash
cd /sessions/69d75798fc9012d6ae86c8ba/workspace/ai-question-generator && pnpm dev
```

1. 打开浏览器访问开发服务器
2. 选择任意场景，点击确认生成
3. 确认对话区显示流式思考文本（逐句追加），而非旧的固定步骤流水线
4. 确认思考完成后试卷正常生成
5. 打开 Vue DevTools 检查 Pinia Store 中 `thinkingText`、`isThinking`、`examSummary` 等状态正确变化

---

### 任务 2: ThinkingBubble.vue 流式思考气泡组件

**目标**: 新建 `ThinkingBubble.vue`，替代 `ReasoningSteps.vue`，实现流式逐 token 渲染、可折叠/展开、实时计时器、闪烁光标。

**涉及文件**:
- `src/components/ThinkingBubble.vue` — 新增

**完整文件内容**:

```vue
<template>
  <div class="thinking-bubble" :class="{ collapsed, completed, cancelled }">
    <!-- 标题栏 -->
    <div class="thinking-header" @click="toggleCollapse">
      <span class="thinking-icon">💭</span>
      <span class="thinking-label">
        <template v-if="cancelled">已取消 · 思考了 {{ formattedDuration }}</template>
        <template v-else-if="completed">已思考 {{ formattedDuration }}，点击展开查看推理过程</template>
        <template v-else>AI 正在思考...</template>
      </span>
      <span v-if="!completed && !cancelled" class="thinking-timer">{{ elapsedDisplay }}</span>
      <span class="thinking-toggle">{{ collapsed ? '展开' : '收起' }}</span>
    </div>

    <!-- 思考内容（流式渲染） -->
    <transition name="thinking-expand">
      <div v-show="!collapsed" class="thinking-content">
        <div class="thinking-text" v-html="renderedText"></div>
        <span v-if="!completed && !cancelled" class="thinking-cursor">▌</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  thinkingText: string
  isThinking: boolean
  isThinkingCompleted: boolean
  isThinkingCancelled?: boolean
  thinkingDuration: number
}>()

const collapsed = ref(false)
const completed = computed(() => props.isThinkingCompleted)
const cancelled = computed(() => props.isThinkingCancelled)

// 计时器
const elapsed = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (props.isThinking) {
    startTimer()
  }
})

onUnmounted(() => {
  stopTimer()
})

watch(() => props.isThinking, (val) => {
  if (val) {
    elapsed.value = 0
    startTimer()
  } else {
    stopTimer()
  }
})

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => {
    elapsed.value++
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const elapsedDisplay = computed(() => {
  if (elapsed.value < 60) return `${elapsed.value}s`
  const min = Math.floor(elapsed.value / 60)
  const sec = elapsed.value % 60
  return `${min}:${String(sec).padStart(2, '0')}`
})

const formattedDuration = computed(() => {
  const ms = props.thinkingDuration
  if (ms < 1000) return `${ms}ms`
  const sec = (ms / 1000).toFixed(1)
  return `${sec}s`
})

// 渲染文本：将换行转为 <br>
const renderedText = computed(() => {
  return props.thinkingText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
})

// 思考完成后自动折叠
watch(completed, (val) => {
  if (val) {
    setTimeout(() => {
      collapsed.value = true
    }, 500)
  }
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}
</script>

<style scoped>
.thinking-bubble {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
}

.thinking-bubble.collapsed {
  cursor: pointer;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}

.thinking-header:hover {
  background: var(--bg-hover);
}

.thinking-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.thinking-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.thinking-timer {
  font-size: 12px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.thinking-toggle {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.thinking-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.thinking-content {
  padding: 0 14px 14px;
  max-height: 400px;
  overflow-y: auto;
}

.thinking-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.thinking-cursor {
  display: inline-block;
  color: var(--text-tertiary);
  animation: blink 1s step-end infinite;
  font-size: 14px;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 折叠/展开动画 */
.thinking-expand-enter-active,
.thinking-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.thinking-expand-enter-from,
.thinking-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.thinking-expand-enter-to,
.thinking-expand-leave-from {
  opacity: 1;
  max-height: 400px;
}

/* 取消状态 */
.thinking-bubble.cancelled .thinking-label {
  color: var(--color-warning);
}
</style>
```

#### 验证

1. 在 `AIExam.vue` 中暂时手动引入 ThinkingBubble 替代 ReasoningSteps 进行测试（任务 4 会正式集成）
2. 确认气泡展开时显示流式文本 + 闪烁光标 + 计时器
3. 确认思考完成后 0.5s 自动折叠
4. 确认折叠后点击可重新展开

---

### 任务 3: FlowProgress.vue 流程进度指示器

**目标**: 新建轻量水平步骤条组件，4 个节点对应 4 个状态。

**涉及文件**:
- `src/components/FlowProgress.vue` — 新增

**完整文件内容**:

```vue
<template>
  <div class="flow-progress">
    <div
      v-for="(s, index) in steps"
      :key="s.key"
      class="flow-step"
      :class="{ active: currentIndex === index, completed: currentIndex > index, pending: currentIndex < index }"
    >
      <!-- 节点 -->
      <div class="flow-node">
        <span v-if="currentIndex > index" class="flow-check">✓</span>
        <span v-else class="flow-dot"></span>
      </div>
      <!-- 标签 -->
      <span class="flow-label">{{ s.label }}</span>
      <!-- 连接线 -->
      <div v-if="index < steps.length - 1" class="flow-line" :class="{ active: currentIndex > index }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentStep: 'init' | 'confirm' | 'generating' | 'done'
}>()

const stepOrder = ['init', 'confirm', 'generating', 'done'] as const

const steps = [
  { key: 'init', label: '选择场景' },
  { key: 'confirm', label: '配置参数' },
  { key: 'generating', label: '生成试卷' },
  { key: 'done', label: '编辑调整' }
]

const currentIndex = computed(() => stepOrder.indexOf(props.currentStep))
</script>

<style scoped>
.flow-progress {
  display: flex;
  align-items: center;
  padding: 12px 0;
  gap: 0;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.flow-node {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.flow-step.completed .flow-node {
  background: var(--accent);
}

.flow-step.active .flow-node {
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.15);
}

.flow-step.pending .flow-node {
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border-primary);
}

.flow-check {
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.flow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-quaternary);
}

.flow-label {
  font-size: 12px;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.flow-step.completed .flow-label {
  color: var(--text-tertiary);
}

.flow-step.active .flow-label {
  color: var(--text-primary);
  font-weight: 600;
}

.flow-step.pending .flow-label {
  color: var(--text-quaternary);
}

.flow-line {
  width: 32px;
  height: 1.5px;
  background: var(--border-primary);
  margin: 0 8px;
  flex-shrink: 0;
  transition: background 0.3s ease;
}

.flow-line.active {
  background: var(--accent);
}
</style>
```

#### 验证

1. 独立测试：在不同 `currentStep` 值下确认节点高亮、连线填充、文字样式正确
2. 确认步骤切换时有 scale + fade 过渡效果

---

### 任务 4: 状态过渡动画优化 + 集成 ThinkingBubble 和 FlowProgress

**目标**: 在 `AIExam.vue` 中集成 ThinkingBubble 和 FlowProgress，优化 4 处状态过渡动画。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 4.1: 在 AIExam.vue 的 `<script setup>` 中新增 import 和状态

在现有 import 区域替换/追加：

```typescript
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useExamStore } from '../stores/exam'
import { LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS, GRADE_LABELS, CHAPTER_OPTIONS } from '../types'
import type { Question, QuestionType, Difficulty, ReferenceFile } from '../types'
import ThinkingBubble from '../components/ThinkingBubble.vue'
import FlowProgress from '../components/FlowProgress.vue'
// ReasoningSteps 不再使用，保留 import 以防回退
// import ReasoningSteps from '../components/ReasoningSteps.vue'
```

#### 步骤 4.2: 替换模板中的对话区

将 `AIExam.vue` 的 `<template>` 中从 `<!-- 对话区 -->` 到 `<!-- 底部输入区域 -->` 之间的内容替换为：

```html
    <!-- 对话区 -->
    <div class="chat-area">
      <div class="chat-header">
        <span class="chat-title">AI 组卷</span>
        <el-button v-if="examStore.showPreview" text size="small" @click="examStore.reset()">
          重新出题
        </el-button>
      </div>

      <!-- 流程进度指示器（非 init 状态显示） -->
      <transition name="fade-slide">
        <div v-if="step !== 'init'" class="flow-progress-wrapper">
          <FlowProgress :current-step="step" />
        </div>
      </transition>

      <div class="chat-messages" ref="messagesRef">
        <!-- 初始化状态：极简界面 -->
        <transition name="fade-out">
          <div v-if="step === 'init'" class="init-container">
            <div class="init-greeting">请描述您的出题需求，或选择一个快捷场景。</div>
            <div class="quick-scenes">
              <button
                v-for="scene in quickScenes"
                :key="scene.key"
                class="scene-chip"
                @click="selectScene(scene)"
              >{{ scene.label }}</button>
            </div>
          </div>
        </transition>

        <!-- 对话流程 -->
        <template v-if="step !== 'init'">
          <transition-group name="message-in" tag="div" class="messages-list">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message"
              :class="msg.role"
            >
              <div v-if="msg.role === 'assistant'" class="message-avatar">AI</div>
              <div class="message-body">
                <!-- 纯文本消息 -->
                <div v-if="msg.type === 'text'" class="message-content" v-html="formatMessage(msg.content)"></div>
                <!-- 思考气泡（替代旧的 reasoning 类型） -->
                <div v-if="msg.type === 'thinking'" class="message-content thinking-card">
                  <ThinkingBubble
                    :thinking-text="examStore.thinkingText"
                    :is-thinking="examStore.isThinking"
                    :is-thinking-completed="examStore.isThinkingCompleted"
                    :is-thinking-cancelled="examStore.isThinkingCancelled"
                    :thinking-duration="examStore.thinkingDuration"
                  />
                </div>
                <!-- 摘要卡片 -->
                <div v-if="msg.type === 'summary-card' && examStore.examSummary" class="message-content summary-card-wrapper">
                  <SummaryCard
                    :summary="examStore.examSummary"
                    @view-paper="handleViewPaper"
                  />
                </div>
              </div>
            </div>
          </transition-group>
        </template>
      </div>

      <!-- 底部输入区域 -->
      <div class="chat-input" v-if="step !== 'done'">
```

注意：`SummaryCard` 将在任务 5 中创建，此处先预留。在任务 5 完成前，可以暂时注释掉 summary-card 部分。

#### 步骤 4.3: 修改 `selectScene` 函数

替换现有的 `selectScene` 函数：

```typescript
function selectScene(scene: typeof quickScenes[0]) {
  // init → confirm 过渡：先 fade-out init 容器，再切换
  step.value = 'confirm'
  const d = scene.defaults
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) {
    examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  }
  examStore.condition.count = d.count
  examStore.condition.questionTypes = [...d.questionTypes]
  addMsg('user', `我选择了「${scene.label}」`)
  addMsg('assistant', `已为您预设${scene.label}参数，您可以在下方调整后点击发送。`)
  showParamsPanel.value = true
  scrollToBottom()
}
```

#### 步骤 4.4: 修改 `startGenerate` 函数

替换现有的 `startGenerate` 函数：

```typescript
async function startGenerate() {
  step.value = 'generating'
  examStore.isGenerating = true

  // 添加思考气泡消息
  addMsg('assistant', 'AI 正在思考...', 'thinking')

  await examStore.generateExam()

  if (examStore.isThinkingCancelled) {
    // 取消场景
    addMsg('assistant', '已取消生成。是否保留当前结果？')
    step.value = 'confirm'
    scrollToBottom()
    return
  }

  step.value = 'done'
  examStore.isGenerating = false

  // 添加摘要卡片消息
  if (examStore.examSummary) {
    addMsg('assistant', '', 'summary-card')
  }

  scrollToBottom()
}
```

#### 步骤 4.5: 新增 `handleViewPaper` 函数

```typescript
function handleViewPaper() {
  examStore.showPreview = true
}
```

#### 步骤 4.6: 新增过渡动画 CSS

在 `AIExam.vue` 的 `<style scoped>` 中追加：

```css
/* ========== 流程进度指示器 ========== */
.flow-progress-wrapper {
  padding: 0 40px;
  flex-shrink: 0;
}

/* ========== 过渡动画 ========== */
.fade-out-leave-active {
  transition: all 0.3s ease;
}
.fade-out-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-slide-enter-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.message-in-enter-active {
  transition: all 0.3s ease;
}
.message-in-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.messages-list {
  display: flex;
  flex-direction: column;
}

/* 思考气泡卡片容器 */
.thinking-card {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 摘要卡片容器 */
.summary-card-wrapper {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 参数面板高亮动画 */
@keyframes highlightBorder {
  0%, 100% { border-color: var(--border-primary); }
  50% { border-color: var(--accent); }
}

.params-panel--highlight {
  animation: highlightBorder 0.5s ease 2;
}
```

#### 步骤 4.7: 删除旧的 ReasoningSteps 引用

从模板中删除所有 `ReasoningSteps` 相关代码（已在步骤 4.2 中替换），并从 `<script setup>` 中删除 `import ReasoningSteps` 语句。

#### 验证

```bash
cd /sessions/69d75798fc9012d6ae86c8ba/workspace/ai-question-generator && pnpm dev
```

1. 打开页面，确认 init 状态无进度条
2. 点击场景按钮，确认 init 容器 fade-out 消失，进度条出现，confirm 节点高亮
3. 点击确认生成，确认进度条推进到 generating，思考气泡以 scale-y 动画展开
4. 确认思考文本逐句流式追加，光标闪烁，计时器运行
5. 确认思考完成后气泡自动折叠，进度条推进到 done
6. 确认卷面预览以 slide-right 动画滑入

---

### 任务 5: SummaryCard.vue 完成摘要卡片

**目标**: 新建摘要卡片组件，展示试卷生成统计信息。

**涉及文件**:
- `src/components/SummaryCard.vue` — 新增

**完整文件内容**:

```vue
<template>
  <div class="summary-card">
    <div class="summary-title">试卷生成完成</div>

    <div class="summary-stats">
      <div class="summary-stat-row">
        <span class="stat-label">总题数</span>
        <span class="stat-value">{{ summary.totalQuestions }} 道</span>
      </div>
      <div class="summary-stat-row summary-indent">
        <span class="stat-label">题库匹配</span>
        <span class="stat-value">{{ summary.bankQuestions }} 道</span>
      </div>
      <div class="summary-stat-row summary-indent">
        <span class="stat-label">AI 生成</span>
        <span class="stat-value">{{ summary.aiQuestions }} 道</span>
      </div>
    </div>

    <div class="summary-section">
      <div class="summary-section-title">难度分布</div>
      <div class="difficulty-bar" v-for="d in difficultyBars" :key="d.key">
        <span class="difficulty-name">{{ d.label }}</span>
        <div class="difficulty-track">
          <div class="difficulty-fill" :style="{ width: d.percent + '%' }"></div>
        </div>
        <span class="difficulty-count">{{ d.count }}道</span>
        <span class="difficulty-percent">{{ d.percent }}%</span>
      </div>
    </div>

    <div class="summary-meta">
      <span>满分：{{ summary.totalScore }} 分</span>
      <span class="meta-divider">|</span>
      <span>时长：{{ summary.duration }} 分钟</span>
    </div>

    <div class="summary-action">
      <button class="view-paper-btn" @click="$emit('viewPaper')">
        查看试卷 →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExamSummary } from '../types'

const props = defineProps<{
  summary: ExamSummary
}>()

defineEmits<{
  viewPaper: []
}>()

const difficultyBars = computed(() => {
  const dist = props.summary.difficultyDistribution
  const total = props.summary.totalQuestions || 1
  return [
    { key: 'easy', label: '简单', count: dist.easy, percent: Math.round(dist.easy / total * 100) },
    { key: 'medium', label: '中等', count: dist.medium, percent: Math.round(dist.medium / total * 100) },
    { key: 'hard', label: '困难', count: dist.hard, percent: Math.round(dist.hard / total * 100) }
  ]
})
</script>

<style scoped>
.summary-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  max-width: 340px;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.summary-stats {
  margin-bottom: 14px;
}

.summary-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 13px;
}

.summary-indent {
  padding-left: 16px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text-primary);
  font-weight: 500;
}

.summary-section {
  margin-bottom: 14px;
}

.summary-section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.difficulty-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.difficulty-name {
  width: 32px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.difficulty-track {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.difficulty-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.difficulty-count {
  color: var(--text-secondary);
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

.difficulty-percent {
  color: var(--text-tertiary);
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.summary-meta {
  font-size: 12px;
  color: var(--text-secondary);
  padding-top: 10px;
  border-top: 1px solid var(--border-secondary);
  margin-bottom: 12px;
}

.meta-divider {
  margin: 0 8px;
  color: var(--border-primary);
}

.summary-action {
  text-align: right;
}

.view-paper-btn {
  padding: 6px 16px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.view-paper-btn:hover {
  background: var(--accent-hover);
}
</style>
```

#### 步骤 5.1: 在 AIExam.vue 中 import SummaryCard

在 `AIExam.vue` 的 `<script setup>` 中追加：

```typescript
import SummaryCard from '../components/SummaryCard.vue'
```

（如果任务 4 中已预留了 summary-card 模板代码，现在取消注释即可。）

#### 验证

1. 生成试卷完成后，确认对话区出现摘要卡片
2. 确认卡片显示正确的题数、难度分布、分值、时长
3. 确认难度分布条形图正确渲染
4. 点击「查看试卷」按钮，确认卷面预览滑入

---

### 任务 6: 题目拖拽排序

**目标**: 使用已安装的 `vuedraggable` 实现题目拖拽排序。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 6.1: 在 AIExam.vue 中 import vuedraggable

```typescript
import draggable from 'vuedraggable'
```

#### 步骤 6.2: 修改 questionGroups computed

替换现有的 `questionGroups` computed，使其返回可变数组：

```typescript
// 按题型分组（返回响应式数组，支持拖拽排序）
const questionGroups = computed(() => {
  if (!examStore.currentPaper) return []
  const groups: Record<string, Question[]> = {}
  examStore.currentPaper.questions.forEach(q => {
    if (!groups[q.type]) groups[q.type] = []
    groups[q.type].push(q)
  })
  const order: QuestionType[] = ['choice', 'judgment', 'fillBlank', 'shortAnswer']
  const chineseNum = ['一', '二', '三', '四', '五']
  let idx = 0
  return order.filter(t => groups[t]).map(t => ({
    type: t,
    title: `${chineseNum[idx++]}、${LABELS[t]}`,
    questions: groups[t]
  }))
})
```

#### 步骤 6.3: 替换卷面预览中的题目列表为 draggable

将模板中 `<!-- 卷面预览区 -->` 内的 `v-for="(group, gIdx) in questionGroups"` 循环替换为：

```html
            <draggable
              v-for="(group, gIdx) in questionGroups"
              :key="group.type"
              v-model="group.questions"
              item-key="id"
              handle=".drag-handle"
              ghost-class="question-ghost"
              animation="200"
              group="questions"
              class="question-group"
              @end="onDragEnd"
            >
              <template #item="{ element: q, index: qIdx }">
                <div
                  class="question-item"
                  :class="{ editing: editingId === q.id }"
                  @click="editingId = q.id"
                >
                  <div class="question-header">
                    <span class="drag-handle" title="拖拽排序">⋮⋮</span>
                    <span class="question-number">{{ getQuestionNumber(q, gIdx, qIdx) }}.</span>
                    <span class="question-source">{{ q.source === 'bank' ? '题库' : 'AI生成' }}</span>
                    <div class="question-actions" @click.stop>
                      <el-button text size="small" @click="openQuestionAction(q)">操作 ▾</el-button>
                    </div>
                  </div>
                  <div class="question-content" v-html="formatQuestion(q)"></div>
                  <div v-if="editingId === q.id" class="question-edit" @click.stop>
                    <el-input v-model="editContent" type="textarea" :rows="3" size="small" />
                    <div class="edit-actions">
                      <el-button size="small" type="primary" @click="saveEdit(q)">保存</el-button>
                      <el-button size="small" @click="editingId = null">取消</el-button>
                    </div>
                  </div>
                </div>
              </template>
            </draggable>
```

注意：需要将 `group-title` 从 draggable 外部移到上方。完整结构为：

```html
            <div v-for="(group, gIdx) in questionGroups" :key="group.type" class="question-group-wrapper">
              <div class="group-title">{{ group.title }}（共 {{ group.questions.length }} 题，{{ group.questions.reduce((s, q) => s + q.score, 0) }} 分）</div>
              <draggable
                v-model="group.questions"
                item-key="id"
                handle=".drag-handle"
                ghost-class="question-ghost"
                animation="200"
                group="questions"
                class="question-group"
                @end="onDragEnd"
              >
                <template #item="{ element: q, index: qIdx }">
                  <div
                    class="question-item"
                    :class="{ editing: editingId === q.id }"
                    @click="editingId = q.id"
                  >
                    <div class="question-header">
                      <span class="drag-handle" title="拖拽排序">⋮⋮</span>
                      <span class="question-number">{{ getQuestionNumber(q, gIdx, qIdx) }}.</span>
                      <span class="question-source">{{ q.source === 'bank' ? '题库' : 'AI生成' }}</span>
                      <div class="question-actions" @click.stop>
                        <el-button text size="small" @click="openQuestionAction(q)">操作 ▾</el-button>
                      </div>
                    </div>
                    <div class="question-content" v-html="formatQuestion(q)"></div>
                    <div v-if="editingId === q.id" class="question-edit" @click.stop>
                      <el-input v-model="editContent" type="textarea" :rows="3" size="small" />
                      <div class="edit-actions">
                        <el-button size="small" type="primary" @click="saveEdit(q)">保存</el-button>
                        <el-button size="small" @click="editingId = null">取消</el-button>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
```

#### 步骤 6.4: 添加拖拽结束回调

```typescript
function onDragEnd() {
  // 拖拽后同步回 currentPaper.questions
  if (!examStore.currentPaper) return
  const allQuestions: Question[] = []
  questionGroups.value.forEach(group => {
    allQuestions.push(...group.questions)
  })
  examStore.currentPaper.questions = allQuestions
}
```

#### 步骤 6.5: 添加拖拽相关 CSS

```css
/* ========== 拖拽排序 ========== */
.drag-handle {
  cursor: grab;
  color: var(--text-quaternary);
  font-size: 14px;
  letter-spacing: -2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
  padding: 0 4px;
  user-select: none;
}

.question-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.question-ghost {
  opacity: 0.4;
  border: 1px dashed var(--accent) !important;
  background: var(--bg-secondary) !important;
}

.question-group-wrapper {
  margin-bottom: 24px;
}

.question-group {
  min-height: 20px;
}
```

#### 验证

1. 生成试卷后，在卷面预览中 hover 题目，确认左侧出现拖拽手柄
2. 拖拽题目到新位置，确认题目顺序更新
3. 尝试跨题型组拖拽，确认题目移动到新组
4. 确认拖拽时有半透明占位符效果
5. 确认松手后题目平滑归位

---

## P2 — 增强体验

---

### 任务 7: 版本回撤数据层

**目标**: 在 Store 中完善版本管理功能（任务 1 已添加基础结构，此任务确保数据层完整可用）。

**涉及文件**:
- `src/stores/exam.ts` — 已在任务 1 中完成
- `src/views/AIExam.vue` — 修改（saveEdit 带版本记录）

#### 步骤 7.1: 修改 saveEdit 函数带版本记录

在 `AIExam.vue` 中替换 `saveEdit` 函数：

```typescript
function saveEdit(q: Question) {
  // 压入版本
  examStore.pushVersion(q.id, { ...q }, '手动编辑')
  q.content = editContent.value
  editingId.value = null
}
```

#### 验证

1. 打开 Vue DevTools
2. 编辑一道题目并保存
3. 检查 Store 中 `questionVersions` Map 是否有该题目的版本记录
4. 再次编辑并保存，确认版本栈增加到 2

---

### 任务 8: 版本回撤 UI（VersionPanel + DiffViewer）

**目标**: 新建版本列表面板和 Diff 对比视图组件，集成到题目操作弹窗中。

**涉及文件**:
- `src/components/VersionPanel.vue` — 新增
- `src/components/DiffViewer.vue` — 新增
- `src/views/AIExam.vue` — 修改

#### 步骤 8.1: 新建 DiffViewer.vue

**文件**: `src/components/DiffViewer.vue`

```vue
<template>
  <div class="diff-viewer">
    <div class="diff-header">
      <span class="diff-title">版本对比</span>
    </div>
    <div class="diff-columns">
      <div class="diff-col">
        <div class="diff-col-label">当前版本</div>
        <div class="diff-content">{{ currentText }}</div>
      </div>
      <div class="diff-col">
        <div class="diff-col-label diff-col-label--old">历史版本</div>
        <div class="diff-content">{{ oldText }}</div>
      </div>
    </div>
    <div class="diff-actions">
      <el-button size="small" type="primary" @click="$emit('restore')">恢复此版本</el-button>
      <el-button size="small" @click="$emit('close')">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '../types'

const props = defineProps<{
  currentQuestion: Question
  oldQuestion: Question
}>()

defineEmits<{
  restore: []
  close: []
}>()

const currentText = computed(() => {
  const q = props.currentQuestion
  let text = q.content
  if (q.options?.length) {
    text += '\n' + q.options.map(o => `${o.label}. ${o.content}`).join('\n')
  }
  text += `\n答案：${q.answer}`
  return text
})

const oldText = computed(() => {
  const q = props.oldQuestion
  let text = q.content
  if (q.options?.length) {
    text += '\n' + q.options.map(o => `${o.label}. ${o.content}`).join('\n')
  }
  text += `\n答案：${q.answer}`
  return text
})
</script>

<style scoped>
.diff-viewer {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.diff-header {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.diff-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.diff-columns {
  display: flex;
  gap: 0;
}

.diff-col {
  flex: 1;
  padding: 12px;
  border-right: 1px solid var(--border-primary);
}

.diff-col:last-child {
  border-right: none;
}

.diff-col-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-secondary);
}

.diff-col-label--old {
  color: var(--color-warning);
}

.diff-content {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.diff-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
}
</style>
```

#### 步骤 8.2: 新建 VersionPanel.vue

**文件**: `src/components/VersionPanel.vue`

```vue
<template>
  <div class="version-panel">
    <div class="version-panel-header">
      <span class="version-panel-title">历史版本</span>
      <button class="version-panel-close" @click="$emit('close')">✕</button>
    </div>
    <div class="version-list" v-if="versions.length > 0">
      <div
        v-for="(ver, index) in reversedVersions"
        :key="index"
        class="version-card"
        :class="{ active: selectedVersionIndex === (versions.length - 1 - index) }"
        @click="selectVersion(versions.length - 1 - index)"
      >
        <div class="version-card-header">
          <span class="version-action">{{ ver.action }}</span>
          <span class="version-time">{{ formatRelativeTime(ver.timestamp) }}</span>
        </div>
        <div class="version-preview">{{ ver.question.content.substring(0, 60) }}{{ ver.question.content.length > 60 ? '...' : '' }}</div>
        <span v-if="versions.length - 1 - index === versions.length - 1" class="version-current-badge">当前</span>
      </div>
    </div>
    <div v-else class="version-empty">暂无历史版本</div>

    <!-- Diff 对比视图 -->
    <transition name="slide-up">
      <DiffViewer
        v-if="selectedVersionIndex !== null && currentQuestion"
        :current-question="currentQuestion"
        :old-question="versions[selectedVersionIndex].question"
        @restore="handleRestore"
        @close="selectedVersionIndex = null"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QuestionVersion, Question } from '../types'
import DiffViewer from './DiffViewer.vue'

const props = defineProps<{
  versions: QuestionVersion[]
  currentQuestion: Question | null
}>()

const emit = defineEmits<{
  restore: [versionIndex: number]
  close: []
}>()

const selectedVersionIndex = ref<number | null>(null)

const reversedVersions = computed(() => [...props.versions].reverse())

function selectVersion(index: number) {
  selectedVersionIndex.value = selectedVersionIndex.value === index ? null : index
}

function handleRestore() {
  if (selectedVersionIndex.value !== null) {
    emit('restore', selectedVersionIndex.value)
    selectedVersionIndex.value = null
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}
</script>

<style scoped>
.version-panel {
  width: 320px;
  border-left: 1px solid var(--border-primary);
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.version-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.version-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.version-panel-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.version-panel-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.version-card {
  padding: 10px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.version-card:hover {
  border-color: var(--accent);
  background: var(--bg-secondary);
}

.version-card.active {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.version-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.version-action {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.version-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.version-preview {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.version-current-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--accent);
  color: #fff;
}

.version-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
```

#### 步骤 8.3: 在 AIExam.vue 的题目操作弹窗中集成版本面板

在 `AIExam.vue` 的 `<script setup>` 中追加：

```typescript
import VersionPanel from '../components/VersionPanel.vue'

const showVersionPanel = ref(false)
```

在题目操作弹窗的 `el-dialog` 中，将 `width="480px"` 改为 `:width="showVersionPanel ? '800px' : '480px'"`。

在弹窗内容末尾（`action-tips` 之后）追加撤销按钮和版本面板：

```html
        <!-- 撤销按钮 -->
        <div v-if="actionQuestion && examStore.getVersions(actionQuestion.id).length > 0" class="action-section">
          <button class="quick-btn quick-btn--undo" @click="showVersionPanel = !showVersionPanel">
            <span class="quick-btn-icon">↩️</span>
            <span class="quick-btn-label">撤销 ({{ examStore.getVersions(actionQuestion.id).length }})</span>
            <span class="quick-btn-desc">查看历史版本</span>
          </button>
        </div>
```

在 `el-dialog` 内部追加版本面板（与 action-panel 并列）：

```html
      <!-- 版本面板（在弹窗右侧滑出） -->
      <transition name="slide-left">
        <VersionPanel
          v-if="showVersionPanel && actionQuestion"
          :versions="examStore.getVersions(actionQuestion.id)"
          :current-question="actionQuestion"
          @restore="handleRestoreVersion"
          @close="showVersionPanel = false"
        />
      </transition>
```

追加 `handleRestoreVersion` 函数：

```typescript
function handleRestoreVersion(versionIndex: number) {
  if (!actionQuestion.value) return
  examStore.restoreVersion(actionQuestion.value.id, versionIndex)
  // 刷新引用
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) actionQuestion.value = updated
  showVersionPanel.value = false
}
```

追加 CSS：

```css
.quick-btn--undo {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
```

#### 验证

1. 生成试卷后，对一道题执行改编操作
2. 打开该题的操作弹窗，确认出现「撤销 (1)」按钮
3. 点击撤销按钮，确认版本面板从右侧滑出
4. 确认版本列表显示操作描述和相对时间
5. 点击版本卡片，确认 Diff 对比视图展开
6. 点击「恢复此版本」，确认题目内容恢复

---

### 任务 9: 取消生成按钮

**目标**: 在思考气泡标题栏增加取消按钮。

**涉及文件**:
- `src/components/ThinkingBubble.vue` — 修改

#### 步骤 9.1: 修改 ThinkingBubble.vue

在 `<script setup>` 中追加 emit：

```typescript
const emit = defineEmits<{
  cancel: []
}>()
```

在模板的标题栏中，计时器旁边追加取消按钮：

```html
      <span v-if="!completed && !cancelled" class="thinking-timer">{{ elapsedDisplay }}</span>
      <button
        v-if="!completed && !cancelled"
        class="thinking-cancel"
        @click.stop="emit('cancel')"
      >取消</button>
      <span class="thinking-toggle">{{ collapsed ? '展开' : '收起' }}</span>
```

追加 CSS：

```css
.thinking-cancel {
  font-size: 12px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.thinking-cancel:hover {
  color: var(--color-danger);
  background: #fff2f0;
}
```

#### 步骤 9.2: 在 AIExam.vue 中处理取消事件

在 ThinkingBubble 组件使用处追加 `@cancel` 事件：

```html
                  <ThinkingBubble
                    :thinking-text="examStore.thinkingText"
                    :is-thinking="examStore.isThinking"
                    :is-thinking-completed="examStore.isThinkingCompleted"
                    :is-thinking-cancelled="examStore.isThinkingCancelled"
                    :thinking-duration="examStore.thinkingDuration"
                    @cancel="handleCancelGenerate"
                  />
```

追加 `handleCancelGenerate` 函数：

```typescript
function handleCancelGenerate() {
  examStore.cancelGenerate()
}
```

（`startGenerate` 中已处理取消后的逻辑。）

#### 验证

1. 开始生成试卷
2. 在思考气泡展开状态下，确认标题栏显示「取消」按钮
3. 点击取消，确认思考停止，气泡折叠为「已取消」状态
4. 确认对话区出现「已取消生成」消息

---

### 任务 10: 分值调整

**目标**: 在题目操作弹窗中增加分值调整功能。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 10.1: 在操作弹窗中增加分值输入

在题目操作弹窗的 `action-current-meta` 区域后追加：

```html
        <!-- 分值调整 -->
        <div class="action-section">
          <div class="action-section-title">分值调整</div>
          <div class="score-adjust">
            <el-input-number
              v-model="actionScore"
              :min="1"
              :max="20"
              :step="1"
              size="small"
              controls-position="right"
            />
            <el-button
              size="small"
              type="primary"
              :disabled="!actionQuestion || actionScore === actionQuestion.score"
              @click="handleUpdateScore"
            >应用</el-button>
          </div>
        </div>
```

#### 步骤 10.2: 新增状态和函数

在 `<script setup>` 中追加：

```typescript
const actionScore = ref(5)

// 在 openQuestionAction 中初始化 actionScore
function openQuestionAction(q: Question) {
  actionQuestion.value = q
  actionCustomText.value = ''
  actionScore.value = q.score
  showVersionPanel.value = false
  actionDialogVisible.value = true
}

function handleUpdateScore() {
  if (!actionQuestion.value) return
  examStore.updateQuestionScore(actionQuestion.value.id, actionScore.value)
  // 刷新引用
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) {
    actionQuestion.value = updated
    actionScore.value = updated.score
  }
}
```

#### 步骤 10.3: 追加 CSS

```css
.score-adjust {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-adjust :deep(.el-input-number) {
  width: 120px;
}
```

#### 验证

1. 打开任意题目的操作弹窗
2. 确认分值输入框显示当前分值
3. 修改分值并点击「应用」
4. 确认卷面预览中该题分值更新，总分重新计算

---

### 任务 11: 批量操作工具栏

**目标**: 在卷面预览 header 下方增加批量操作工具栏。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 11.1: 新增状态

```typescript
const selectedQuestionIds = ref<Set<string>>(new Set())
const batchMode = ref(false)
const batchActionDialogVisible = ref(false)
const batchActionType = ref<'delete' | 'adapt' | 'score'>('delete')
const batchScore = ref(5)
```

#### 步骤 11.2: 在卷面预览 header 下方追加工具栏

在 `preview-header` 之后、`preview-content` 之前追加：

```html
        <!-- 批量操作工具栏 -->
        <div v-if="step === 'done'" class="batch-toolbar">
          <label class="batch-select-all">
            <input
              type="checkbox"
              :checked="batchMode && selectedQuestionIds.size === allQuestionIds.length"
              @change="toggleBatchMode"
            />
            <span v-if="!batchMode">批量操作</span>
            <span v-else>已选 {{ selectedQuestionIds.size }}/{{ allQuestionIds.length }}</span>
          </label>
          <template v-if="batchMode && selectedQuestionIds.size > 0">
            <el-button size="small" @click="batchActionType = 'delete'; batchActionDialogVisible = true">批量删除</el-button>
            <el-button size="small" @click="batchActionType = 'adapt'; batchActionDialogVisible = true">批量改编</el-button>
            <el-button size="small" @click="batchActionType = 'score'; batchScore = 5; batchActionDialogVisible = true">调整分值</el-button>
          </template>
          <el-button v-if="batchMode" size="small" text @click="exitBatchMode">退出批量</el-button>
        </div>
```

#### 步骤 11.3: 新增计算属性和函数

```typescript
const allQuestionIds = computed(() => {
  return examStore.currentPaper?.questions.map(q => q.id) || []
})

function toggleBatchMode() {
  if (!batchMode.value) {
    batchMode.value = true
    selectedQuestionIds.value = new Set()
  } else {
    // 全选/取消全选
    if (selectedQuestionIds.value.size === allQuestionIds.value.length) {
      selectedQuestionIds.value = new Set()
    } else {
      selectedQuestionIds.value = new Set(allQuestionIds.value)
    }
  }
}

function exitBatchMode() {
  batchMode.value = false
  selectedQuestionIds.value = new Set()
}

function toggleQuestionSelect(qId: string) {
  if (selectedQuestionIds.value.has(qId)) {
    selectedQuestionIds.value.delete(qId)
  } else {
    selectedQuestionIds.value.add(qId)
  }
  selectedQuestionIds.value = new Set(selectedQuestionIds.value)
}

function confirmBatchAction() {
  const ids = Array.from(selectedQuestionIds.value)
  if (ids.length === 0) return

  switch (batchActionType.value) {
    case 'delete':
      examStore.batchRemoveQuestions(ids)
      break
    case 'adapt':
      examStore.batchAdaptQuestions(ids, 'difficulty')
      break
    case 'score':
      examStore.batchUpdateScore(ids, batchScore.value)
      break
  }

  batchActionDialogVisible.value = false
  exitBatchMode()
}
```

#### 步骤 11.4: 在题目项中增加复选框

在 draggable 的 `question-item` 中，`question-header` 前追加：

```html
                  <input
                    v-if="batchMode"
                    type="checkbox"
                    :checked="selectedQuestionIds.has(q.id)"
                    @change="toggleQuestionSelect(q.id)"
                    class="batch-checkbox"
                    @click.stop
                  />
```

并为选中题目添加高亮样式：

```css
.question-item.batch-selected {
  background: var(--accent-bg);
  border-color: var(--accent);
}

.batch-checkbox {
  margin-right: 6px;
  cursor: pointer;
  accent-color: var(--accent);
}
```

#### 步骤 11.5: 批量操作确认弹窗

在模板末尾追加：

```html
    <!-- 批量操作确认弹窗 -->
    <el-dialog
      v-model="batchActionDialogVisible"
      :title="batchActionType === 'delete' ? '批量删除' : batchActionType === 'adapt' ? '批量改编' : '批量调整分值'"
      width="360px"
      append-to-body
    >
      <div v-if="batchActionType === 'delete'">
        <p>确定要删除选中的 <strong>{{ selectedQuestionIds.size }}</strong> 道题目吗？此操作不可撤销。</p>
      </div>
      <div v-else-if="batchActionType === 'adapt'">
        <p>将对选中的 <strong>{{ selectedQuestionIds.size }}</strong> 道题目执行难度轮换。</p>
      </div>
      <div v-else-if="batchActionType === 'score'">
        <p>将选中的 <strong>{{ selectedQuestionIds.size }}</strong> 道题目的分值统一设置为：</p>
        <el-input-number v-model="batchScore" :min="1" :max="20" size="small" style="margin-top: 8px;" />
      </div>
      <template #footer>
        <el-button size="small" @click="batchActionDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmBatchAction">确认</el-button>
      </template>
    </el-dialog>
```

#### 步骤 11.6: 追加批量工具栏 CSS

```css
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.batch-select-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.batch-select-all input[type="checkbox"] {
  accent-color: var(--accent);
}
```

#### 验证

1. 生成试卷后，确认卷面预览 header 下方出现「批量操作」复选框
2. 勾选复选框进入批量模式，确认所有题目左侧出现复选框
3. 选择几道题目，确认工具栏显示选中数量和操作按钮
4. 测试批量删除、批量改编、批量调整分值
5. 确认退出批量模式后复选框消失

---

### 任务 12: 全局撤销 + 卷面预览缩放/答案切换

**目标**: 实现 Ctrl+Z 全局撤销；增加卷面预览缩放和答案显示切换。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 12.1: 全局撤销快捷键

在 `<script setup>` 中追加：

```typescript
import { ElMessage } from 'element-plus'

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (step.value !== 'done') return
    e.preventDefault()
    const result = examStore.undoLastAction()
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.info(result.message)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
```

#### 步骤 12.2: 卷面预览缩放和答案切换

新增状态：

```typescript
const previewZoom = ref(100)
const showAnswers = ref(false)
```

在 `preview-header` 中追加控制按钮：

```html
        <div class="preview-header">
          <span class="preview-title">卷面预览</span>
          <div class="preview-actions">
            <!-- 缩放控制 -->
            <div class="zoom-controls">
              <button
                v-for="z in [100, 125, 150]"
                :key="z"
                class="zoom-btn"
                :class="{ active: previewZoom === z }"
                @click="previewZoom = z"
              >{{ z }}%</button>
            </div>
            <!-- 答案切换 -->
            <button class="answer-toggle" :class="{ active: showAnswers }" @click="showAnswers = !showAnswers">
              {{ showAnswers ? '隐藏答案' : '显示答案' }}
            </button>
            <el-button size="small" @click="handleExportWord">导出 Word</el-button>
            <el-button size="small" @click="handlePrint">打印</el-button>
          </div>
        </div>
```

在 `a4-paper` 的 `div` 上应用缩放：

```html
          <div class="a4-paper" :style="{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }">
```

在题目内容后追加答案区域：

```html
                <div v-if="showAnswers" class="question-answer">
                  <div class="answer-label">答案</div>
                  <div>{{ q.answer }}</div>
                  <div v-if="q.analysis" class="answer-analysis">解析：{{ q.analysis }}</div>
                </div>
```

追加 CSS：

```css
.zoom-controls {
  display: flex;
  gap: 2px;
  margin-right: 8px;
}

.zoom-btn {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.zoom-btn:first-child {
  border-radius: 4px 0 0 4px;
}

.zoom-btn:last-child {
  border-radius: 0 4px 4px 0;
}

.zoom-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.answer-toggle {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
  margin-right: 8px;
}

.answer-toggle.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.question-answer {
  margin-top: 8px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.answer-label {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.answer-analysis {
  margin-top: 4px;
  color: var(--text-tertiary);
}
```

#### 验证

1. 在 done 状态下按 Ctrl+Z，确认弹出撤销 toast 提示
2. 连续按 Ctrl+Z 多次，确认逐步回撤
3. 点击缩放按钮，确认卷面预览缩放正确
4. 点击「显示答案」，确认每道题下方出现答案和解析
5. 再次点击「隐藏答案」，确认答案隐藏

---

## P3 — 锦上添花

---

### 任务 13: 参数配置栏优化

**目标**: 场景预设后展示参数摘要标签；增加重置按钮。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 13.1: 新增状态

```typescript
const originalDefaults = ref<Partial<ExamCondition> | null>(null)
```

#### 步骤 13.2: 修改 selectScene 保存原始默认值

```typescript
function selectScene(scene: typeof quickScenes[0]) {
  step.value = 'confirm'
  const d = scene.defaults
  originalDefaults.value = { ...d }
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) {
    examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  }
  examStore.condition.count = d.count
  examStore.condition.questionTypes = [...d.questionTypes]
  addMsg('user', `我选择了「${scene.label}」`)
  addMsg('assistant', `已为您预设${scene.label}参数，您可以在下方调整后点击发送。`)
  showParamsPanel.value = true
  scrollToBottom()
}
```

#### 步骤 13.3: 在参数面板底部追加摘要和重置按钮

在 `params-panel-footer` 前追加：

```html
            <!-- 参数摘要标签 -->
            <div v-if="paramSummaryTags.length > 0" class="params-summary">
              <span
                v-for="tag in paramSummaryTags"
                :key="tag"
                class="param-summary-tag"
              >{{ tag }}</span>
              <button
                v-if="originalDefaults"
                class="param-reset-btn"
                @click="resetParamsToDefault"
              >重置为默认</button>
            </div>
```

新增计算属性和函数：

```typescript
const paramSummaryTags = computed(() => {
  const tags: string[] = []
  const c = examStore.condition
  const ratio = c.difficultyRatio
  if (ratio) {
    tags.push(`难度 ${ratio.easy}:${ratio.medium}:${ratio.hard}`)
  }
  tags.push(`${c.count || 15}题`)
  if (c.questionTypes?.length) {
    tags.push(c.questionTypes.map(t => LABELS[t]).join('+'))
  }
  return tags
})

function resetParamsToDefault() {
  if (!originalDefaults.value) return
  const d = originalDefaults.value
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) {
    examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  }
  examStore.condition.count = d.count
  if (d.questionTypes) {
    examStore.condition.questionTypes = [...d.questionTypes]
  }
}
```

追加 CSS：

```css
.params-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 16px;
  border-top: 1px solid var(--border-secondary);
}

.param-summary-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}

.param-reset-btn {
  font-size: 11px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  text-decoration: underline;
}

.param-reset-btn:hover {
  color: var(--accent);
}
```

#### 验证

1. 选择场景后，确认参数面板底部显示摘要标签
2. 修改参数后，确认标签更新
3. 点击「重置为默认」，确认参数恢复到场景预设值

---

### 任务 14: 对话区细节优化

**目标**: 欢迎语打字机效果；场景按钮增加图标。

**涉及文件**:
- `src/views/AIExam.vue` — 修改

#### 步骤 14.1: 欢迎语打字机效果

新增状态和函数：

```typescript
const greetingText = ref('')
const fullGreeting = '请描述您的出题需求，或选择一个快捷场景。'
const greetingDone = ref(false)

onMounted(() => {
  // 打字机效果
  let i = 0
  const timer = setInterval(() => {
    if (i < fullGreeting.length) {
      greetingText.value += fullGreeting[i]
      i++
    } else {
      clearInterval(timer)
      greetingDone.value = true
    }
  }, 40)
})
```

在模板中替换 init-greeting：

```html
            <div class="init-greeting">{{ greetingText }}<span v-if="!greetingDone" class="typing-cursor">▌</span></div>
```

#### 步骤 14.2: 场景按钮增加图标

修改 `quickScenes` 数组：

```typescript
const quickScenes = [
  { key: 'homework', label: '课后练习', icon: '📖', defaults: { scene: 'homework' as const, difficultyRatio: { easy: 40, medium: 50, hard: 10 }, count: 15, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } },
  { key: 'unitTest', label: '单元测验', icon: '📋', defaults: { scene: 'unitTest' as const, difficultyRatio: { easy: 30, medium: 50, hard: 20 }, count: 20, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
  { key: 'midterm', label: '期中复习', icon: '📊', defaults: { scene: 'midterm' as const, difficultyRatio: { easy: 30, medium: 40, hard: 30 }, count: 25, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
  { key: 'special', label: '专项训练', icon: '🎯', defaults: { scene: 'special' as const, difficultyRatio: { easy: 20, medium: 50, hard: 30 }, count: 12, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } }
]
```

在模板中修改场景按钮：

```html
              <button
                v-for="scene in quickScenes"
                :key="scene.key"
                class="scene-chip"
                @click="selectScene(scene)"
              >{{ scene.icon }} {{ scene.label }}</button>
```

追加 CSS：

```css
.typing-cursor {
  display: inline-block;
  color: var(--text-tertiary);
  animation: blink 1s step-end infinite;
  font-size: 15px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

#### 验证

1. 打开页面，确认欢迎语逐字显示，带闪烁光标
2. 确认场景按钮前显示 emoji 图标
3. 打字完成后光标消失

---

## 完整改动文件清单

| 文件 | 改动类型 | 任务 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 1 |
| `src/stores/exam.ts` | 重写 | 1 |
| `src/components/ThinkingBubble.vue` | **新增** | 2, 9 |
| `src/components/FlowProgress.vue` | **新增** | 3 |
| `src/components/SummaryCard.vue` | **新增** | 5 |
| `src/components/VersionPanel.vue` | **新增** | 8 |
| `src/components/DiffViewer.vue` | **新增** | 8 |
| `src/views/AIExam.vue` | 修改 | 4, 5, 6, 8, 9, 10, 11, 12, 13, 14 |
| `src/components/ReasoningSteps.vue` | 废弃 | — |

---

## 执行顺序依赖

```
任务 1 (类型+Store) → 任务 2 (ThinkingBubble) → 任务 4 (集成+过渡动画)
                                                          ↓
任务 3 (FlowProgress) ─────────────────────────────────→ 任务 4
                                                          ↓
任务 5 (SummaryCard) ──────────────────────────────────→ 任务 4
                                                          ↓
任务 6 (拖拽排序) ─────────────────────────────────────→ 独立
                                                          ↓
任务 7 (版本数据层) → 任务 8 (版本UI)
                                                          ↓
任务 9 (取消按钮) ─────────────────────────────────────→ 独立（依赖任务 2）
                                                          ↓
任务 10 (分值调整) ────────────────────────────────────→ 独立
                                                          ↓
任务 11 (批量操作) ────────────────────────────────────→ 独立
                                                          ↓
任务 12 (全局撤销+缩放) ──────────────────────────────→ 独立
                                                          ↓
任务 13 (参数栏优化) ─────────────────────────────────→ 独立
                                                          ↓
任务 14 (对话区优化) ─────────────────────────────────→ 独立
```

**建议执行顺序**: 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

（任务 5 在任务 4 之前完成，这样任务 4 集成时 SummaryCard 已就绪。）
