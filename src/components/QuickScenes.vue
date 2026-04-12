<template>
  <div class="quick-scenes">
    <button
      v-for="scene in scenes"
      :key="scene.key"
      class="scene-chip"
      @click="selectScene(scene)"
    >
      <span class="scene-chip-main">{{ scene.icon }} {{ scene.label }}</span>
      <span v-if="scene.description" class="scene-chip-desc">{{ scene.description }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { QuestionType } from '../types'

interface QuickScene {
  key: string
  label: string
  icon: string
  description?: string
  defaults: {
    scene: 'homework' | 'unitTest' | 'midterm' | 'special'
    difficultyRatio: {
      easy: number
      medium: number
      hard: number
    }
    count: number
    questionTypes: QuestionType[]
  }
}

const props = defineProps<{
  scenes: QuickScene[]
}>()

const emit = defineEmits<{
  (e: 'select', scene: QuickScene): void
}>()

function selectScene(scene: QuickScene) {
  emit('select', scene)
}
</script>

<style scoped>
.quick-scenes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.scene-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 20px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.scene-chip-main {
  font-weight: 500;
}

.scene-chip-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.scene-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
