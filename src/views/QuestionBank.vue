<template>
  <div class="question-bank-page">
    <div class="page-header">
      <div class="header-left">
        <span class="page-title">我的题库</span>
        <span class="question-count">共 {{ filteredQuestions.length }} 道题目</span>
      </div>
      <div class="header-actions">
        <el-button @click="handleBatchTag" :disabled="!selectedIds.length">
          批量打标签 ({{ selectedIds.length }})
        </el-button>
        <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedIds.length">
          批量删除 ({{ selectedIds.length }})
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="filters.keyword"
        placeholder="搜索题目内容..."
        size="small"
        style="width: 240px"
        clearable
      />
      <el-select v-model="filters.subject" placeholder="学科" size="small" clearable style="width: 100px">
        <el-option v-for="(label, key) in SUBJECT_LABELS" :key="key" :label="label" :value="key" />
      </el-select>
      <el-select v-model="filters.grade" placeholder="年级" size="small" clearable style="width: 100px">
        <el-option v-for="(label, key) in GRADE_LABELS" :key="key" :label="label" :value="key" />
      </el-select>
      <el-select v-model="filters.questionType" placeholder="题型" size="small" clearable style="width: 110px">
        <el-option v-for="(label, key) in LABELS" :key="key" :label="label" :value="key" />
      </el-select>
      <el-select v-model="filters.difficulty" placeholder="难度" size="small" clearable style="width: 90px">
        <el-option v-for="(label, key) in DIFFICULTY_LABELS" :key="key" :label="label" :value="key" />
      </el-select>
      <el-button size="small" @click="resetFilters">重置</el-button>
    </div>

    <!-- 题目列表 -->
    <div class="question-list">
      <template v-if="filteredQuestions.length">
      <div
        v-for="q in filteredQuestions"
        :key="q.id"
        class="question-card"
        :class="{ selected: selectedIds.includes(q.id) }"
      >
        <div class="card-checkbox" @click.stop>
          <el-checkbox :model-value="selectedIds.includes(q.id)" @change="toggleSelect(q.id)" />
        </div>
        <div class="card-body" @click="expandedId = expandedId === q.id ? null : q.id">
          <div class="card-top">
            <div class="card-tags">
              <el-tag size="small" class="tag-type">{{ LABELS[q.type] }}</el-tag>
              <el-tag size="small" :class="['tag-difficulty', `tag-difficulty--${q.difficulty}`]">{{ DIFFICULTY_LABELS[q.difficulty] }}</el-tag>
              <el-tag size="small" class="tag-meta">{{ SUBJECT_LABELS[q.subject] }}</el-tag>
              <el-tag size="small" class="tag-meta">{{ GRADE_LABELS[q.grade] }}</el-tag>
            </div>
            <div class="card-actions-top">
              <span
                class="favorite-btn"
                :class="{ active: q.isFavorite }"
                @click.stop="q.isFavorite = !q.isFavorite"
              >
                <svg v-if="q.isFavorite" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </span>
            </div>
          </div>
          <div class="card-content">{{ q.content }}</div>
          <div v-if="q.options?.length" class="card-options">
            <div v-for="o in q.options" :key="o.label" class="card-option">
              <span class="option-label">{{ o.label }}</span>
              <span class="option-text">{{ o.content }}</span>
            </div>
          </div>
          <div class="card-bottom">
            <span class="card-meta">使用 {{ q.usageCount }} 次</span>
            <span class="card-meta">{{ q.createdAt }}</span>
            <span class="card-expand">{{ expandedId === q.id ? '收起' : '展开' }}</span>
          </div>
        </div>

        <!-- 展开详情 -->
        <transition name="expand">
          <div v-if="expandedId === q.id" class="card-detail">
            <div class="detail-row">
              <span class="detail-label">答案：</span>
              <span class="detail-value">{{ q.answer }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">解析：</span>
              <span class="detail-value">{{ q.analysis || '暂无解析' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">知识点：</span>
              <div class="detail-tags">
                <el-tag v-for="kp in q.knowledgePoints" :key="kp" size="small">{{ kp }}</el-tag>
              </div>
            </div>
            <div class="detail-actions">
              <el-button text size="small" @click.stop="handleEdit(q)">编辑</el-button>
              <el-button text size="small" @click.stop="handleUseInExam(q)">加入试卷</el-button>
              <el-button text size="small" @click.stop="handleAdapt(q)">改编</el-button>
              <el-button text size="small" type="danger" @click.stop="handleDelete(q)">删除</el-button>
            </div>
          </div>
        </transition>
      </div>
      </template>
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">没有找到匹配的题目</div>
        <div class="empty-hint">试试调整筛选条件，或通过 AI 组卷添加题目</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { bankQuestions } from '../mock'
import { LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS, GRADE_LABELS } from '../types'
import type { Question } from '../types'

const questions = ref([...bankQuestions])
const expandedId = ref<string | null>(null)
const selectedIds = ref<string[]>([])

const filters = reactive({
  keyword: '',
  subject: undefined as any,
  grade: undefined as any,
  questionType: undefined as any,
  difficulty: undefined as any
})

const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    if (filters.keyword && !q.content.includes(filters.keyword)) return false
    if (filters.subject && q.subject !== filters.subject) return false
    if (filters.grade && q.grade !== filters.grade) return false
    if (filters.questionType && q.type !== filters.questionType) return false
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false
    return true
  })
})

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.subject = undefined
  filters.grade = undefined
  filters.questionType = undefined
  filters.difficulty = undefined
}

function handleEdit(q: Question) {
  ElMessage.info('编辑功能（原型演示）')
}

function handleUseInExam(q: Question) {
  ElMessage.success('已添加到当前试卷')
}

function handleAdapt(q: Question) {
  ElMessage.info('改编功能（原型演示）')
}

function handleDelete(q: Question) {
  ElMessageBox.confirm('确定删除此题目？', '提示', { type: 'warning' })
    .then(() => {
      questions.value = questions.value.filter(item => item.id !== q.id)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function handleBatchDelete() {
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 道题目？`, '提示', { type: 'warning' })
    .then(() => {
      questions.value = questions.value.filter(q => !selectedIds.value.includes(q.id))
      selectedIds.value = []
      ElMessage.success('批量删除成功')
    })
    .catch(() => {})
}

function handleBatchTag() {
  ElMessage.info('批量打标签（原型演示）')
}
</script>

<style scoped>
.question-bank-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.page-header {
  padding: 16px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.question-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-bar {
  padding: 12px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.question-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-card {
  display: flex;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.question-card:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.question-card.selected {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.card-checkbox {
  padding: 16px 8px 16px 16px;
  display: flex;
  align-items: flex-start;
}

.card-body {
  flex: 1;
  padding: 12px 16px 12px 0;
  cursor: pointer;
  min-width: 0;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-type {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: transparent;
  font-weight: 500;
}

.tag-difficulty {
  border-color: transparent;
}

.tag-difficulty--easy {
  background: #f6ffed;
  color: #389e0d;
  border-color: #b7eb8f;
}

.tag-difficulty--medium {
  background: #fffbe6;
  color: #d48806;
  border-color: #ffe58f;
}

.tag-difficulty--hard {
  background: #fff2f0;
  color: #cf1322;
  border-color: #ffccc7;
}

.tag-meta {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-color: transparent;
}

.favorite-btn {
  cursor: pointer;
  transition: transform var(--transition-fast), color var(--transition-fast);
  color: var(--text-quaternary);
  display: flex;
  align-items: center;
}

.favorite-btn:hover {
  transform: scale(1.2);
}

.favorite-btn.active {
  color: #faad14;
}

.card-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.card-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  margin-bottom: 4px;
}

.card-option {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.option-label {
  font-weight: 500;
  color: var(--text-primary);
  margin-right: 4px;
}

.card-bottom {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.card-expand {
  margin-left: auto;
  cursor: pointer;
  color: var(--text-secondary);
}

.card-detail {
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 50px;
}

.detail-value {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.6;
}

.detail-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.detail-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  gap: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 300px;
}
</style>
