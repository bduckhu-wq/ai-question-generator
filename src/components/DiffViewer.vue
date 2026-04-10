<template>
  <div class="diff-viewer">
    <div class="diff-header">
      <span class="diff-title">版本对比</span>
    </div>
    <div class="diff-columns">
      <div class="diff-col">
        <div class="diff-col-label">当前版本</div>
        <div class="diff-content">{{ currentText }}</div>
      </div>
      <div class="diff-col">
        <div class="diff-col-label diff-col-label--old">历史版本</div>
        <div class="diff-content">{{ oldText }}</div>
      </div>
    </div>
    <div class="diff-actions">
      <el-button size="small" type="primary" @click="$emit('restore')">恢复此版本</el-button>
      <el-button size="small" @click="$emit('close')">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '../types'
const props = defineProps<{ currentQuestion: Question; oldQuestion: Question }>()
defineEmits<{ restore: []; close: [] }>()
const currentText = computed(() => {
  const q = props.currentQuestion
  let text = q.content
  if (q.options?.length) text += '\n' + q.options.map(o => `${o.label}. ${o.content}`).join('\n')
  text += `\n答案：${q.answer}`
  return text
})
const oldText = computed(() => {
  const q = props.oldQuestion
  let text = q.content
  if (q.options?.length) text += '\n' + q.options.map(o => `${o.label}. ${o.content}`).join('\n')
  text += `\n答案：${q.answer}`
  return text
})
</script>

<style scoped>
.diff-viewer { border: 1px solid var(--border-primary); border-radius: 8px; overflow: hidden; }
.diff-header { padding: 8px 12px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-primary); }
.diff-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.diff-columns { display: flex; gap: 0; }
.diff-col { flex: 1; padding: 12px; border-right: 1px solid var(--border-primary); }
.diff-col:last-child { border-right: none; }
.diff-col-label { font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--border-secondary); }
.diff-col-label--old { color: var(--color-warning); }
.diff-content { font-size: 12px; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
.diff-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--border-primary); background: var(--bg-tertiary); }
</style>
