<template>
  <div class="clarify-card">
    <div class="clarify-text" v-html="formattedMessage"></div>
    <div v-if="quickOptions" class="clarify-options">
      <div v-for="(options, field) in quickOptions" :key="field" class="clarify-field">
        <div class="clarify-field-label">{{ fieldLabels[field as string] || field }}</div>
        <div class="clarify-field-options">
          <button
            v-for="opt in options"
            :key="opt"
            class="clarify-option-btn"
            :class="{ 'clarify-option-btn--active': selectedOptions[field as string] === opt }"
            @click="selectOption(field as string, opt)"
          >
            {{ opt }}
          </button>
        </div>
      </div>
    </div>
    <div class="clarify-actions">
      <el-button size="small" type="primary" @click="handleConfirm" :disabled="!canConfirm">
        确认
      </el-button>
      <el-input
        v-model="customInput"
        size="small"
        placeholder="或直接输入补充信息..."
        @keydown.enter="handleCustomSubmit"
        class="clarify-custom-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ClarifyResponse } from '../api'

const props = defineProps<{
  clarify: ClarifyResponse
}>()

const emit = defineEmits<{
  confirm: [selections: Record<string, string>]
  customInput: [text: string]
}>()

const selectedOptions = ref<Record<string, string>>({})
const customInput = ref('')

const fieldLabels: Record<string, string> = {
  subject: '学科',
  grade: '年级',
  textbookVersion: '教材版本',
  scope: '考试范围',
  scene: '试卷场景'
}

const formattedMessage = computed(() => {
  return props.clarify.message.replace(/\n/g, '<br>')
})

const canConfirm = computed(() => {
  return props.clarify.missingFields.length === 0 ||
    props.clarify.missingFields.every(f => selectedOptions.value[f])
})

function selectOption(field: string, value: string) {
  selectedOptions.value[field] = value
}

function handleConfirm() {
  emit('confirm', { ...selectedOptions.value })
}

function handleCustomSubmit() {
  if (customInput.value.trim()) {
    emit('customInput', customInput.value.trim())
    customInput.value = ''
  }
}
</script>

<style scoped>
.clarify-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  padding: 14px;
  max-width: 400px;
}

.clarify-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.7;
  margin-bottom: 12px;
}

.clarify-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.clarify-field-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.clarify-field-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.clarify-option-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clarify-option-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.clarify-option-btn--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.clarify-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clarify-custom-input {
  flex: 1;
}

.clarify-custom-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  background: var(--bg-primary);
  box-shadow: none;
  border: 1px solid var(--border-primary);
}

.clarify-custom-input :deep(.el-input__inner) {
  font-size: 12px;
}
</style>
