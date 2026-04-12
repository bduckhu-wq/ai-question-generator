<template>
  <div class="chapter-select">
    <div class="chapter-select-label">考试范围</div>
    <div class="chapter-options">
      <label
        v-for="chapter in chapters"
        :key="chapter"
        class="chapter-option"
        :class="{ 'chapter-option--active': modelValue.includes(chapter) }"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(chapter)"
          @change="toggleChapter(chapter)"
          class="chapter-checkbox"
        />
        <span class="chapter-name">{{ chapter }}</span>
      </label>
    </div>
    <div v-if="chapters.length === 0" class="chapter-empty">
      请先选择学科、年级和教材版本
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CHAPTER_OPTIONS } from '../types'
import type { Subject, Grade, TextbookVersion } from '../types'

const props = defineProps<{
  modelValue: string[]
  subject?: Subject
  grade?: Grade
  textbookVersion?: TextbookVersion
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const chapters = computed(() => {
  if (!props.subject || !props.grade) return []
  const version = props.textbookVersion || 'pep'
  const key = `${props.subject}-${props.grade}-${version}`
  return CHAPTER_OPTIONS[key] || []
})

function toggleChapter(chapter: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(chapter)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(chapter)
  }
  emit('update:modelValue', current)
}
</script>

<style scoped>
.chapter-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chapter-select-label {
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
}

.chapter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chapter-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
  font-size: 12px;
  color: var(--text-secondary);
}

.chapter-option:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chapter-option--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.chapter-option--active:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: #fff;
}

.chapter-checkbox {
  display: none;
}

.chapter-name {
  font-size: 12px;
}

.chapter-empty {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 8px 0;
}
</style>
