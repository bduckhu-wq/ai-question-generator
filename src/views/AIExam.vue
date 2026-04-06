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
        <!-- 初始化状态：极简界面 -->
        <template v-if="step === 'init'">
          <div class="init-container">
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
        </template>

        <!-- 对话流程 -->
        <template v-else>
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
              <!-- 确认卡片：预设参数一览，可微调后直接生成 -->
              <div v-if="msg.type === 'confirm-card'" class="message-content confirm-card">
                <div class="confirm-text">{{ msg.content }}</div>
                <div class="confirm-grid">
                  <div class="confirm-field">
                    <span class="confirm-label">学科</span>
                    <el-select v-model="examStore.condition.subject" size="small" style="width: 100%">
                      <el-option v-for="(label, key) in SUBJECT_LABELS" :key="key" :label="label" :value="key" />
                    </el-select>
                  </div>
                  <div class="confirm-field">
                    <span class="confirm-label">年级</span>
                    <el-select v-model="examStore.condition.grade" size="small" style="width: 100%">
                      <el-option v-for="(label, key) in GRADE_LABELS" :key="key" :label="label" :value="key" />
                    </el-select>
                  </div>
                  <div class="confirm-field confirm-field--full">
                    <span class="confirm-label">题型</span>
                    <el-select v-model="examStore.condition.questionTypes" size="small" multiple style="width: 100%">
                      <el-option v-for="(label, key) in LABELS" :key="key" :label="label" :value="key" />
                    </el-select>
                  </div>
                  <div class="confirm-field confirm-field--full">
                    <span class="confirm-label">难度分配</span>
                    <div class="difficulty-sliders">
                      <div v-for="key in (['easy', 'medium', 'hard'] as const)" :key="key" class="difficulty-slider-row">
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
                  <div class="confirm-field">
                    <span class="confirm-label">题目数量</span>
                    <el-input-number v-model="examStore.condition.count" :min="1" :max="50" size="small" style="width: 100%" />
                  </div>
                  <div class="confirm-field">
                    <span class="confirm-label">知识点</span>
                    <el-input v-model="knowledgePointText" size="small" placeholder="可选" style="width: 100%" />
                  </div>
                </div>
                <!-- 参考素材上传区 -->
                <div class="reference-section">
                  <div class="reference-label">📎 参考素材（可选）</div>
                  <div class="reference-hint">上传参考试卷或教学素材，AI 将基于素材内容出题</div>
                  <el-upload
                    class="reference-upload"
                    action="#"
                    :auto-upload="false"
                    :on-change="handleReferenceFile"
                    :show-file-list="false"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    multiple
                  >
                    <div class="reference-upload-trigger">
                      <span class="reference-upload-icon">+</span>
                      <span>拖拽或点击上传</span>
                    </div>
                  </el-upload>
                  <div v-if="referenceFiles.length" class="reference-file-list">
                    <div v-for="file in referenceFiles" :key="file.id" class="reference-file-item">
                      <span class="reference-file-icon">{{ getFileIcon(file.name) }}</span>
                      <span class="reference-file-name" :title="file.name">{{ file.name }}</span>
                      <span class="reference-file-size">{{ formatFileSize(file.size) }}</span>
                      <span class="reference-file-remove" @click="removeReferenceFile(file.id)">✕</span>
                    </div>
                  </div>
                </div>
                <div class="confirm-actions">
                  <el-button size="small" type="primary" @click="startGenerate" :loading="examStore.isGenerating">
                    生成试卷
                  </el-button>
                </div>
              </div>
              <!-- 推理步骤 -->
              <div v-if="msg.type === 'reasoning'" class="message-content reasoning-card">
                <ReasoningSteps
                  :title="msg.content"
                  :steps="examStore.reasoningSteps"
                  :is-running="examStore.isGenerating"
                  :is-completed="step === 'done'"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 输入框 -->
      <div class="chat-input">
        <div class="chat-input-wrapper">
          <el-input
            v-model="inputText"
            type="textarea"
            :placeholder="inputPlaceholder"
            @keydown.enter.exact.prevent="handleSend"
            :disabled="examStore.isGenerating || step === 'generating'"
            :autosize="{ minRows: 2, maxRows: 6 }"
            resize="none"
          />
          <el-button
            class="chat-send-btn"
            type="primary"
            @click="handleSend"
            :disabled="examStore.isGenerating || !inputText.trim()"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>

    <!-- 卷面预览区 -->
    <transition name="slide-right">
      <div v-if="examStore.showPreview && examStore.currentPaper" class="preview-area">
        <div class="preview-header">
          <span class="preview-title">卷面预览</span>
          <div class="preview-actions">
            <el-button size="small" @click="handleExportWord">导出 Word</el-button>
            <el-button size="small" @click="handlePrint">打印</el-button>
          </div>
        </div>
        <div class="preview-content" ref="previewRef">
          <div class="a4-paper">
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
            <div v-for="(group, gIdx) in questionGroups" :key="gIdx" class="question-group">
              <div class="group-title">{{ group.title }}（每题 {{ group.questions[0]?.score || 5 }} 分，共 {{ group.questions.length * (group.questions[0]?.score || 5) }} 分）</div>
              <div
                v-for="(q, qIdx) in group.questions"
                :key="q.id"
                class="question-item"
                :class="{ editing: editingId === q.id }"
                @click="editingId = q.id"
              >
                <div class="question-header">
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
      </div>

      <template #footer>
        <el-button size="small" @click="actionDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmCustomAction" :disabled="!actionCustomText.trim()">
          确认更换
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useExamStore } from '../stores/exam'
import { LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS, GRADE_LABELS } from '../types'
import type { Question, QuestionType, Difficulty, ReferenceFile } from '../types'
import ReasoningSteps from '../components/ReasoningSteps.vue'

const examStore = useExamStore()
const inputText = ref('')
const messagesRef = ref<HTMLElement>()
const previewRef = ref<HTMLElement>()
const editingId = ref<string | null>(null)
const editContent = ref('')

// ========== 题目操作弹窗 ==========
const actionDialogVisible = ref(false)
const actionQuestion = ref<Question | null>(null)
const actionCustomText = ref('')

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
  actionDialogVisible.value = true
}

function quickAction(type: 'difficulty' | 'questionType' | 'delete') {
  if (!actionQuestion.value) return
  if (type === 'delete') {
    examStore.removeQuestion(actionQuestion.value.id)
    actionDialogVisible.value = false
    return
  }
  examStore.adaptQuestion(actionQuestion.value.id, type)
  // 刷新引用
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) actionQuestion.value = updated
}

function confirmCustomAction() {
  if (!actionQuestion.value || !actionCustomText.value.trim()) return
  // 原型演示：用自定义文本模拟替换
  examStore.replaceQuestion(actionQuestion.value.id)
  actionDialogVisible.value = false
}

// 对话步骤：init → confirm → generating → done
const step = ref<'init' | 'confirm' | 'generating' | 'done'>('init')
const messages = ref<any[]>([])

// 场景预设参数
const quickScenes = [
  { key: 'homework', label: '课后练习', defaults: { scene: 'homework' as const, difficultyRatio: { easy: 40, medium: 50, hard: 10 }, count: 15, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } },
  { key: 'unitTest', label: '单元测验', defaults: { scene: 'unitTest' as const, difficultyRatio: { easy: 30, medium: 50, hard: 20 }, count: 20, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
  { key: 'midterm', label: '期中复习', defaults: { scene: 'midterm' as const, difficultyRatio: { easy: 30, medium: 40, hard: 30 }, count: 25, questionTypes: ['choice', 'fillBlank', 'shortAnswer'] as QuestionType[] } },
  { key: 'special', label: '专项训练', defaults: { scene: 'special' as const, difficultyRatio: { easy: 20, medium: 50, hard: 30 }, count: 12, questionTypes: ['choice', 'fillBlank'] as QuestionType[] } }
]

const inputPlaceholder = computed(() => {
  if (step.value === 'init') return '例如：高一数学函数单元测试，15 道选择题'
  return '补充说明（可选）'
})

const knowledgePointText = computed({
  get: () => examStore.condition.knowledgePoints?.join('、') || '',
  set: (val: string) => {
    examStore.condition.knowledgePoints = val ? val.split(/[、,，]/).map(s => s.trim()).filter(Boolean) : []
  }
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

// 选择快捷场景 → 预填参数，展示确认卡片
function selectScene(scene: typeof quickScenes[0]) {
  step.value = 'confirm'
  const d = scene.defaults
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) {
    examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  }
  examStore.condition.count = d.count
  examStore.condition.questionTypes = [...d.questionTypes]
  addMsg('user', scene.label)
  addMsg('assistant', `已为您预设${scene.label}参数，请确认或调整：`, 'confirm-card')
}

// 开始生成
async function startGenerate() {
  step.value = 'generating'
  examStore.isGenerating = true

  addMsg('assistant', '出题推理过程', 'reasoning')

  await examStore.generateExam()

  step.value = 'done'
  examStore.isGenerating = false
  scrollToBottom()
}

// 自然语言输入
async function handleSend() {
  if (!inputText.value.trim() || examStore.isGenerating) return
  const text = inputText.value.trim()
  inputText.value = ''

  if (step.value === 'init') {
    // 用户直接输入完整需求 → 一步生成
    addMsg('user', text)
    addMsg('assistant', `好的，正在为您生成：\n"${text}"`)
    // 简单解析（原型演示）
    await new Promise(r => setTimeout(r, 300))
    startGenerate()
  } else {
    addMsg('user', text)
    await new Promise(r => setTimeout(r, 300))
    addMsg('assistant', '已记录，继续为您生成试卷。')
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
</script>

<style scoped>
.ai-exam-page {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* ========== 对话区 ========== */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--border-primary);
}

.chat-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.chat-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-secondary);
}

.chat-input {
  padding: 12px 20px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.chat-input-wrapper {
  position: relative;
}

.chat-input-wrapper :deep(.el-textarea__inner) {
  padding-right: 70px;
}

.chat-send-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
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
  margin-bottom: 16px;
  gap: 8px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #111;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.message.user .message-avatar {
  background: #555;
}

.message-body {
  max-width: 80%;
}

.message-content {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
}

.message.user .message-content {
  background: #111;
  color: #fff;
  border-color: #111;
}

/* ========== 确认卡片（嵌入对话） ========== */
.confirm-card {
  padding: 14px 16px;
}

.confirm-text {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-primary);
}

.confirm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.confirm-field {
  display: flex;
  flex-direction: column;
}

.confirm-field--full {
  grid-column: 1 / -1;
}

/* ========== 难度比例滑块 ========== */
.difficulty-sliders {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.difficulty-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.difficulty-name {
  font-size: 12px;
  color: var(--text-secondary);
  width: 32px;
  flex-shrink: 0;
}

.difficulty-slider-row :deep(.el-slider) {
  flex: 1;
}

.difficulty-slider-row :deep(.el-slider__runway) {
  height: 4px;
}

.difficulty-slider-row :deep(.el-slider__bar) {
  height: 4px;
}

.difficulty-slider-row :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
}

.difficulty-value {
  font-size: 12px;
  color: var(--text-secondary);
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

.confirm-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.confirm-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

/* ========== 参考素材上传区 ========== */
.reference-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-primary);
}

.reference-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.reference-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.reference-upload :deep(.el-upload) {
  width: 100%;
}

.reference-upload-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px dashed var(--border-primary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reference-upload-trigger:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.reference-upload-icon {
  font-size: 16px;
  font-weight: 300;
  line-height: 1;
}

.reference-file-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reference-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 12px;
}

.reference-file-icon {
  flex-shrink: 0;
}

.reference-file-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-file-size {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.reference-file-remove {
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0 2px;
  transition: color var(--transition-fast);
}

.reference-file-remove:hover {
  color: var(--color-danger, #e53e3e);
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
</style>
