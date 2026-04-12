<template>
  <div class="coverage-panel">
    <div class="coverage-title">📊 知识点覆盖度</div>
    <div class="coverage-list">
      <div
        v-for="item in coverageItems"
        :key="item.knowledgePoint"
        class="coverage-item"
        :class="coverageClass(item.coverageRate)"
        @click="handleItemClick(item)"
      >
        <div class="coverage-item-header">
          <span class="coverage-name">{{ item.knowledgePoint }}</span>
          <span class="coverage-rate">{{ item.coverageRate }}%</span>
        </div>
        <div class="coverage-bar">
          <div class="coverage-fill" :style="{ width: item.coverageRate + '%' }"></div>
        </div>
        <div class="coverage-meta">
          <span>{{ item.coveredCount }}/{{ item.suggestedCount }} 题</span>
          <span v-if="item.coverageRate < 50" class="coverage-warning-text">⚠ 需补充</span>
        </div>
      </div>
    </div>
    <div v-if="coverageItems.length === 0" class="coverage-empty">
      生成试卷后自动展示覆盖度
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoverageItem } from '../types'

defineProps<{
  coverageItems: CoverageItem[]
}>()

const emit = defineEmits<{
  supplement: [knowledgePoint: string]
}>()

function coverageClass(rate: number): string {
  if (rate >= 80) return 'coverage-good'
  if (rate >= 50) return 'coverage-warning'
  return 'coverage-danger'
}

function handleItemClick(item: CoverageItem) {
  if (item.coverageRate < 80) {
    emit('supplement', item.knowledgePoint)
  }
}
</script>

<style scoped>
.coverage-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 12px;
  width: 200px;
  flex-shrink: 0;
}

.coverage-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.coverage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coverage-item {
  padding: 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.coverage-item:hover {
  background: var(--bg-tertiary);
}

.coverage-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.coverage-name {
  font-size: 11px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.coverage-rate {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.coverage-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.coverage-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.coverage-good .coverage-fill {
  background: #52c41a;
}

.coverage-warning .coverage-fill {
  background: #faad14;
}

.coverage-danger .coverage-fill {
  background: #ff4d4f;
}

.coverage-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: var(--text-tertiary);
}

.coverage-warning-text {
  color: #ff4d4f;
}

.coverage-empty {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px 0;
}
</style>
