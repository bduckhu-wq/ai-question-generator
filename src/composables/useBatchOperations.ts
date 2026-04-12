import { ref, computed } from 'vue'
import { useExamStore } from '../stores/exam'

export function useBatchOperations() {
  const examStore = useExamStore()
  const selectedQuestionIds = ref<Set<string>>(new Set())
  const batchMode = ref(false)
  const batchActionDialogVisible = ref(false)
  const batchActionType = ref<'delete' | 'adapt' | 'score'>('delete')
  const batchScore = ref(5)

  const allQuestionIds = computed(() => examStore.currentPaper?.questions.map(q => q.id) || [])

  function toggleBatchMode() {
    if (!batchMode.value) { 
      batchMode.value = true
      selectedQuestionIds.value = new Set() 
    }
    else { 
      if (selectedQuestionIds.value.size === allQuestionIds.value.length) 
        selectedQuestionIds.value = new Set()
      else 
        selectedQuestionIds.value = new Set(allQuestionIds.value) 
    }
  }

  function exitBatchMode() { 
    batchMode.value = false
    selectedQuestionIds.value = new Set() 
  }

  function toggleQuestionSelect(qId: string) {
    if (selectedQuestionIds.value.has(qId)) 
      selectedQuestionIds.value.delete(qId)
    else 
      selectedQuestionIds.value.add(qId)
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

  return {
    selectedQuestionIds,
    batchMode,
    batchActionDialogVisible,
    batchActionType,
    batchScore,
    allQuestionIds,
    toggleBatchMode,
    exitBatchMode,
    toggleQuestionSelect,
    confirmBatchAction
  }
}
