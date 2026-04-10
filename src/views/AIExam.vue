<template>
  <div class="ai-exam-page">
    <!-- 对话区 -->
    <div class="chat-area">
      <div class="chat-header">
        <span class="chat-title">AI 组卷</span>
        <el-button v-if="examStore.showPreview" text size="small" @click="examStore.reset()">
          重新出题
        </el-button>
      </div>

      <div class="chat-messages" ref="messagesRef">
        <!-- 初始化状态 -->
        <transition name="fade-out">
          <div v-if="step === 'init'" class="init-container">
            <div class="init-greeting">{{ greetingText }}<span v-if="!greetingDone" class="typing-cursor">▌</span></div>
            <div class="quick-scenes">
              <button
                v-for="scene in quickScenes"
                :key="scene.key"
                class="scene-chip"
                @click="selectScene(scene)"
              >{{ scene.icon }} {{ scene.label }}</button>
            </div>
          </div>
        </transition>

        <!-- 对话流程 -->
        <template v-if="step !== 'init'">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message"
            :class="msg.role"
          >
            <div v-if="msg.role === 'assistant'" class="message-avatar">AI</div>
            <div class="message-body">
              <div v-if="msg.type === 'text'" class="message-content" v-html="formatMessage(msg.content)"></div>
              <div v-if="msg.type === 'thinking'" class="message-content thinking-card">
                <ThinkingBubble
                  :thinking-text="examStore.thinkingText"
                  :is-thinking="examStore.isThinking"
                  :is-thinking-completed="examStore.isThinkingCompleted"
                  :is-thinking-cancelled="examStore.isThinkingCancelled"
                  :thinking-duration="examStore.thinkingDuration"
                  @cancel="handleCancelGenerate"
                />
              </div>
              <div v-if="msg.type === 'summary-card' && examStore.examSummary" class="message-content summary-card-wrapper">
                <SummaryCard :summary="examStore.examSummary" @view-paper="handleViewPaper" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 输入框（始终显示，一体化设计） -->
      <div class="chat-input-wrapper">
        <div class="unified-input-box">
          <!-- 参数配置区（选择场景后展开） -->
          <transition name="params-expand">
            <div v-if="showParamsPanel" class="input-params-section">
              <div class="params-structured">
                <!-- 第一行：学科 / 年级 / 章节 -->
                <div class="params-row">
                  <div class="param-chip">
                    <span class="param-chip-label">学科</span>
                    <el-select v-model="examStore.condition.subject" size="small" placeholder="选择">
                      <el-option v-for="(label, key) in SUBJECT_LABELS" :key="key" :label="label" :value="key" />
                    </el-select>
                  </div>
                  <div class="param-chip">
                    <span class="param-chip-label">年级</span>
                    <el-select v-model="examStore.condition.grade" size="small" placeholder="选择">
                      <el-option v-for="(label, key) in GRADE_LABELS" :key="key" :label="label" :value="key" />
                    </el-select>
                  </div>
                  <div class="param-chip">
                    <span class="param-chip-label">章节</span>
                    <el-select v-model="selectedChapter" size="small" placeholder="选择" :disabled="!chapterOptions.length">
                      <el-option v-for="ch in chapterOptions" :key="ch" :label="ch" :value="ch" />
                    </el-select>
                  </div>
                </div>
                <!-- 第二行：题型 -->
                <div class="params-row">
                  <div class="param-chip param-chip--full">
                    <span class="param-chip-label">题型</span>
                    <div class="question-type-tags">
                      <span
                        v-for="(label, key) in LABELS"
                        :key="key"
                        class="type-tag"
                        :class="{ 'type-tag--active': (examStore.condition.questionTypes || []).includes(key as any) }"
                        @click="toggleQuestionType(key as any)"
                      >{{ label }}</span>
                    </div>
                  </div>
                </div>
                <!-- 第三行：难度分配 + 数量 -->
                <div class="params-row params-row--compact">
                  <div class="param-chip param-chip--grow">
                    <span class="param-chip-label">难度分配</span>
                    <div class="difficulty-inline">
                      <div v-for="key in (['easy', 'medium', 'hard'] as const)" :key="key" class="difficulty-inline-item">
                        <span class="difficulty-name">{{ DIFFICULTY_LABELS[key] }}</span>
                        <el-slider
                          :model-value="examStore.condition.difficultyRatio?.[key] ?? 33"
                          :min="0" :max="100" :step="5"
                          @input="(val: number) => updateDifficultyRatio(key, val)"
                          :show-tooltip="false"
                          size="small"
                        />
                        <span class="difficulty-value">{{ examStore.condition.difficultyRatio?.[key] ?? 33 }}%</span>
                      </div>
                    </div>
                  </div>
                  <div class="param-chip param-chip--count">
                    <span class="param-chip-label">数量</span>
                    <el-input-number v-model="examStore.condition.count" :min="1" :max="50" size="small" controls-position="right" />
                  </div>
                </div>
              </div>
              <div class="params-divider"></div>
              <div class="params-lang-section">
                <span class="param-chip-label">补充说明<span class="lang-optional">（可选）</span></span>
                <el-input
                  v-model="customRequirement"
                  type="textarea"
                  :rows="2"
                  placeholder="输入额外的出题要求，如：题目要贴近生活实际、侧重应用而非纯计算..."
                  resize="none"
                  size="small"
                />
              </div>
            </div>
          </transition>

          <!-- 文本输入区 -->
          <div v-if="!showParamsPanel" class="input-text-section">
            <el-input
              v-model="inputText"
              type="textarea"
              :placeholder="inputPlaceholder"
              @keydown.enter.exact.prevent="handleSend"
              :disabled="examStore.isGenerating || step === 'generating'"
              :autosize="{ minRows: 1, maxRows: 4 }"
              resize="none"
            />
          </div>

          <!-- 底部工具栏 -->
          <div class="input-toolbar">
            <div class="input-toolbar-left">
            </div>
            <div class="input-toolbar-right">
              <el-button v-if="showParamsPanel" size="small" @click="showParamsPanel = false">取消</el-button>
              <el-button
                v-if="showParamsPanel"
                class="chat-send-btn"
                type="primary"
                @click="confirmParams"
                :loading="examStore.isGenerating"
              >生成试卷</el-button>
              <el-button
                v-else
                class="chat-send-btn"
                type="primary"
                @click="handleSend"
                :disabled="examStore.isGenerating || (!inputText.trim() && step === 'init')"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 卷面预览区 -->
    <transition name="slide-right">
      <div v-if="examStore.showPreview && examStore.currentPaper" class="preview-area">
        <div class="preview-header">
          <span class="preview-title">卷面预览</span>
          <div class="preview-actions">
            <div class="zoom-controls">
              <button v-for="z in [100, 125, 150]" :key="z" class="zoom-btn" :class="{ active: previewZoom === z }" @click="previewZoom = z">{{ z }}%</button>
            </div>
            <button class="answer-toggle" :class="{ active: showAnswers }" @click="showAnswers = !showAnswers">{{ showAnswers ? '隐藏答案' : '显示答案' }}</button>
            <el-button size="small" @click="handleExportWord">导出 Word</el-button>
            <el-button size="small" @click="handlePrint">打印</el-button>
          </div>
        </div>
        <!-- 批量操作工具栏 -->
        <div v-if="step === 'done'" class="batch-toolbar">
          <label class="batch-select-all">
            <input type="checkbox" :checked="batchMode && selectedQuestionIds.size === allQuestionIds.length" @change="toggleBatchMode" />
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
        <div class="preview-content" ref="previewRef">
          <div class="a4-paper" :style="{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }">
            <div class="paper-header">
              <div class="paper-title">{{ examStore.currentPaper.title }}</div>
              <div class="paper-info">
                <span>姓名：__________</span>
                <span>班级：__________</span>
                <span>得分：__________</span>
              </div>
              <div class="paper-meta">
                考试时间：{{ examStore.currentPaper.duration }}分钟 &nbsp; 满分：{{ examStore.currentPaper.totalScore }}分
              </div>
            </div>
            <div v-for="(group, gIdx) in questionGroups" :key="gIdx" class="question-group-wrapper">
              <div class="group-title">{{ group.title }}（每题 {{ group.questions[0]?.score || 5 }} 分，共 {{ group.questions.length * (group.questions[0]?.score || 5) }} 分）</div>
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
                    <input v-if="batchMode" type="checkbox" :checked="selectedQuestionIds.has(q.id)" @change="toggleQuestionSelect(q.id)" class="batch-checkbox" @click.stop />
                    <div class="question-header">
                      <span class="drag-handle" title="拖拽排序">⋮⋮</span>
                      <span class="question-number">{{ getQuestionNumber(q, gIdx, qIdx) }}.</span>
                      <span class="question-source">{{ q.source === 'bank' ? '题库' : 'AI生成' }}</span>
                      <div class="question-actions" @click.stop>
                        <el-button text size="small" @click="openQuestionAction(q)">操作 ▾</el-button>
                      </div>
                    </div>
                    <div class="question-content" v-html="formatQuestion(q)"></div>
                <div v-if="showAnswers" class="question-answer">
                  <div class="answer-label">答案</div>
                  <div>{{ q.answer }}</div>
                  <div v-if="q.analysis" class="answer-analysis">解析：{{ q.analysis }}</div>
                </div>
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
          </div>
        </div>
      </div>
    </transition>

    <!-- 题目操作弹窗 -->
    <el-dialog
      v-model="actionDialogVisible"
      title="题目操作"
      width="480px"
      :close-on-click-modal="false"
      class="question-action-dialog"
      append-to-body
    >
      <div v-if="actionQuestion" class="action-panel">
        <!-- 当前题目预览 -->
        <div class="action-current">
          <div class="action-current-label">当前题目</div>
          <div class="action-current-content">
            {{ actionQuestion.content }}
            <span v-if="actionQuestion.options?.length" style="margin-left:16px;color:var(--text-secondary)">
              {{ actionQuestion.options.map(o => `${o.label}. ${o.content}`).join('  ') }}
            </span>
          </div>
          <div class="action-current-meta">
            <el-tag size="small">{{ LABELS[actionQuestion.type] }}</el-tag>
            <el-tag size="small">{{ DIFFICULTY_LABELS[actionQuestion.difficulty] }}</el-tag>
          </div>
        </div>

        <!-- 快捷调整 -->
        <div class="action-section">
          <div class="action-section-title">快捷调整</div>
          <div class="action-quick-btns">
            <button class="quick-btn" @click="quickAction('difficulty')">
              <span class="quick-btn-icon">📊</span>
              <span class="quick-btn-label">换难度</span>
              <span class="quick-btn-desc">{{ DIFFICULTY_LABELS[actionQuestion.difficulty] }} → {{ nextDifficulty }}</span>
            </button>
            <button class="quick-btn" @click="quickAction('questionType')">
              <span class="quick-btn-icon">📝</span>
              <span class="quick-btn-label">换题型</span>
              <span class="quick-btn-desc">{{ LABELS[actionQuestion.type] }} → {{ nextQuestionType }}</span>
            </button>
            <button class="quick-btn quick-btn--danger" @click="quickAction('delete')">
              <span class="quick-btn-icon">🗑️</span>
              <span class="quick-btn-label">删除此题</span>
              <span class="quick-btn-desc">从试卷中移除</span>
            </button>
          </div>
        </div>

        <!-- 自定义需求 -->
        <div class="action-section">
          <div class="action-divider">
            <span>或自定义需求</span>
          </div>
          <el-input
            v-model="actionCustomText"
            type="textarea"
            :rows="3"
            placeholder="请输入您的修改要求，例如：&#10;· 换成更简单的题目&#10;· 改成关于三角函数的选择题&#10;· 这道题太难了，换一道类似的"
            size="small"
          />
          <div class="action-tips">
            💡 直接用文字描述您想要什么样的题目，AI 会为您智能更换
          </div>
        </div>

        <!-- 分值调整 -->
        <div class="action-section">
          <div class="action-section-title">分值调整</div>
          <div class="score-adjust">
            <el-input-number v-model="actionScore" :min="1" :max="20" :step="1" size="small" controls-position="right" />
            <el-button size="small" type="primary" :disabled="!actionQuestion || actionScore === actionQuestion.score" @click="handleUpdateScore">应用</el-button>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button size="small" @click="actionDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmCustomAction" :disabled="!actionCustomText.trim()">
          确认更换
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量操作确认弹窗 -->
    <el-dialog v-model="batchActionDialogVisible" :title="batchActionType === 'delete' ? '批量删除' : batchActionType === 'adapt' ? '批量改编' : '批量调整分值'" width="360px" append-to-body>
      <div v-if="batchActionType === 'delete'"><p>确定要删除选中的 <strong>{{ selectedQuestionIds.size }}</strong> 道题目吗？此操作不可撤销。</p></div>
      <div v-else-if="batchActionType === 'adapt'"><p>将对选中的 <strong>{{ selectedQuestionIds.size }}</strong> 道题目执行难度轮换。</p></div>
      <div v-else-if="batchActionType === 'score'">
        <p>将选中的 <strong>{{ selectedQuestionIds.size }}</strong> 道题目的分值统一设置为：</p>
        <el-input-number v-model="batchScore" :min="1" :max="20" size="small" style="margin-top: 8px;" />
      </div>
      <template #footer>
        <el-button size="small" @click="batchActionDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmBatchAction">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useExamStore } from '../stores/exam'
import { LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS, GRADE_LABELS, CHAPTER_OPTIONS } from '../types'
import type { Question, QuestionType, Difficulty, ReferenceFile } from '../types'
import ThinkingBubble from '../components/ThinkingBubble.vue'
import SummaryCard from '../components/SummaryCard.vue'
import draggable from 'vuedraggable'

const examStore = useExamStore()
const inputText = ref('')
const messagesRef = ref<HTMLElement>()
const previewRef = ref<HTMLElement>()
const editingId = ref<string | null>(null)
const editContent = ref('')
const showMoreParams = ref(false)
const selectedChapter = ref('')
const showParamsPanel = ref(false)
const customRequirement = ref('')
const previewZoom = ref(100)
const showAnswers = ref(false)

// ========== 批量操作 ==========
const selectedQuestionIds = ref<Set<string>>(new Set())
const batchMode = ref(false)
const batchActionDialogVisible = ref(false)
const batchActionType = ref<'delete' | 'adapt' | 'score'>('delete')
const batchScore = ref(5)

// ========== 参数配置栏优化 ==========
const originalDefaults = ref<Record<string, any> | null>(null)

// ========== 对话区细节优化 ==========
const greetingText = ref('')
const fullGreeting = '请描述您的出题需求，或选择一个快捷场景。'
const greetingDone = ref(false)

// ========== 题目操作弹窗 ==========
const actionDialogVisible = ref(false)
const actionQuestion = ref<Question | null>(null)
const actionCustomText = ref('')
const actionScore = ref(5)

const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard']
const questionTypeOrder: QuestionType[] = ['choice', 'fillBlank', 'shortAnswer', 'judgment']

const nextDifficulty = computed(() => {
  if (!actionQuestion.value) return ''
  const idx = difficultyOrder.indexOf(actionQuestion.value.difficulty)
  return DIFFICULTY_LABELS[difficultyOrder[(idx + 1) % 3]]
})

const nextQuestionType = computed(() => {
  if (!actionQuestion.value) return ''
  const idx = questionTypeOrder.indexOf(actionQuestion.value.type)
  return LABELS[questionTypeOrder[(idx + 1) % 4]]
})

function openQuestionAction(q: Question) {
  actionQuestion.value = q
  actionCustomText.value = ''
  actionScore.value = q.score
  actionDialogVisible.value = true
}

async function quickAction(type: 'difficulty' | 'questionType' | 'delete') {
  if (!actionQuestion.value) return
  if (type === 'delete') {
    examStore.removeQuestion(actionQuestion.value.id)
    actionDialogVisible.value = false
    return
  }
  await examStore.adaptQuestion(actionQuestion.value.id, type)
  // 刷新引用
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) actionQuestion.value = updated
  actionDialogVisible.value = false
}

async function confirmCustomAction() {
  if (!actionQuestion.value || !actionCustomText.value.trim()) return
  // 原型演示：用自定义文本模拟替换
  await examStore.replaceQuestion(actionQuestion.value.id)
  actionDialogVisible.value = false
}

function handleUpdateScore() {
  if (!actionQuestion.value) return
  examStore.updateQuestionScore(actionQuestion.value.id, actionScore.value)
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) { actionQuestion.value = updated; actionScore.value = updated.score }
}

// ========== 批量操作函数 ==========
const allQuestionIds = computed(() => examStore.currentPaper?.questions.map(q => q.id) || [])
function toggleBatchMode() {
  if (!batchMode.value) { batchMode.value = true; selectedQuestionIds.value = new Set() }
  else { if (selectedQuestionIds.value.size === allQuestionIds.value.length) selectedQuestionIds.value = new Set(); else selectedQuestionIds.value = new Set(allQuestionIds.value) }
}
function exitBatchMode() { batchMode.value = false; selectedQuestionIds.value = new Set() }
function toggleQuestionSelect(qId: string) {
  if (selectedQuestionIds.value.has(qId)) selectedQuestionIds.value.delete(qId)
  else selectedQuestionIds.value.add(qId)
  selectedQuestionIds.value = new Set(selectedQuestionIds.value)
}
function confirmBatchAction() {
  const ids = Array.from(selectedQuestionIds.value)
  if (ids.length === 0) return
  switch (batchActionType.value) {
    case 'delete': examStore.batchRemoveQuestions(ids); break
    case 'adapt': examStore.batchAdaptQuestions(ids, 'difficulty'); break
    case 'score': examStore.batchUpdateScore(ids, batchScore.value); break
  }
  batchActionDialogVisible.value = false; exitBatchMode()
}

// ========== 参数配置栏优化函数 ==========
const paramSummaryTags = computed(() => {
  const tags: string[] = []
  const c = examStore.condition
  const ratio = c.difficultyRatio
  if (ratio) tags.push(`难度 ${ratio.easy}:${ratio.medium}:${ratio.hard}`)
  tags.push(`${c.count || 15}题`)
  if (c.questionTypes?.length) tags.push(c.questionTypes.map(t => LABELS[t] || t).join('+'))
  return tags
})
function resetParamsToDefault() {
  if (!originalDefaults.value) return
  const d = originalDefaults.value
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  examStore.condition.count = d.count
  if (d.questionTypes) examStore.condition.questionTypes = [...d.questionTypes]
}

// 对话步骤：init → confirm → generating → done
const step = ref<'init' | 'confirm' | 'generating' | 'done'>('init')
const messages = ref<any[]>([])

// 场景预设参数
const quickScenes = [
  { key: 'homework', label: '课后练习', icon: '📖', defaults: { scene: 'homework' as const, difficultyRatio: { easy: 40, medium: 50, hard: 10 }, count: 15, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } },
  { key: 'unitTest', label: '单元测验', icon: '📋', defaults: { scene: 'unitTest' as const, difficultyRatio: { easy: 30, medium: 50, hard: 20 }, count: 20, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
  { key: 'midterm', label: '期中复习', icon: '📊', defaults: { scene: 'midterm' as const, difficultyRatio: { easy: 30, medium: 40, hard: 30 }, count: 25, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
  { key: 'special', label: '专项训练', icon: '🎯', defaults: { scene: 'special' as const, difficultyRatio: { easy: 20, medium: 50, hard: 30 }, count: 12, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } }
]

const inputPlaceholder = computed(() => {
  if (step.value === 'init') return '描述您的出题需求，或直接点击发送...'
  return '补充说明（可选）'
})

// 章节选项：根据学科+年级动态加载
const chapterOptions = computed(() => {
  const subject = examStore.condition.subject
  const grade = examStore.condition.grade
  if (!subject || !grade) return []
  const key = `${subject}-${grade}`
  return CHAPTER_OPTIONS[key] || []
})

// 章节变化时同步到 knowledgePoints
watch(selectedChapter, (val) => {
  examStore.condition.knowledgePoints = val ? [val] : []
})

// 学科或年级变化时重置章节
watch([() => examStore.condition.subject, () => examStore.condition.grade], () => {
  selectedChapter.value = ''
})

// 调整难度比例：拖动一个滑块时，按比例缩放另外两个
function updateDifficultyRatio(changed: Difficulty, newVal: number) {
  if (!examStore.condition.difficultyRatio) {
    examStore.condition.difficultyRatio = { easy: 30, medium: 50, hard: 20 }
  }
  const ratio = examStore.condition.difficultyRatio
  const oldVal = ratio[changed]
  const diff = newVal - oldVal
  const others = (['easy', 'medium', 'hard'] as const).filter(k => k !== changed)
  const othersSum = others.reduce((s, k) => s + ratio[k], 0)

  ratio[changed] = newVal
  if (othersSum > 0) {
    const remaining = 100 - newVal
    others.forEach(k => {
      ratio[k] = Math.round(remaining * (ratio[k] / othersSum))
    })
  } else {
    // 兜底：均分剩余
    const share = Math.floor((100 - newVal) / others.length)
    others.forEach(k => { ratio[k] = share })
  }
  // 修正舍入误差
  const total = ratio.easy + ratio.medium + ratio.hard
  if (total !== 100) {
    const last = others[others.length - 1]
    ratio[last] += 100 - total
  }
}

// ========== 参考素材管理 ==========
const referenceFiles = ref<ReferenceFile[]>([])

function handleReferenceFile(uploadFile: any) {
  const rawFile = uploadFile.raw || uploadFile
  if (!rawFile) return
  referenceFiles.value.push({
    id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: rawFile.name,
    size: rawFile.size,
    type: rawFile.type,
    file: rawFile
  })
}

function removeReferenceFile(fileId: string) {
  referenceFiles.value = referenceFiles.value.filter(f => f.id !== fileId)
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext || '')) return '📝'
  if (['png', 'jpg', 'jpeg'].includes(ext || '')) return '🖼️'
  return '📎'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 按题型分组
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

function getQuestionNumber(q: Question, groupIdx: number, qIdx: number) {
  let num = 0
  for (let i = 0; i < groupIdx; i++) num += questionGroups.value[i].questions.length
  return num + qIdx + 1
}

function formatMessage(content: string) {
  return content.replace(/\n/g, '<br>')
}

function formatQuestion(q: Question) {
  let html = q.content
  if (q.options?.length) {
    html += '<br><span style="margin-left:20px">'
    html += q.options.map(o => `${o.label}. ${o.content}`).join('&nbsp;&nbsp;')
    html += '</span>'
  }
  return html
}

function addMsg(role: 'user' | 'assistant', content: string, type = 'text') {
  messages.value.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    role, content, type
  })
  scrollToBottom()
}

// 选择快捷场景 → 预填参数，打开参数配置面板
function selectScene(scene: typeof quickScenes[0]) {
  step.value = 'confirm'
  const d = scene.defaults
  originalDefaults.value = { scene: d.scene, difficultyRatio: d.difficultyRatio ? { ...d.difficultyRatio } : undefined, count: d.count, questionTypes: [...d.questionTypes] }
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  examStore.condition.count = d.count
  examStore.condition.questionTypes = [...d.questionTypes]
  addMsg('user', `我选择了「${scene.label}」`)
  addMsg('assistant', `已为您预设${scene.label}参数，您可以在下方调整后点击发送。`)
  showParamsPanel.value = true
  scrollToBottom()
}

// 确认参数 → 关闭面板，开始生成
function confirmParams() {
  showParamsPanel.value = false
  // 如果有自然语言补充说明，添加为用户消息
  if (customRequirement.value.trim()) {
    addMsg('user', customRequirement.value.trim())
    customRequirement.value = ''
  }
  startGenerate()
}

// 切换题型 tag
function toggleQuestionType(type: QuestionType) {
  const types = examStore.condition.questionTypes || []
  const idx = types.indexOf(type)
  if (idx >= 0) {
    types.splice(idx, 1)
  } else {
    types.push(type)
  }
  examStore.condition.questionTypes = types
}

// 开始生成
async function startGenerate() {
  step.value = 'generating'
  examStore.isGenerating = true
  addMsg('assistant', 'AI 正在思考...', 'thinking')
  await examStore.generateExam()
  if (examStore.isThinkingCancelled) {
    addMsg('assistant', '已取消生成。是否保留当前结果？')
    step.value = 'confirm'
    scrollToBottom()
    return
  }
  step.value = 'done'
  examStore.isGenerating = false
  if (examStore.examSummary) addMsg('assistant', '', 'summary-card')
  scrollToBottom()
}

function handleCancelGenerate() { examStore.cancelGenerate() }
function handleViewPaper() { examStore.showPreview = true }

// 自然语言输入
async function handleSend() {
  if (examStore.isGenerating) return
  if (step.value === 'init' && !inputText.value.trim()) return

  const text = inputText.value.trim()
  inputText.value = ''

  if (step.value === 'init') {
    // 用户直接输入完整需求 → 一步生成
    addMsg('user', text)
    addMsg('assistant', `好的，正在为您生成：\n"${text}"`)
    await new Promise(r => setTimeout(r, 300))
    startGenerate()
  } else {
    // 用户在参数配置状态下点击发送 → 基于当前参数生成
    addMsg('user', text || '请基于当前配置生成试卷')
    await new Promise(r => setTimeout(r, 300))
    addMsg('assistant', '好的，正在为您生成试卷...')
    startGenerate()
  }
}

function saveEdit(q: Question) {
  q.content = editContent.value
  editingId.value = null
}

watch(editingId, (val) => {
  if (val) {
    const q = examStore.currentPaper?.questions.find(q => q.id === val)
    if (q) editContent.value = q.content
  }
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function handleExportWord() {
  alert('导出 Word 功能（原型演示）')
}

function handlePrint() {
  window.print()
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (step.value !== 'done') return
    e.preventDefault()
    const result = examStore.undoLastAction()
    if (result.success) ElMessage.success(result.message)
    else ElMessage.info(result.message)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // 打字机效果
  let i = 0
  const typeTimer = setInterval(() => {
    if (i < fullGreeting.length) { greetingText.value += fullGreeting[i]; i++ }
    else { clearInterval(typeTimer); greetingDone.value = true }
  }, 40)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function onDragEnd() {
  if (!examStore.currentPaper) return
  const allQuestions: Question[] = []
  questionGroups.value.forEach(group => {
    allQuestions.push(...group.questions)
  })
  examStore.currentPaper.questions = allQuestions
}
</script>

<style scoped>
.ai-exam-page {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/* ========== 对话区 ========== */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  border-right: none;
  background: var(--bg-primary);
}

.chat-header {
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.chat-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-primary);
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

/* ========== 一体化输入框 ========== */
.chat-input-wrapper {
  flex-shrink: 0;
  padding: 0 24px 20px;
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.unified-input-box {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.unified-input-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.06), 0 2px 12px rgba(0, 0, 0, 0.06);
}

.input-params-section {
  padding: 14px 16px 0;
}

.input-text-section {
  padding: 0 16px;
}

.input-text-section :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  padding: 8px 0;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 8px;
}

/* 参数展开动画 */
.params-expand-enter-active {
  transition: all 0.25s ease-out;
  max-height: 500px;
  overflow: hidden;
}
.params-expand-leave-active {
  transition: all 0.2s ease-in;
  max-height: 500px;
  overflow: hidden;
}
.params-expand-enter-from,
.params-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* 参数摘要（内联在工具栏中） */
.param-summary-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.param-summary-tag { font-size: 11px; padding: 3px 10px; border-radius: 12px; background: var(--bg-tertiary); color: var(--text-secondary); font-weight: 400; white-space: nowrap; }
.param-reset-btn { font-size: 11px; color: var(--text-tertiary); background: none; border: none; cursor: pointer; padding: 2px 6px; text-decoration: underline; }
.param-reset-btn:hover { color: var(--accent); }

/* ========== 参数配置面板 ========== */
.params-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.params-panel-body {
  padding: 0;
  overflow-y: auto;
  max-height: 340px;
}

/* 结构化参数区 */
.params-structured {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.params-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.params-row--compact {
  align-items: center;
}

.param-chip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.param-chip--full {
  flex: none;
  width: 100%;
}

.param-chip--grow {
  flex: 1;
  min-width: 0;
}

.param-chip--count {
  flex-shrink: 0;
  padding-top: 14px;
}

.param-chip--count :deep(.el-input-number) {
  width: 90px;
}

.param-chip-label {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.param-chip :deep(.el-select) {
  width: 100%;
}

.param-chip :deep(.el-select .el-select__wrapper) {
  background: var(--bg-secondary);
  box-shadow: none;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  min-height: 30px;
}

.param-chip :deep(.el-select .el-select__placeholder) {
  font-size: 12px;
}

/* 题型 tag */
.question-type-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.type-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.type-tag--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.type-tag--active:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: #fff;
}

/* 分隔线 */
.params-divider {
  height: 1px;
  background: var(--border-secondary);
  margin: 10px 0;
}

/* 难度分配 - 紧凑横排 */
.difficulty-inline {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.difficulty-inline-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.difficulty-name {
  font-size: 11px;
  color: var(--text-tertiary);
  width: 28px;
  flex-shrink: 0;
}

.difficulty-inline-item :deep(.el-slider) {
  flex: 1;
}

.difficulty-inline-item :deep(.el-slider__runway) {
  height: 4px;
}

.difficulty-inline-item :deep(.el-slider__bar) {
  height: 4px;
}

.difficulty-inline-item :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
}

.difficulty-value {
  font-size: 11px;
  color: var(--text-tertiary);
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

/* 下方自然语言补充区 */
.params-lang-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lang-optional {
  font-weight: 400;
  color: var(--text-tertiary);
  font-size: 10px;
}

.params-lang-section :deep(.el-textarea__inner) {
  background: transparent;
  border: none;
  border-radius: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  padding: 6px 0;
}

.params-lang-section :deep(.el-textarea__inner:focus) {
  outline: none;
}

.params-lang-section :deep(.el-textarea__inner::placeholder) {
  color: var(--text-quaternary);
  font-size: 12px;
}

/* 底部工具栏 */
.input-toolbar-left {
  display: flex;
  align-items: center;
}

.input-toolbar-right {
  display: flex;
  align-items: center;
}

.chat-send-btn {
  min-width: 80px;
  height: 36px;
  border-radius: 10px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ========== 初始化界面 ========== */
.init-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.init-greeting {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  text-align: center;
  max-width: 360px;
  line-height: 1.6;
}

.quick-scenes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.scene-chip {
  padding: 8px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.scene-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ========== 消息样式 ========== */
.message {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.message.user .message-avatar {
  background: #8b5cf6;
}

.message-body {
  max-width: 75%;
}

.message-content {
  background: #fff;
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.message.user .message-content {
  background: #f3f0ff;
  color: var(--text-primary);
  border-color: transparent;
}

/* ========== 推理步骤卡片 ========== */
.reasoning-card {
  padding: 0;
  border: none;
  background: transparent;
}

.reasoning-card :deep(.reasoning-pipeline) {
  border-color: var(--border-primary);
  border-radius: 8px;
}

.reasoning-card :deep(.pipeline-badge.completed) {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-color: var(--border-primary);
}

.reasoning-card :deep(.pipeline-badge.running) {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-color: var(--border-primary);
}

.reasoning-card :deep(.node-icon.check-icon circle) {
  fill: #111;
}

.reasoning-card :deep(.step-connector.active) {
  background: #111;
}

.reasoning-card :deep(.step-title.running) {
  color: var(--text-primary);
}

.reasoning-card :deep(.step-detail) {
  background: var(--bg-secondary);
  border-color: var(--border-secondary);
}

.reasoning-card :deep(.detail-bullet) {
  color: var(--text-tertiary);
}

.reasoning-card :deep(.spinner-svg circle:last-child) {
  stroke: #111;
}

/* ========== 卷面预览区 ========== */
.preview-area {
  width: 50%;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.preview-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.preview-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-actions :deep(.el-button) {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

.preview-actions :deep(.el-button:hover) {
  background-color: var(--bg-hover);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.a4-paper {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 48px 56px;
  max-width: 700px;
  width: 100%;
  min-height: 600px;
  height: fit-content;
  font-size: 13px;
  line-height: 1.8;
}

.paper-header {
  text-align: center;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 2px solid #333;
}

.paper-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 2px;
  color: var(--text-primary);
}

.paper-info {
  display: flex;
  justify-content: center;
  gap: 32px;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.paper-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.question-group {
  margin-bottom: 24px;
}

.group-title {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #333;
  color: var(--text-primary);
}

.question-item {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px dashed transparent;
  cursor: pointer;
  transition: border-color var(--transition-fast);
  margin-bottom: 4px;
}

.question-item:hover {
  border-color: var(--border-primary);
  background: var(--bg-secondary);
}

.question-item.editing {
  border-color: var(--text-tertiary);
  background: var(--bg-secondary);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.question-number {
  font-weight: 700;
  color: var(--text-primary);
}

.question-source {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.question-actions {
  margin-left: auto;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.question-item:hover .question-actions {
  opacity: 1;
}

.question-content {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-primary);
}

.question-edit {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-primary);
}

.edit-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ========== 题目操作弹窗 ========== */
.action-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-current {
  background: var(--bg-tertiary);
  border-radius: 6px;
  padding: 12px;
}

.action-current-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.action-current-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
}

.action-current-meta {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}

.action-section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.action-quick-btns {
  display: flex;
  gap: 8px;
}

.quick-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-btn:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}

.quick-btn--danger:hover {
  border-color: var(--color-danger);
  background: #fff2f0;
}

.quick-btn-icon {
  font-size: 18px;
}

.quick-btn-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.quick-btn-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

.quick-btn--danger .quick-btn-desc {
  color: var(--text-tertiary);
}

.action-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.action-divider::before,
.action-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-primary);
}

.action-divider span {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.action-tips {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.score-adjust { display: flex; align-items: center; gap: 8px; }
.score-adjust :deep(.el-input-number) { width: 120px; }

.zoom-controls { display: flex; gap: 2px; margin-right: 8px; }
.zoom-btn { padding: 2px 8px; font-size: 11px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.zoom-btn:first-child { border-radius: 4px 0 0 4px; }
.zoom-btn:last-child { border-radius: 0 4px 4px 0; }
.zoom-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.answer-toggle { padding: 4px 10px; font-size: 12px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-secondary); cursor: pointer; border-radius: 4px; transition: all var(--transition-fast); margin-right: 8px; }
.answer-toggle.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.question-answer { margin-top: 8px; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 12px; color: var(--text-secondary); }
.answer-label { font-weight: 600; margin-bottom: 4px; color: var(--text-primary); }
.answer-analysis { margin-top: 4px; color: var(--text-tertiary); }

/* ========== 过渡动画 ========== */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  width: 0;
  min-width: 0;
  opacity: 0;
  padding: 0;
}

.thinking-card { padding: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; }
.summary-card-wrapper { padding: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; }

/* ========== 批量操作工具栏 ========== */
.batch-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border-primary); background: var(--bg-primary); flex-shrink: 0; }
.batch-select-all { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); cursor: pointer; user-select: none; }
.batch-select-all input[type="checkbox"] { accent-color: var(--accent); }
.batch-checkbox { margin-right: 6px; cursor: pointer; accent-color: var(--accent); }
.question-item.batch-selected { background: var(--bg-secondary); }

/* ========== 打字机光标 ========== */
.typing-cursor { display: inline-block; color: var(--text-tertiary); animation: blink 1s step-end infinite; font-size: 15px; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
/* ========== 响应式适配 ========== */
@media (max-width: 768px) {
  .chat-header,
  .chat-messages,
  .chat-input-wrapper {
    max-width: 100%;
    padding-left: 16px;
    padding-right: 16px;
  }

  .params-row {
    flex-wrap: wrap;
  }

  .param-chip {
    min-width: calc(50% - 4px);
  }

  .param-chip--count {
    padding-top: 0;
  }

  .params-row--compact {
    flex-wrap: wrap;
  }

  .param-chip--grow {
    min-width: 100%;
  }

  .difficulty-inline-item {
    gap: 6px;
  }

  .unified-input-box {
    border-radius: 12px;
  }

  .init-greeting {
    font-size: 14px;
  }

  .scene-chip {
    font-size: 13px;
    padding: 8px 16px;
  }

  .message-content {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .param-chip {
    min-width: 100%;
  }

  .param-chip--count {
    width: 100%;
  }

  .param-chip--count :deep(.el-input-number) {
    width: 100%;
  }

  .quick-scenes {
    flex-direction: column;
  }

  .scene-chip {
    width: 100%;
    text-align: center;
  }
}
</style>
