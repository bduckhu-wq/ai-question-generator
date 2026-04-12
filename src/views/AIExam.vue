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
            <QuickScenes :scenes="quickScenes" @select="selectScene" />
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
                  @cancel="handleCancelGenerate"
                />
              </div>
              <div v-if="msg.type === 'summary-card' && examStore.examSummary" class="message-content summary-card-wrapper">
                <SummaryCard :summary="examStore.examSummary" @view-paper="handleViewPaper" />
              </div>
              <!-- 追问卡片 -->
              <div v-if="msg.type === 'clarify' && msg.data" class="message-content clarify-wrapper">
                <ClarifyQuestion :clarify="msg.data" @confirm="handleClarifyConfirm" @custom-input="handleClarifyCustom" />
              </div>
            </div>
          </div>

        </template>
      </div>

      <!-- 输入框（始终显示，一体化设计） -->
      <div class="chat-input-wrapper">
        <div class="unified-input-box">
          <!-- 参数摘要（confirm 阶段展示在输入框内部上方） -->
          <div v-if="step === 'confirm'" class="input-param-summary-section">
            <ParamInputPanel />
          </div>

          <div class="input-text-section">
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
              <!-- 文件上传 -->
              <el-upload
                class="file-upload"
                :show-file-list="false"
                :on-change="handleFileUpload"
                :auto-upload="false"
              >
                <el-button size="small" icon="el-icon-upload">上传文件</el-button>
              </el-upload>
              
              <!-- 已上传文件列表 -->
              <div v-if="referenceFiles.length > 0" class="uploaded-files">
                <span
                  v-for="file in referenceFiles"
                  :key="file.id"
                  class="uploaded-file-tag"
                >
                  {{ getFileIcon(file.name) }} {{ file.name }}
                  <el-button
                    size="mini"
                    type="text"
                    @click.stop="removeReferenceFile(file.id)"
                  >
                    ×
                  </el-button>
                </span>
              </div>
            </div>
            <div class="input-toolbar-right">
              <el-button
                class="chat-send-btn"
                type="primary"
                @click="step === 'confirm' ? handleConfirmParams() : handleSend()"
                :disabled="examStore.isGenerating || (step !== 'confirm' && !inputText.trim())"
                :loading="examStore.isGenerating"
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

    <!-- 拖拽分隔条 -->
    <div
      v-if="examStore.showPreview && examStore.currentPaper"
      class="resize-handle"
      @mousedown="startResize"
    />

    <!-- 卷面预览区 -->
    <transition name="slide-right">
      <div v-if="examStore.showPreview && examStore.currentPaper" class="preview-wrapper" :style="{ width: previewPanelWidth + 'px' }">
        <ExamPreview
          :step="step"
          :batch-mode="batchMode"
          :selected-question-ids="selectedQuestionIds"
          :batch-action-dialog-visible="batchActionDialogVisible"
          :batch-action-type="batchActionType"
          :batch-score="batchScore"
          :editing-id="editingId"
          :edit-content="editContent"
          :preview-zoom="previewZoom"
          :show-answers="showAnswers"
          @update:batch-mode="batchMode = $event"
          @update:selected-question-ids="selectedQuestionIds = $event"
          @update:batch-action-dialog-visible="batchActionDialogVisible = $event"
          @update:batch-action-type="batchActionType = $event"
          @update:editing-id="editingId = $event"
          @update:edit-content="editContent = $event"
          @update:preview-zoom="previewZoom = $event"
          @update:show-answers="showAnswers = $event"
          @open-question-action="openQuestionAction"
          @supplement="handleSupplement"
          @drag-end="onDragEnd"
        />
      </div>
    </transition>

    <!-- 题目操作弹窗 -->
    <QuestionActionDialog
      v-model:visible="actionDialogVisible"
      :question="actionQuestion"
      @question-updated="actionQuestion = $event"
    />

    <!-- 批量操作确认弹窗 -->
    <BatchActionDialog
      v-model:visible="batchActionDialogVisible"
      :action-type="batchActionType"
      :selected-count="selectedQuestionIds.size"
      :score="batchScore"
      @confirm="confirmBatchAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useExamStore } from '../stores/exam'

import { useExamChat } from '../composables/useExamChat'
import { useExamParams } from '../composables/useExamParams'
import { useExamUpload } from '../composables/useExamUpload'
import { useBatchOperations } from '../composables/useBatchOperations'
import ThinkingBubble from '../components/ThinkingBubble.vue'
import SummaryCard from '../components/SummaryCard.vue'
import ClarifyQuestion from '../components/ClarifyQuestion.vue'
import QuickScenes from '../components/QuickScenes.vue'
import ParamInputPanel from '../components/ParamInputPanel.vue'
import ExamPreview from '../components/ExamPreview.vue'
import QuestionActionDialog from '../components/QuestionActionDialog.vue'
import BatchActionDialog from '../components/BatchActionDialog.vue'
import type { Question } from '../types'

const examStore = useExamStore()
const messagesRef = ref<HTMLElement>()

// 集成 composables
const { messages, step, inputText, greetingText, greetingDone, inputPlaceholder, quickScenes, addMsg, formatMessage, startTypingEffect } = useExamChat()
const { selectedChapters, confirmParams } = useExamParams()
const { referenceFiles, handleFileUpload, removeReferenceFile, getFileIcon } = useExamUpload()
const { selectedQuestionIds, batchMode, batchActionDialogVisible, batchActionType, batchScore, confirmBatchAction } = useBatchOperations()



// 其他状态
const previewZoom = ref(100)
const showAnswers = ref(false)
const editingId = ref<string | null>(null)
const editContent = ref('')
const previewPanelWidth = ref(600)

// ========== 拖拽调整预览区宽度 ==========
function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = previewPanelWidth.value

  function onMouseMove(ev: MouseEvent) {
    const delta = startX - ev.clientX
    previewPanelWidth.value = Math.max(360, Math.min(window.innerWidth - 300, startWidth + delta))
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
const actionDialogVisible = ref(false)
const actionQuestion = ref<Question | null>(null)

// 选择快捷场景
function selectScene(scene: any) {
  step.value = 'confirm'
  const d = scene.defaults
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  examStore.condition.count = d.count
  examStore.condition.questionTypes = [...d.questionTypes]
  // 不立即显示消息，等待用户确认后再显示
  scrollToBottom()
}

// 确认参数并开始生成
async function handleConfirmParams() {
  confirmParams()
  addMsg('user', '确认生成试卷')
  addMsg('assistant', '好的，正在为您生成试卷...')
  await startGenerate()
}

// 开始生成
async function startGenerate() {
  step.value = 'generating'
  examStore.isGenerating = true
  addMsg('assistant', 'AI 正在思考...', 'thinking')
  
  try {
    // 使用本地生成逻辑
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
  } catch (error) {
    console.error('生成错误:', error)
    ElMessage.error('生成失败，请重试')
    addMsg('assistant', '生成失败，请重试')
    step.value = 'confirm'
    examStore.isGenerating = false
    scrollToBottom()
  }
}

function handleCancelGenerate() { examStore.cancelGenerate() }
function handleViewPaper() { examStore.showPreview = true }

// 自然语言输入
async function handleSend() {
  if (examStore.isGenerating) return
  if (step.value === 'init' && !inputText.value.trim()) return

  const text = inputText.value.trim()
  inputText.value = ''

  // 添加用户消息到界面
  addMsg('user', text)
  
  try {
    // 使用本地逻辑
    if (step.value === 'init') {
      const { needClarify, clarifyData } = await examStore.clarifyUserInput(text)
      if (needClarify && clarifyData) {
        addMsg('assistant', '', 'clarify', clarifyData)
        step.value = 'confirm'
        scrollToBottom()
      } else {
        addMsg('assistant', '好的，正在为您生成试卷...')
        startGenerate()
      }
    } else if (step.value === 'confirm') {
      const { needClarify, clarifyData } = await examStore.clarifyUserInput(text)
      if (needClarify && clarifyData) {
        addMsg('assistant', '', 'clarify', clarifyData)
        scrollToBottom()
      } else {
        addMsg('assistant', '好的，正在为您生成试卷...')
        confirmParams()
      }
    } else {
      await new Promise(r => setTimeout(r, 300))
      addMsg('assistant', '好的，正在为您生成试卷...')
      startGenerate()
    }
  } catch (error) {
    console.error('对话错误:', error)
    ElMessage.error('对话失败，请重试')
    addMsg('assistant', '对话失败，请重试')
  }
}

// 追问确认
function handleClarifyConfirm(selections: Record<string, string>) {
  examStore.applyClarifySelections(selections)
  addMsg('user', `已确认：${Object.values(selections).join('、')}`)
  if (!examStore.clarifyResponse) {
    addMsg('assistant', '参数已确认，请点击生成按钮。', 'param-summary')
  }
  scrollToBottom()
}

// 追问自定义输入
async function handleClarifyCustom(text: string) {
  addMsg('user', text)
  const { needClarify, clarifyData } = await examStore.clarifyUserInput(text)
  if (needClarify && clarifyData) {
    addMsg('assistant', '', 'clarify', clarifyData)
  } else {
    addMsg('assistant', '参数已确认，请点击生成按钮。', 'param-summary')
  }
  scrollToBottom()
}

// 覆盖度补充
function handleSupplement(knowledgePoint: string) {
  ElMessage.info(`补充「${knowledgePoint}」相关题目（原型演示）`)
}

// 打开题目操作弹窗
function openQuestionAction(q: Question) {
  actionQuestion.value = q
  actionDialogVisible.value = true
}

// 拖拽结束处理
function onDragEnd() {
  if (!examStore.currentPaper) return
  const allQuestions: Question[] = []
  // 重新构建题目顺序
  // 这里可以根据需要实现具体逻辑
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 键盘事件处理
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (step.value !== 'done') return
    e.preventDefault()
    const result = examStore.undoLastAction()
    if (result.success) ElMessage.success(result.message)
    else ElMessage.info(result.message)
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  examStore.detectRegion()
  // 打字机效果
  startTypingEffect()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.ai-exam-page {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

/* ========== 拖拽分隔条 ========== */
.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: var(--border-primary);
  flex-shrink: 0;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background: var(--accent);
}

.preview-wrapper {
  flex-shrink: 0;
  overflow: hidden;
  height: 100%;
}

.preview-wrapper :deep(.preview-area) {
  height: 100%;
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

.input-param-summary-section {
  padding: 12px 16px 0;
  border-bottom: 1px solid var(--border-secondary);
  padding-bottom: 12px;
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

/* 文件上传样式 */
.file-upload {
  margin-right: 12px;
}

.uploaded-files {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.uploaded-file-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.uploaded-file-tag .el-button {
  padding: 0;
  margin-left: 4px;
  color: var(--text-tertiary);
}

.uploaded-file-tag .el-button:hover {
  color: var(--accent);
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

.typing-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ========== 消息样式 ========== */
.message {
  display: flex;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.assistant {
  flex-direction: row;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.message-body {
  flex: 1;
  max-width: 80%;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.assistant .message-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-top-left-radius: 4px;
}

.user .message-content {
  background: var(--accent);
  color: white;
  border-top-right-radius: 4px;
}

.thinking-card {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-primary) !important;
}

.summary-card-wrapper {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-primary) !important;
  padding: 0 !important;
}

.clarify-wrapper {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border-primary) !important;
  padding: 0 !important;
}

/* ========== 过渡动画 ========== */
.fade-out-enter-active,
.fade-out-leave-active {
  transition: all 0.3s ease;
}

.fade-out-enter-from,
.fade-out-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
