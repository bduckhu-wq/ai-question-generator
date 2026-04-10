<template>
  <div class="version-panel">
    <div class="version-panel-header">
      <span class="version-panel-title">历史版本</span>
      <button class="version-panel-close" @click="$emit('close')">✕</button>
    </div>
    <div class="version-list" v-if="versions.length > 0">
      <div
        v-for="(ver, index) in reversedVersions"
        :key="index"
        class="version-card"
        :class="{ active: selectedVersionIndex === (versions.length - 1 - index) }"
        @click="selectVersion(versions.length - 1 - index)"
      >
        <div class="version-card-header">
          <span class="version-action">{{ ver.action }}</span>
          <span class="version-time">{{ formatRelativeTime(ver.timestamp) }}</span>
        </div>
        <div class="version-preview">{{ ver.question.content.substring(0, 60) }}{{ ver.question.content.length > 60 ? '...' : '' }}</div>
        <span v-if="versions.length - 1 - index === versions.length - 1" class="version-current-badge">当前</span>
      </div>
    </div>
    <div v-else class="version-empty">暂无历史版本</div>
    <transition name="slide-up">
      <DiffViewer
        v-if="selectedVersionIndex !== null && currentQuestion"
        :current-question="currentQuestion"
        :old-question="versions[selectedVersionIndex].question"
        @restore="handleRestore"
        @close="selectedVersionIndex = null"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { QuestionVersion, Question } from '../types'
import DiffViewer from './DiffViewer.vue'
const props = defineProps<{ versions: QuestionVersion[]; currentQuestion: Question | null }>()
const emit = defineEmits<{ restore: [versionIndex: number]; close: [] }>()
const selectedVersionIndex = ref<number | null>(null)
const reversedVersions = computed(() => [...props.versions].reverse())
function selectVersion(index: number) {
  selectedVersionIndex.value = selectedVersionIndex.value === index ? null : index
}
function handleRestore() {
  if (selectedVersionIndex.value !== null) {
    emit('restore', selectedVersionIndex.value)
    selectedVersionIndex.value = null
  }
}
function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}
</script>

<style scoped>
.version-panel { width: 320px; border-left: 1px solid var(--border-primary); background: var(--bg-primary); display: flex; flex-direction: column; max-height: 100%; }
.version-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid var(--border-primary); flex-shrink: 0; }
.version-panel-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.version-panel-close { width: 24px; height: 24px; border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.version-panel-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.version-list { flex: 1; overflow-y: auto; padding: 8px; }
.version-card { padding: 10px; border: 1px solid var(--border-primary); border-radius: 6px; margin-bottom: 6px; cursor: pointer; transition: all var(--transition-fast); position: relative; }
.version-card:hover { border-color: var(--accent); background: var(--bg-secondary); }
.version-card.active { border-color: var(--accent); background: var(--bg-secondary); }
.version-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.version-action { font-size: 12px; font-weight: 500; color: var(--text-primary); }
.version-time { font-size: 11px; color: var(--text-tertiary); }
.version-preview { font-size: 11px; color: var(--text-tertiary); line-height: 1.5; }
.version-current-badge { position: absolute; top: 8px; right: 8px; font-size: 10px; padding: 1px 6px; border-radius: 3px; background: var(--accent); color: #fff; }
.version-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--text-tertiary); }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(10px); }
</style>
