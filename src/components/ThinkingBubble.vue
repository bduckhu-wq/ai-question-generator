<template>
  <div class="thinking-bubble" :class="{ collapsed, completed, cancelled }">
    <div class="thinking-header" @click="toggleCollapse">
      <span class="thinking-icon">💭</span>
      <span class="thinking-label">
        <template v-if="cancelled">已取消 · 思考了 {{ formattedDuration }}</template>
        <template v-else-if="completed">已思考 {{ formattedDuration }}，点击展开查看推理过程</template>
        <template v-else>AI 正在思考...</template>
      </span>
      <span v-if="!completed && !cancelled" class="thinking-timer">{{ elapsedDisplay }}</span>
      <button
        v-if="!completed && !cancelled"
        class="thinking-cancel"
        @click.stop="emit('cancel')"
      >取消</button>
      <span class="thinking-toggle">{{ collapsed ? '展开' : '收起' }}</span>
    </div>
    <transition name="thinking-expand">
      <div v-show="!collapsed" class="thinking-content">
        <div class="thinking-text" v-html="renderedText"></div>
        <span v-if="!completed && !cancelled" class="thinking-cursor">▌</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  thinkingText: string
  isThinking: boolean
  isThinkingCompleted: boolean
  isThinkingCancelled?: boolean
  thinkingDuration: number
}>()

const emit = defineEmits<{
  cancel: []
}>()

const collapsed = ref(false)
const completed = computed(() => props.isThinkingCompleted)
const cancelled = computed(() => props.isThinkingCancelled)

const elapsed = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (props.isThinking) startTimer()
})
onUnmounted(() => stopTimer())

watch(() => props.isThinking, (val) => {
  if (val) { elapsed.value = 0; startTimer() }
  else stopTimer()
})

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => { elapsed.value++ }, 1000)
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

const elapsedDisplay = computed(() => {
  if (elapsed.value < 60) return `${elapsed.value}s`
  return `${Math.floor(elapsed.value / 60)}:${String(elapsed.value % 60).padStart(2, '0')}`
})

const formattedDuration = computed(() => {
  const ms = props.thinkingDuration
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
})

const renderedText = computed(() => {
  return props.thinkingText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
})

watch(completed, (val) => {
  if (val) setTimeout(() => { collapsed.value = true }, 500)
})

function toggleCollapse() { collapsed.value = !collapsed.value }
</script>

<style scoped>
.thinking-bubble {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
}
.thinking-bubble.collapsed { cursor: pointer; }
.thinking-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; cursor: pointer; user-select: none;
  transition: background var(--transition-fast);
}
.thinking-header:hover { background: var(--bg-hover); }
.thinking-icon { font-size: 14px; flex-shrink: 0; }
.thinking-label { flex: 1; font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
.thinking-timer { font-size: 12px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; flex-shrink: 0; }
.thinking-cancel {
  font-size: 12px; color: var(--text-tertiary); background: none; border: none;
  cursor: pointer; padding: 2px 8px; border-radius: 4px;
  transition: all var(--transition-fast); flex-shrink: 0;
}
.thinking-cancel:hover { color: var(--color-danger); background: #fff2f0; }
.thinking-toggle {
  font-size: 12px; color: var(--text-tertiary); flex-shrink: 0;
  padding: 2px 8px; border-radius: 4px; transition: all var(--transition-fast);
}
.thinking-toggle:hover { color: var(--text-primary); background: var(--bg-secondary); }
.thinking-content { padding: 0 14px 14px; max-height: 400px; overflow-y: auto; }
.thinking-text { font-size: 13px; line-height: 1.8; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; }
.thinking-cursor { display: inline-block; color: var(--text-tertiary); animation: blink 1s step-end infinite; font-size: 14px; margin-left: 2px; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.thinking-expand-enter-active, .thinking-expand-leave-active { transition: all 0.3s ease; overflow: hidden; }
.thinking-expand-enter-from, .thinking-expand-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.thinking-expand-enter-to, .thinking-expand-leave-from { opacity: 1; max-height: 400px; }
.thinking-bubble.cancelled .thinking-label { color: var(--color-warning); }
</style>
