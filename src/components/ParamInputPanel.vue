<template>
  <div class="param-input-panel">
    <div class="params-preview" @click="isEditing = !isEditing">
      <div class="params-preview-text">{{ paramsDescription }}</div>
      <div class="params-preview-edit">
        <span class="edit-icon">✏️</span>
        <span>点击调整参数</span>
      </div>
    </div>
    
    <div v-if="isEditing" class="params-edit">
      <div class="params-row">
        <div class="param-chip">
          <span class="param-chip-label">学科</span>
          <el-select v-model="subject" size="small" placeholder="选择" @change="onSubjectChange" style="width: 100px">
            <el-option v-for="(label, key) in SUBJECT_LABELS" :key="key" :label="label" :value="key" />
          </el-select>
        </div>
        <div class="param-chip">
          <span class="param-chip-label">年级</span>
          <el-select v-model="grade" size="small" placeholder="选择" style="width: 90px">
            <el-option v-for="(label, key) in GRADE_LABELS" :key="key" :label="label" :value="key" />
          </el-select>
        </div>
        <div class="param-chip">
          <span class="param-chip-label">版本</span>
          <el-select v-model="textbookVersion" size="small" placeholder="选择" style="width: 100px">
            <el-option v-for="(label, key) in TEXTBOOK_VERSION_LABELS" :key="key" :label="label" :value="key" />
          </el-select>
        </div>
        <div class="param-chip">
          <span class="param-chip-label">地区</span>
          <el-select v-model="region" size="small" placeholder="自动检测" clearable style="width: 90px">
            <el-option v-for="(label, key) in REGION_LABELS" :key="key" :label="label" :value="key" />
          </el-select>
          <span v-if="isDetectingRegion" class="region-detecting">检测中...</span>
        </div>
      </div>
      <div class="params-row" style="margin-top: 8px;">
        <ChapterSelect
          :modelValue="selectedChapters"
          :subject="subject"
          :grade="grade"
          :textbookVersion="textbookVersion"
          @update:modelValue="selectedChapters = $event"
        />
      </div>
      <div class="params-row" style="margin-top: 8px;">
        <div class="param-chip param-chip--full">
          <span class="param-chip-label">题型</span>
          <div class="question-type-tags">
            <span
              v-for="qt in currentQuestionTypes"
              :key="qt"
              class="type-tag"
              :class="{ 'type-tag--active': questionTypes.includes(qt) }"
              @click="toggleQuestionType(qt)"
            >{{ currentTypeLabels[qt] || LABELS[qt] }}</span>
          </div>
        </div>
      </div>
      <div class="params-row" style="margin-top: 8px;">
        <div class="param-chip param-chip--full">
          <span class="param-chip-label">难度</span>
          <div class="difficulty-inline">
            <div v-for="key in (['easy', 'medium', 'hard'] as const)" :key="key" class="difficulty-inline-item">
              <span class="difficulty-name">{{ DIFFICULTY_LABELS[key] }}</span>
              <el-slider
                :model-value="difficultyRatio[key]"
                :min="0" :max="100" :step="5"
                @input="(val: number) => updateDifficultyRatio(key, val)"
                :show-tooltip="false"
                size="small"
              />
              <span class="difficulty-value">{{ difficultyRatio[key] }}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="params-actions" style="margin-top: 12px;">
        <el-button size="small" @click="isEditing = false">取消</el-button>
        <el-button size="small" type="primary" @click="isEditing = false">完成</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useExamStore } from '../stores/exam'
import {
  LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS, GRADE_LABELS,
  TEXTBOOK_VERSION_LABELS, REGION_LABELS, SUBJECT_QUESTION_TYPES, SUBJECT_TYPE_LABELS
} from '../types'
import type { QuestionType, TextbookVersion } from '../types'
import ChapterSelect from './ChapterSelect.vue'

const examStore = useExamStore()

const isEditing = ref(false)
const subject = ref(examStore.condition.subject || '')
const grade = ref(examStore.condition.grade || '')
const textbookVersion = ref<TextbookVersion>(examStore.condition.textbookVersion || 'pep')
const region = ref(examStore.condition.region || '')
const questionTypes = ref<QuestionType[]>(examStore.condition.questionTypes || [])
const selectedChapters = ref<string[]>([])
const isDetectingRegion = ref(false)

const difficultyRatio = ref({
  easy: examStore.condition.difficultyRatio?.easy || 33,
  medium: examStore.condition.difficultyRatio?.medium || 34,
  hard: examStore.condition.difficultyRatio?.hard || 33
})

// 学科相关题型
const currentQuestionTypes = computed(() => {
  const subjectValue = subject.value
  if (!subjectValue) return ['choice', 'fillBlank', 'shortAnswer', 'judgment'] as QuestionType[]
  return SUBJECT_QUESTION_TYPES[subjectValue] || ['choice', 'fillBlank', 'shortAnswer']
})

// 学科相关题型标签
const currentTypeLabels = computed(() => {
  const subjectValue = subject.value
  if (!subjectValue) return LABELS
  return SUBJECT_TYPE_LABELS[subjectValue] || LABELS
})

// 自然语言描述参数
const paramsDescription = computed(() => {
  const parts: string[] = []
  
  if (subject.value && grade.value) {
    parts.push(`${SUBJECT_LABELS[subject.value]}${GRADE_LABELS[grade.value]}`)
  }
  
  if (textbookVersion.value) {
    parts.push(TEXTBOOK_VERSION_LABELS[textbookVersion.value])
  }
  
  if (region.value) {
    parts.push(REGION_LABELS[region.value])
  }
  
  if (questionTypes.value.length > 0) {
    const types = questionTypes.value.map(qt => currentTypeLabels.value[qt] || LABELS[qt]).join('、')
    parts.push(`包含${types}`)
  }
  
  const { easy, medium, hard } = difficultyRatio.value
  const mainDifficulty = easy >= medium && easy >= hard ? '偏简单' : hard >= medium && hard >= easy ? '偏难' : '适中'
  parts.push(`难度${mainDifficulty}`)
  
  return `将为您生成一份${parts.join('，')}的试卷，确认无误请点击发送，或点击调整参数。`
})

// 学科变化时重置章节和题型
function onSubjectChange() {
  selectedChapters.value = []
  const types = SUBJECT_QUESTION_TYPES[subject.value || 'math']
  if (types) {
    questionTypes.value = [...types]
    examStore.condition.questionTypes = [...types]
  }
  examStore.condition.subject = subject.value
}

// 切换题型
function toggleQuestionType(qt: QuestionType) {
  const idx = questionTypes.value.indexOf(qt)
  if (idx >= 0) {
    questionTypes.value.splice(idx, 1)
  } else {
    questionTypes.value.push(qt)
  }
  examStore.condition.questionTypes = [...questionTypes.value]
}

// 更新难度比例
function updateDifficultyRatio(key: 'easy' | 'medium' | 'hard', val: number) {
  difficultyRatio.value[key] = val
  if (!examStore.condition.difficultyRatio) {
    examStore.condition.difficultyRatio = { easy: 33, medium: 34, hard: 33 }
  }
  examStore.condition.difficultyRatio[key] = val
}

// 监听其他参数变化
watch(subject, (newValue) => {
  examStore.condition.subject = newValue
})

watch(grade, (newValue) => {
  examStore.condition.grade = newValue
})

watch(textbookVersion, (newValue) => {
  examStore.condition.textbookVersion = newValue
})

watch(region, (newValue) => {
  examStore.condition.region = newValue
})
</script>

<style scoped>
.param-input-panel {
  /* padding 由父容器控制 */
}

/* 参数预览样式 */
.params-preview {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.params-preview:hover {
  opacity: 0.8;
}

.params-preview-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.params-preview-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--accent);
  margin-top: 6px;
}

.edit-icon {
  font-size: 10px;
}

/* 编辑模式样式 */
.params-edit {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.params-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
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
  background: var(--bg-primary);
  box-shadow: none;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  min-height: 30px;
}

.param-chip :deep(.el-select .el-select__placeholder) {
  font-size: 12px;
}

.region-detecting {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-left: 4px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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

/* 操作按钮 */
.params-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-secondary);
}
</style>
