<template>
  <div class="preview-area">
    <div class="preview-header">
      <span class="preview-title">卷面预览</span>
      <div class="preview-actions">
        <div class="zoom-controls">
          <button v-for="z in [100, 125, 150]" :key="z" class="zoom-btn" :class="{ active: previewZoom === z }" @click="$emit('update:previewZoom', z)">{{ z }}%</button>
        </div>
        <button class="answer-toggle" :class="{ active: showAnswers }" @click="$emit('update:showAnswers', !showAnswers)">{{ showAnswers ? '隐藏答案' : '显示答案' }}</button>
        <el-button size="small" @click="handleExportWord">导出 Word</el-button>
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
        <el-button size="small" @click="openDeleteDialog">批量删除</el-button>
        <el-button size="small" @click="openAdaptDialog">批量改编</el-button>
        <el-button size="small" @click="openScoreDialog">调整分值</el-button>
      </template>
      <el-button v-if="batchMode" size="small" text @click="exitBatchMode">退出批量</el-button>
    </div>
    <div class="preview-content" ref="previewRef">
      <!-- 知识点覆盖度横条（卷面上方） -->
      <div v-if="step === 'done' && coverageItems.length > 0" class="coverage-bar-top">
        <span class="coverage-bar-label">📊 知识点覆盖</span>
        <div class="coverage-bar-items">
          <button
            v-for="item in coverageItems"
            :key="item.knowledgePoint"
            class="coverage-bar-chip"
            :class="coverageBarClass(item.coverageRate)"
            @click="$emit('supplement', item.knowledgePoint)"
            :title="`${item.knowledgePoint}：${item.coverageRate}%（${item.coveredCount}/${item.suggestedCount}题）`"
            :aria-label="`${item.knowledgePoint}，覆盖率${item.coverageRate}%，点击补充`"
          >
            <span class="coverage-bar-chip-name">{{ item.knowledgePoint }}</span>
            <span class="coverage-bar-chip-rate">{{ item.coverageRate }}%</span>
          </button>
        </div>
      </div>
      <div class="a4-paper" :style="{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }">
        <div class="paper-header">
          <div class="paper-title">{{ currentPaper?.title }}</div>
          <div class="paper-info">
            <span>姓名：__________</span>
            <span>班级：__________</span>
            <span>得分：__________</span>
          </div>
          <div class="paper-meta">
            考试时间：{{ currentPaper?.duration }}分钟 &nbsp; 满分：{{ currentPaper?.totalScore }}分
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
                @click="$emit('update:editingId', q.id)"
              >
                <input v-if="batchMode" type="checkbox" :checked="selectedQuestionIds.has(q.id)" @change="toggleQuestionSelect(q.id)" class="batch-checkbox" @click.stop />
                <div class="question-header">
                  <span class="drag-handle" title="拖拽排序">⋮⋮</span>
                  <span class="question-number">{{ getQuestionNumber(q, gIdx, qIdx) }}.</span>
                  <span class="question-source">{{ q.source === 'bank' ? '题库' : 'AI生成' }}</span>
                  <div class="question-actions" @click.stop>
                    <el-button text size="small" @click="$emit('open-question-action', q)">操作 ▾</el-button>
                  </div>
                </div>
                <div class="question-content" v-html="formatQuestion(q)"></div>
                <div v-if="showAnswers" class="question-answer">
                  <div class="answer-label">答案</div>
                  <div>{{ q.answer }}</div>
                  <div v-if="q.analysis" class="answer-analysis">解析：{{ q.analysis }}</div>
                </div>
                <div v-if="editingId === q.id" class="question-edit" @click.stop>
                    <el-input :model-value="localEditContent" @update:model-value="localEditContent = $event; $emit('update:editContent', $event)" type="textarea" :rows="3" size="small" />
                    <div class="edit-actions">
                      <el-button size="small" type="primary" @click="saveEdit(q)">保存</el-button>
                      <el-button size="small" @click="$emit('update:editingId', null)">取消</el-button>
                    </div>
                  </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useExamStore } from '../stores/exam'
import { LABELS } from '../types'
import type { Question, QuestionType } from '../types'
import draggable from 'vuedraggable'

const examStore = useExamStore()

const props = defineProps<{
  step: 'init' | 'confirm' | 'generating' | 'done'
  batchMode: boolean
  selectedQuestionIds: Set<string>
  batchActionDialogVisible: boolean
  batchActionType: 'delete' | 'adapt' | 'score'
  batchScore: number
  editingId: string | null
  editContent: string
  previewZoom: number
  showAnswers: boolean
}>()

const emit = defineEmits<{
  (e: 'update:batchMode', value: boolean): void
  (e: 'update:selectedQuestionIds', value: Set<string>): void
  (e: 'update:batchActionDialogVisible', value: boolean): void
  (e: 'update:batchActionType', value: 'delete' | 'adapt' | 'score'): void
  (e: 'update:batchScore', value: number): void
  (e: 'update:editingId', value: string | null): void
  (e: 'update:editContent', value: string): void
  (e: 'update:previewZoom', value: number): void
  (e: 'update:showAnswers', value: boolean): void
  (e: 'open-question-action', question: Question): void
  (e: 'supplement', knowledgePoint: string): void
  (e: 'drag-end'): void
}>()

const previewRef = ref<HTMLElement>()
const localEditContent = ref('')

const currentPaper = computed(() => examStore.currentPaper)
const coverageItems = computed(() => examStore.coverageItems)

watch(() => props.editingId, (newId) => {
  if (newId) {
    const q = examStore.currentPaper?.questions.find(q => q.id === newId)
    if (q) {
      localEditContent.value = q.content
      emit('update:editContent', q.content)
    }
  }
})

watch(() => props.editContent, (newContent) => {
  localEditContent.value = newContent
})

const allQuestionIds = computed(() => examStore.currentPaper?.questions.map(q => q.id) || [])

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

function formatQuestion(q: Question) {
  let html = q.content
  if (q.options?.length) {
    html += '<br><span style="margin-left:20px">'
    html += q.options.map(o => `${o.label}. ${o.content}`).join('&nbsp;&nbsp;')
    html += '</span>'
  }
  return html
}

function toggleBatchMode() {
  if (!props.batchMode) {
    emit('update:batchMode', true)
    emit('update:selectedQuestionIds', new Set())
  } else {
    if (props.selectedQuestionIds.size === allQuestionIds.value.length) {
      emit('update:selectedQuestionIds', new Set())
    } else {
      emit('update:selectedQuestionIds', new Set(allQuestionIds.value))
    }
  }
}

function exitBatchMode() {
  emit('update:batchMode', false)
  emit('update:selectedQuestionIds', new Set())
}

function toggleQuestionSelect(qId: string) {
  const newSelected = new Set(props.selectedQuestionIds)
  if (newSelected.has(qId)) {
    newSelected.delete(qId)
  } else {
    newSelected.add(qId)
  }
  emit('update:selectedQuestionIds', newSelected)
}

function saveEdit(q: Question) {
  q.content = localEditContent.value
  emit('update:editingId', null)
}

function openDeleteDialog() {
  emit('update:batchActionType', 'delete')
  emit('update:batchActionDialogVisible', true)
}

function openAdaptDialog() {
  emit('update:batchActionType', 'adapt')
  emit('update:batchActionDialogVisible', true)
}

function openScoreDialog() {
  emit('update:batchActionType', 'score')
  emit('update:batchScore', 5)
  emit('update:batchActionDialogVisible', true)
}

function handleSave() {
  // 原型演示：模拟保存到本地存储
  try {
    const paper = examStore.currentPaper
    if (!paper) return
    const saved = JSON.parse(localStorage.getItem('savedExams') || '[]')
    const existing = saved.findIndex((e: any) => e.id === paper.id)
    if (existing >= 0) {
      saved[existing] = { ...paper, savedAt: new Date().toISOString() }
    } else {
      saved.push({ ...paper, savedAt: new Date().toISOString() })
    }
    localStorage.setItem('savedExams', JSON.stringify(saved))
    ElMessage.success('试卷已保存')
  } catch {
    ElMessage.error('保存失败')
  }
}

function handleExportWord() {
  ElMessage.info('Word 导出功能将在后续版本实现')
}

function handlePrint() {
  window.print()
}

function onDragEnd() {
  emit('drag-end')
}

function coverageBarClass(rate: number): string {
  if (rate >= 80) return 'coverage-good'
  if (rate >= 50) return 'coverage-warning'
  return 'coverage-danger'
}
</script>

<style scoped>
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  min-width: 0;
  overflow: hidden;
}

.preview-header {
  padding: 12px 24px;
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
  align-items: center;
  gap: 12px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-btn {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.zoom-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.zoom-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.answer-toggle {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.answer-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.answer-toggle.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.batch-toolbar {
  padding: 8px 24px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.batch-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.batch-select-all input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  min-width: 0;
}

.coverage-bar-top {
  margin-bottom: 20px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
}

.coverage-bar-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: block;
}

.coverage-bar-items {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.coverage-bar-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.coverage-bar-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.coverage-bar-chip-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.coverage-bar-chip-rate {
  font-weight: 500;
  min-width: 30px;
  text-align: right;
}

.coverage-good {
  background: rgba(103, 194, 58, 0.1);
  border-color: rgba(103, 194, 58, 0.3);
  color: #67c23a;
}

.coverage-warning {
  background: rgba(230, 162, 60, 0.1);
  border-color: rgba(230, 162, 60, 0.3);
  color: #e6a23c;
}

.coverage-danger {
  background: rgba(245, 108, 108, 0.1);
  border-color: rgba(245, 108, 108, 0.3);
  color: #f56c6c;
}

.a4-paper {
  background: #fff;
  padding: 40px;
  margin: 0 auto;
  max-width: 842px;
  min-height: 1190px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  transition: transform var(--transition-fast);
}

.paper-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000;
}

.paper-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.paper-info {
  font-size: 14px;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
  gap: 32px;
}

.paper-meta {
  font-size: 12px;
  color: #666;
}

.question-group-wrapper {
  margin-bottom: 32px;
}

.group-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 4px solid var(--accent);
}

.question-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-item {
  padding: 16px;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  transition: all var(--transition-fast);
  position: relative;
}

.question-item:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.question-item.editing {
  border-color: var(--accent);
  background: rgba(17, 17, 17, 0.02);
}

.batch-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-secondary);
}

.drag-handle {
  font-size: 16px;
  color: var(--text-tertiary);
  cursor: move;
  user-select: none;
  padding: 2px 4px;
  border-radius: 2px;
  transition: all var(--transition-fast);
}

.drag-handle:hover {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.question-number {
  font-weight: bold;
  min-width: 24px;
}

.question-source {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.question-actions {
  margin-left: auto;
}

.question-content {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.question-answer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-secondary);
}

.answer-label {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 13px;
}

.answer-analysis {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  font-style: italic;
}

.question-edit {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-secondary);
}

.edit-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.question-ghost {
  opacity: 0.5;
  background: #f0f0f0;
  border: 2px dashed var(--border-primary);
}

@media print {
  .preview-header,
  .batch-toolbar,
  .coverage-bar-top,
  .question-actions,
  .question-edit {
    display: none !important;
  }
  
  .a4-paper {
    transform: none !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
}
</style>
