<template>
  <div class="param-summary-card" :class="{ 'param-summary-card--expanded': isExpanded }">
    <div class="summary-desc" @click="toggleExpand">
      <div class="desc-text">{{ descriptionText }}</div>
      <div class="desc-guide">需要调整吗？您可以点击下方参数进行修改，或直接告诉我。</div>
      <button class="summary-toggle" :class="{ active: isExpanded }">
        {{ isExpanded ? '收起参数' : '展开参数 ▾' }}
      </button>
    </div>

    <transition name="summary-expand">
      <div v-if="isExpanded" class="summary-body">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { SUBJECT_LABELS, GRADE_LABELS, TEXTBOOK_VERSION_LABELS, SCENE_LABELS, LABELS, DIFFICULTY_LABELS } from '../types'
import type { ExamCondition } from '../types'

const props = defineProps<{
  condition: ExamCondition
}>()

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

const descriptionText = computed(() => {
  const subject = props.condition.subject ? SUBJECT_LABELS[props.condition.subject] : ''
  const grade = props.condition.grade ? GRADE_LABELS[props.condition.grade] : ''
  const version = props.condition.textbookVersion ? TEXTBOOK_VERSION_LABELS[props.condition.textbookVersion] : ''
  const scene = props.condition.scene ? SCENE_LABELS[props.condition.scene] : ''
  const count = props.condition.count || 15

  // 场景对应的称呼
  const sceneNoun: Record<string, string> = {
    homework: '练习题目',
    unitTest: '试卷',
    midterm: '试卷',
    final: '试卷',
    special: '训练题目',
    errorReview: '巩固题目',
    extension: '变体题目'
  }
  const noun = sceneNoun[scene || ''] || '试卷'

  // 题型描述
  const types = props.condition.questionTypes || []
  const typeNames = types.map(t => LABELS[t]).filter(Boolean)
  const typeStr = typeNames.length > 0 ? typeNames.join('、') : ''

  // 难度描述
  const ratio = props.condition.difficultyRatio
  let difficultyStr = ''
  if (ratio) {
    if (ratio.easy >= 60) difficultyStr = '以基础难度为主'
    else if (ratio.hard >= 40) difficultyStr = '以较高难度为主'
    else difficultyStr = '难度适中'
  } else if (props.condition.difficulty) {
    difficultyStr = DIFFICULTY_LABELS[props.condition.difficulty] === '简单' ? '以基础难度为主'
      : DIFFICULTY_LABELS[props.condition.difficulty] === '困难' ? '以较高难度为主'
      : '难度适中'
  }

  // 章节描述
  const chapters = props.condition.scope?.chapters || []
  const chapterStr = chapters.length > 0
    ? `覆盖${chapters.length > 2 ? chapters.slice(0, 2).join('、') + '等' : chapters.join('、')}章节`
    : ''

  // 拼接自然语言
  const parts: string[] = []
  parts.push(`我将为您生成一份${grade}${subject}${version ? '（' + version + '）' : ''}${scene}${noun}，`)
  parts.push(`共 ${count} 道题。`)

  const details: string[] = []
  if (typeStr) details.push(`包含${typeStr}`)
  if (difficultyStr) details.push(difficultyStr)
  if (chapterStr) details.push(chapterStr)

  if (details.length > 0) {
    parts[parts.length - 1] = parts[parts.length - 1].replace('。', '')
    parts.push(`，${details.join('，')}。`)
  }

  return parts.join('')
})
</script>

<style scoped>
.param-summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  overflow: hidden;
}

.summary-desc {
  padding: 12px 14px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.summary-desc:hover {
  background: var(--bg-tertiary);
}

.desc-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
}

.desc-guide {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.summary-toggle {
  display: inline-block;
  margin-top: 8px;
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.summary-toggle:hover,
.summary-toggle.active {
  border-color: var(--accent);
  color: var(--accent);
}

.summary-body {
  padding: 0 14px 14px;
  border-top: 1px solid var(--border-secondary);
}

.summary-expand-enter-active {
  transition: all 0.2s ease-out;
  max-height: 600px;
  overflow: hidden;
}

.summary-expand-leave-active {
  transition: all 0.15s ease-in;
  max-height: 600px;
  overflow: hidden;
}

.summary-expand-enter-from,
.summary-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
