import { ref, computed } from 'vue'
import { useExamStore } from '../stores/exam'
import {
  SUBJECT_QUESTION_TYPES, SUBJECT_TYPE_LABELS,
  CHAPTER_OPTIONS
} from '../types'
import type { QuestionType, TextbookVersion } from '../types'

export function useExamParams() {
  const examStore = useExamStore()
  const selectedChapters = ref<string[]>([])

  // 学科相关题型
  const currentQuestionTypes = computed(() => {
    const subject = examStore.condition.subject
    if (!subject) return ['choice', 'fillBlank', 'shortAnswer', 'judgment'] as QuestionType[]
    return SUBJECT_QUESTION_TYPES[subject] || ['choice', 'fillBlank', 'shortAnswer']
  })

  // 学科相关题型标签
  const currentTypeLabels = computed(() => {
    const subject = examStore.condition.subject
    if (!subject) return {}
    return SUBJECT_TYPE_LABELS[subject] || {}
  })

  // 章节选项（使用教材版本）
  const chapterOptions = computed(() => {
    const subject = examStore.condition.subject
    const grade = examStore.condition.grade
    const version = examStore.condition.textbookVersion || 'pep'
    if (!subject || !grade) return []
    const key = `${subject}-${grade}-${version}`
    return CHAPTER_OPTIONS[key] || []
  })

  // 学科变化时重置章节和题型
  function onSubjectChange() {
    selectedChapters.value = []
    const types = SUBJECT_QUESTION_TYPES[examStore.condition.subject || 'math']
    if (types) {
      examStore.condition.questionTypes = [...types]
    }
  }

  // 切换题型
  function toggleQuestionType(qt: QuestionType) {
    const types = examStore.condition.questionTypes || []
    const idx = types.indexOf(qt)
    if (idx >= 0) {
      types.splice(idx, 1)
    } else {
      types.push(qt)
    }
    examStore.condition.questionTypes = [...types]
  }

  // 更新难度比例
  function updateDifficultyRatio(key: 'easy' | 'medium' | 'hard', val: number) {
    if (!examStore.condition.difficultyRatio) {
      examStore.condition.difficultyRatio = { easy: 33, medium: 34, hard: 33 }
    }
    examStore.condition.difficultyRatio[key] = val
  }

  // 确认参数并生成
  function confirmParams() {
    if (selectedChapters.value.length > 0) {
      examStore.condition.scope = {
        chapters: selectedChapters.value,
        textbookVersion: examStore.condition.textbookVersion || 'pep'
      }
      examStore.condition.knowledgePoints = [...selectedChapters.value]
    }
    // 这里可以添加生成试卷的逻辑
  }

  return {
    selectedChapters,
    currentQuestionTypes,
    currentTypeLabels,
    chapterOptions,
    onSubjectChange,
    toggleQuestionType,
    updateDifficultyRatio,
    confirmParams
  }
}
