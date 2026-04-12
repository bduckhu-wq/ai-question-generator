<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    width="420px"
    :close-on-click-modal="true"
    class="question-action-dialog"
    append-to-body
  >
    <template #header>
      <div class="action-dialog-header">
        <span class="action-dialog-title">题目操作</span>
        <div class="action-dialog-header-actions">
          <el-popconfirm
            title="确定删除此题？"
            confirm-button-text="确定删除"
            cancel-button-text="取消"
            confirm-button-type="danger"
            @confirm="handleDeleteQuestion"
          >
            <template #reference>
              <button class="action-delete-btn">删除</button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </template>

    <div v-if="question" class="action-panel">
      <!-- 精简摘要 -->
      <div class="action-summary">
        <el-tag size="small" type="info">{{ getTypeLabel(question.type) }}</el-tag>
        <el-tag size="small" :type="difficultyTagType(question.difficulty)">{{ DIFFICULTY_LABELS[question.difficulty] }}</el-tag>
        <el-tag size="small" type="warning">{{ question.score }}分</el-tag>
        <el-tag v-for="kp in question.knowledgePoints?.slice(0, 2)" :key="kp" size="small" type="success" class="action-kp-tag">{{ kp }}</el-tag>
      </div>

      <!-- 操作按钮区 -->
      <div class="action-ops-grid">
        <!-- 换难度 -->
        <div class="action-op-item" :class="{ 'action-op-item--active': actionExpandKey === 'difficulty' }">
          <button class="action-op-btn" @click="toggleActionExpand('difficulty')">
            <span class="action-op-icon">📊</span>
            <span class="action-op-text">换难度</span>
            <span class="action-op-value">{{ DIFFICULTY_LABELS[question.difficulty] }}</span>
            <span class="action-op-arrow" :class="{ 'action-op-arrow--open': actionExpandKey === 'difficulty' }">▾</span>
          </button>
          <transition name="expand">
            <div v-if="actionExpandKey === 'difficulty'" class="action-expand-list">
              <button
                v-for="d in difficultyOptions"
                :key="d.value"
                class="action-expand-item"
                :class="{ 'action-expand-item--active': question.difficulty === d.value }"
                @click="handleDifficultyChange(d.value)"
              >
                <span class="action-expand-radio">{{ question.difficulty === d.value ? '●' : '○' }}</span>
                {{ d.label }}
              </button>
            </div>
          </transition>
        </div>

        <!-- 换题型 -->
        <div class="action-op-item" :class="{ 'action-op-item--active': actionExpandKey === 'questionType' }">
          <button class="action-op-btn" @click="toggleActionExpand('questionType')">
            <span class="action-op-icon">📝</span>
            <span class="action-op-text">换题型</span>
            <span class="action-op-value">{{ getTypeLabel(question.type) }}</span>
            <span class="action-op-arrow" :class="{ 'action-op-arrow--open': actionExpandKey === 'questionType' }">▾</span>
          </button>
          <transition name="expand">
            <div v-if="actionExpandKey === 'questionType'" class="action-expand-list">
              <button
                v-for="t in questionTypeOptions"
                :key="t.value"
                class="action-expand-item"
                :class="{ 'action-expand-item--active': question.type === t.value }"
                @click="handleQuestionTypeChange(t.value)"
              >
                <span class="action-expand-radio">{{ question.type === t.value ? '●' : '○' }}</span>
                {{ t.label }}
              </button>
            </div>
          </transition>
        </div>

        <!-- 换一道类似的 -->
        <div class="action-op-item">
          <button class="action-op-btn" :disabled="isLoading" @click="handleSimilarReplace">
            <span class="action-op-icon" :class="{ 'action-op-icon--loading': isLoading }">🔄</span>
            <span class="action-op-text">换一道类似的</span>
          </button>
        </div>

        <!-- 分值调整 -->
        <div class="action-op-item">
          <button class="action-op-btn action-op-btn--score">
            <span class="action-op-icon">🔢</span>
            <span class="action-op-text">分值</span>
            <el-input-number
              :model-value="score"
              @update:model-value="score = $event; handleScoreChange($event)"
              :min="1"
              :max="20"
              :step="1"
              size="small"
              controls-position="right"
              class="action-score-input"
            />
          </button>
        </div>
      </div>

      <!-- 自定义改编 -->
      <div class="action-custom">
        <div class="action-custom-label">✏️ 自定义改编</div>
        <el-input
          v-model="customText"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="请描述修改需求，例如：换成带图形的几何题、降低计算量"
          size="small"
          @keydown.enter.ctrl="confirmCustomAction"
        />
        <div class="action-tips">
          💡 例如：换成带图形的几何题、降低计算量、换成关于三角函数的题目
        </div>
        <div class="action-custom-submit">
          <el-button size="small" type="primary" :disabled="!customText.trim()" @click="confirmCustomAction">
            提交改编
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useExamStore } from '../stores/exam'
import {
  LABELS, DIFFICULTY_LABELS, SUBJECT_QUESTION_TYPES, SUBJECT_TYPE_LABELS
} from '../types'
import type { Question, QuestionType, Difficulty } from '../types'

const examStore = useExamStore()

const props = defineProps<{
  visible: boolean
  question: Question | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'question-updated', question: Question): void
}>()

const customText = ref('')
const score = ref(5)
const actionExpandKey = ref<'difficulty' | 'questionType' | null>(null)
const isLoading = ref(false)

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
]

const questionTypeOptions = computed(() => {
  const subject = examStore.condition.subject || 'math'
  const types = SUBJECT_QUESTION_TYPES[subject] || ['choice', 'fillBlank', 'shortAnswer', 'judgment'] as QuestionType[]
  const typeLabels = SUBJECT_TYPE_LABELS[subject] || LABELS
  return types.map(t => ({ value: t, label: typeLabels[t] || LABELS[t] }))
})

function getTypeLabel(type: QuestionType): string {
  const subject = examStore.condition.subject || 'math'
  const typeLabels = SUBJECT_TYPE_LABELS[subject]
  return typeLabels?.[type] || LABELS[type]
}

function difficultyTagType(difficulty: Difficulty): '' | 'success' | 'danger' {
  const map: Record<Difficulty, '' | 'success' | 'danger'> = { easy: 'success', medium: '', hard: 'danger' }
  return map[difficulty]
}

function toggleActionExpand(key: 'difficulty' | 'questionType') {
  actionExpandKey.value = actionExpandKey.value === key ? null : key
}

async function handleDifficultyChange(difficulty: Difficulty) {
  if (!props.question || props.question.difficulty === difficulty) {
    actionExpandKey.value = null
    return
  }
  await examStore.adaptQuestion(props.question.id, 'difficulty')
  const updated = examStore.currentPaper?.questions.find(q => q.id === props.question?.id)
  if (updated) {
    emit('question-updated', updated)
  }
  actionExpandKey.value = null
}

async function handleQuestionTypeChange(type: QuestionType) {
  if (!props.question || props.question.type === type) {
    actionExpandKey.value = null
    return
  }
  await examStore.adaptQuestion(props.question.id, 'questionType')
  const updated = examStore.currentPaper?.questions.find(q => q.id === props.question?.id)
  if (updated) {
    emit('question-updated', updated)
  }
  actionExpandKey.value = null
}

async function handleSimilarReplace() {
  if (!props.question || isLoading.value) return
  isLoading.value = true
  try {
    await examStore.replaceQuestion(props.question.id)
    const updated = examStore.currentPaper?.questions.find(q => q.id === props.question?.id)
    if (updated) {
      emit('question-updated', updated)
      score.value = updated.score
    }
  } finally {
    isLoading.value = false
  }
}

function handleScoreChange(val: number | undefined) {
  if (!props.question || !val) return
  examStore.updateQuestionScore(props.question.id, val)
  const updated = examStore.currentPaper?.questions.find(q => q.id === props.question?.id)
  if (updated) {
    emit('question-updated', updated)
  }
}

async function confirmCustomAction() {
  if (!props.question || !customText.value.trim()) return
  await examStore.replaceQuestion(props.question.id)
  emit('update:visible', false)
}

function handleDeleteQuestion() {
  if (!props.question) return
  examStore.removeQuestion(props.question.id)
  emit('update:visible', false)
}

watch(() => props.question, (newQuestion) => {
  if (newQuestion) {
    customText.value = ''
    score.value = newQuestion.score
    actionExpandKey.value = null
    isLoading.value = false
  }
}, { immediate: true })
</script>

<style scoped>
.action-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.action-dialog-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.action-delete-btn {
  font-size: 12px;
  color: var(--danger);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.action-delete-btn:hover {
  text-decoration: underline;
}

.action-panel {
  padding: 12px 0;
}

.action-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-secondary);
}

.action-kp-tag {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-ops-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.action-op-item {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  transition: all var(--transition-fast);
}

.action-op-item:hover {
  border-color: var(--accent);
}

.action-op-item--active {
  border-color: var(--accent);
  background: rgba(17, 17, 17, 0.02);
}

.action-op-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.action-op-btn:hover {
  background: rgba(17, 17, 17, 0.02);
}

.action-op-icon {
  font-size: 16px;
  margin-right: 12px;
}

.action-op-icon--loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.action-op-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.action-op-value {
  font-size: 12px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.action-op-arrow {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.action-op-arrow--open {
  transform: rotate(180deg);
}

.action-op-btn--score {
  justify-content: flex-start;
  gap: 12px;
}

.action-score-input {
  width: 80px;
  margin-left: auto;
}

.action-expand-list {
  padding: 8px 0;
  background: var(--bg-secondary);
}

.action-expand-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.action-expand-item:hover {
  background: rgba(17, 17, 17, 0.04);
}

.action-expand-item--active {
  background: rgba(17, 17, 17, 0.06);
  color: var(--accent);
}

.action-expand-radio {
  margin-right: 12px;
  font-size: 12px;
}

.action-custom {
  border-top: 1px solid var(--border-secondary);
  padding-top: 16px;
}

.action-custom-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.action-tips {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 8px 0 12px;
  line-height: 1.4;
}

.action-custom-submit {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
