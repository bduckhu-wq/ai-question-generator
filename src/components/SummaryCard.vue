<template>
  <div class="summary-card">
    <div class="summary-title">试卷生成完成</div>
    <div class="summary-stats">
      <div class="summary-stat-row">
        <span class="stat-label">总题数</span>
        <span class="stat-value">{{ summary.totalQuestions }} 道</span>
      </div>
      <div class="summary-stat-row summary-indent">
        <span class="stat-label">题库匹配</span>
        <span class="stat-value">{{ summary.bankQuestions }} 道</span>
      </div>
      <div class="summary-stat-row summary-indent">
        <span class="stat-label">AI 生成</span>
        <span class="stat-value">{{ summary.aiQuestions }} 道</span>
      </div>
    </div>
    <div class="summary-section">
      <div class="summary-section-title">难度分布</div>
      <div class="difficulty-bar" v-for="d in difficultyBars" :key="d.key">
        <span class="difficulty-name">{{ d.label }}</span>
        <div class="difficulty-track">
          <div class="difficulty-fill" :style="{ width: d.percent + '%' }"></div>
        </div>
        <span class="difficulty-count">{{ d.count }}道</span>
        <span class="difficulty-percent">{{ d.percent }}%</span>
      </div>
    </div>
    <div class="summary-meta">
      <span>满分：{{ summary.totalScore }} 分</span>
      <span class="meta-divider">|</span>
      <span>时长：{{ summary.duration }} 分钟</span>
    </div>
    <div class="summary-action">
      <button class="view-paper-btn" @click="$emit('viewPaper')">查看试卷 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExamSummary } from '../types'
const props = defineProps<{ summary: ExamSummary }>()
defineEmits<{ viewPaper: [] }>()
const difficultyBars = computed(() => {
  const dist = props.summary.difficultyDistribution
  const total = props.summary.totalQuestions || 1
  return [
    { key: 'easy', label: '简单', count: dist.easy, percent: Math.round(dist.easy / total * 100) },
    { key: 'medium', label: '中等', count: dist.medium, percent: Math.round(dist.medium / total * 100) },
    { key: 'hard', label: '困难', count: dist.hard, percent: Math.round(dist.hard / total * 100) }
  ]
})
</script>

<style scoped>
.summary-card { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 16px; min-width: 280px; max-width: 340px; }
.summary-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.summary-stats { margin-bottom: 14px; }
.summary-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 13px; }
.summary-indent { padding-left: 16px; }
.stat-label { color: var(--text-secondary); }
.stat-value { color: var(--text-primary); font-weight: 500; }
.summary-section { margin-bottom: 14px; }
.summary-section-title { font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
.difficulty-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
.difficulty-name { width: 32px; color: var(--text-secondary); flex-shrink: 0; }
.difficulty-track { flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
.difficulty-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.5s ease; }
.difficulty-count { color: var(--text-secondary); width: 36px; text-align: right; flex-shrink: 0; }
.difficulty-percent { color: var(--text-tertiary); width: 32px; text-align: right; flex-shrink: 0; }
.summary-meta { font-size: 12px; color: var(--text-secondary); padding-top: 10px; border-top: 1px solid var(--border-secondary); margin-bottom: 12px; }
.meta-divider { margin: 0 8px; color: var(--border-primary); }
.summary-action { text-align: right; }
.view-paper-btn { padding: 6px 16px; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; transition: background var(--transition-fast); }
.view-paper-btn:hover { opacity: 0.85; }
</style>
