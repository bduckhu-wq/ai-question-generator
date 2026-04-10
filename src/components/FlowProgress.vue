<template>
  <div class="flow-progress">
    <div
      v-for="(s, index) in steps"
      :key="s.key"
      class="flow-step"
      :class="{ active: currentIndex === index, completed: currentIndex > index, pending: currentIndex < index }"
    >
      <div class="flow-node">
        <span v-if="currentIndex > index" class="flow-check">✓</span>
        <span v-else class="flow-dot"></span>
      </div>
      <span class="flow-label">{{ s.label }}</span>
      <div v-if="index < steps.length - 1" class="flow-line" :class="{ active: currentIndex > index }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ currentStep: 'init' | 'confirm' | 'generating' | 'done' }>()
const stepOrder = ['init', 'confirm', 'generating', 'done'] as const
const steps = [
  { key: 'init', label: '选择场景' },
  { key: 'confirm', label: '配置参数' },
  { key: 'generating', label: '生成试卷' },
  { key: 'done', label: '编辑调整' }
]
const currentIndex = computed(() => stepOrder.indexOf(props.currentStep))
</script>

<style scoped>
.flow-progress { display: flex; align-items: center; padding: 12px 0; gap: 0; }
.flow-step { display: flex; align-items: center; gap: 6px; position: relative; }
.flow-node {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.3s ease;
}
.flow-step.completed .flow-node { background: var(--accent); }
.flow-step.active .flow-node { background: var(--accent); box-shadow: 0 0 0 3px rgba(17,17,17,0.15); }
.flow-step.pending .flow-node { background: var(--bg-tertiary); border: 1.5px solid var(--border-primary); }
.flow-check { color: #fff; font-size: 11px; font-weight: 700; line-height: 1; }
.flow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-quaternary); }
.flow-label { font-size: 12px; white-space: nowrap; transition: color 0.3s ease; }
.flow-step.completed .flow-label { color: var(--text-tertiary); }
.flow-step.active .flow-label { color: var(--text-primary); font-weight: 600; }
.flow-step.pending .flow-label { color: var(--text-quaternary); }
.flow-line { width: 32px; height: 1.5px; background: var(--border-primary); margin: 0 8px; flex-shrink: 0; transition: background 0.3s ease; }
.flow-line.active { background: var(--accent); }
</style>
