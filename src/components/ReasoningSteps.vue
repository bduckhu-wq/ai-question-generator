<template>
  <div class="reasoning-pipeline">
    <!-- 标题 -->
    <div class="pipeline-header">
      <span class="pipeline-title">{{ title }}</span>
      <span v-if="isCompleted" class="pipeline-badge completed">✓ 已完成</span>
      <span v-else-if="isRunning" class="pipeline-badge running">处理中...</span>
    </div>

    <!-- 步骤列表 -->
    <div class="pipeline-steps">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="step-item"
        :class="[step.status, { expanded: expandedSteps.has(step.id) }]"
      >
        <!-- 时间线连接器 -->
        <div class="step-timeline">
          <!-- 节点图标 -->
          <div class="step-node">
            <!-- 已完成 -->
            <template v-if="step.status === 'completed'">
              <svg class="node-icon check-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#52c41a" />
                <path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </template>
            <!-- 运行中 -->
            <template v-else-if="step.status === 'running'">
              <div class="node-spinner">
                <svg class="spinner-svg" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#e0e8ff" stroke-width="3"/>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#4361ee" stroke-width="3"
                    stroke-dasharray="80 50" stroke-linecap="round"/>
                </svg>
              </div>
            </template>
            <!-- 错误 -->
            <template v-else-if="step.status === 'error'">
              <svg class="node-icon error-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#f5222d" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </template>
            <!-- 等待中 -->
            <template v-else>
              <div class="node-pending">
                <div class="pending-dot"></div>
              </div>
            </template>
          </div>
          <!-- 连接线 -->
          <div v-if="index < steps.length - 1" class="step-connector" :class="{ active: step.status === 'completed' }"></div>
        </div>

        <!-- 步骤内容 -->
        <div class="step-content">
          <div class="step-main" @click="toggleExpand(step)">
            <div class="step-info">
              <span class="step-title" :class="step.status">{{ step.title }}</span>
              <span v-if="step.description && step.status === 'running'" class="step-desc">{{ step.description }}</span>
              <span v-if="step.status === 'completed' && step.duration" class="step-duration">{{ formatDuration(step.duration) }}</span>
            </div>
            <!-- 展开箭头（仅已完成且有详情的步骤） -->
            <div v-if="step.status === 'completed' && hasDetail(step)" class="step-expand-btn">
              <svg :class="{ rotated: expandedSteps.has(step.id) }" class="expand-arrow" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <!-- 展开详情 -->
          <transition name="expand">
            <div v-if="expandedSteps.has(step.id) && hasDetail(step)" class="step-detail">
              <!-- 详情文本 -->
              <div v-if="step.detail" class="detail-text">{{ step.detail }}</div>
              <!-- 详情列表 -->
              <div v-if="step.detailItems && step.detailItems.length" class="detail-list">
                <div v-for="(item, iIdx) in step.detailItems" :key="iIdx" class="detail-item">
                  <span class="detail-bullet">•</span>
                  <span class="detail-text">{{ item }}</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ReasoningStep } from '../types'

const props = defineProps<{
  title: string
  steps: ReasoningStep[]
  isRunning?: boolean
  isCompleted?: boolean
}>()

const expandedSteps = ref<Set<string>>(new Set())

function hasDetail(step: ReasoningStep): boolean {
  return !!(step.detail || (step.detailItems && step.detailItems.length > 0))
}

function toggleExpand(step: ReasoningStep) {
  if (!hasDetail(step)) return
  if (expandedSteps.value.has(step.id)) {
    expandedSteps.value.delete(step.id)
  } else {
    expandedSteps.value.add(step.id)
  }
  // 触发响应式更新
  expandedSteps.value = new Set(expandedSteps.value)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<style scoped>
.reasoning-pipeline {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px 18px;
  font-size: 13px;
}

/* 标题 */
.pipeline-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.pipeline-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.pipeline-badge {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.pipeline-badge.completed {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.pipeline-badge.running {
  background: #eef0ff;
  color: #4361ee;
  border: 1px solid #c4caff;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 步骤列表 */
.pipeline-steps {
  display: flex;
  flex-direction: column;
}

.step-item {
  display: flex;
  gap: 12px;
  position: relative;
}

/* 时间线 */
.step-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 28px;
}

.step-node {
  width: 28px;
  height: 28px;
  position: relative;
  z-index: 1;
}

.node-icon {
  width: 28px;
  height: 28px;
}

/* 旋转动画 */
.node-spinner {
  width: 28px;
  height: 28px;
  position: relative;
}

.spinner-svg {
  width: 28px;
  height: 28px;
  animation: spin 1.2s linear infinite;
  transform-origin: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 等待状态 */
.node-pending {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d9d9d9;
  border: 2px solid #e8e8e8;
}

/* 连接线 */
.step-connector {
  width: 2px;
  flex: 1;
  min-height: 12px;
  background: #e8e8e8;
  transition: background 0.3s;
}

.step-connector.active {
  background: #52c41a;
}

/* 步骤内容 */
.step-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 16px;
}

.step-item:last-child .step-content {
  padding-bottom: 0;
}

.step-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  cursor: default;
  min-height: 28px;
}

.step-main[style] {
  cursor: pointer;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  padding-top: 3px;
}

.step-title {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
}

.step-title.pending {
  color: #bfbfbf;
}

.step-title.running {
  color: var(--primary-color);
  font-weight: 600;
}

.step-title.completed {
  color: var(--text-primary);
}

.step-title.error {
  color: #f5222d;
}

.step-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  animation: desc-fade 0.3s ease-in;
}

@keyframes desc-fade {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-duration {
  font-size: 11px;
  color: var(--text-muted);
}

/* 展开按钮 */
.step-expand-btn {
  flex-shrink: 0;
  padding-top: 4px;
  cursor: pointer;
  color: #bfbfbf;
  transition: color 0.2s;
}

.step-expand-btn:hover {
  color: var(--primary-color);
}

.expand-arrow {
  width: 16px;
  height: 16px;
  transition: transform 0.25s ease;
}

.expand-arrow.rotated {
  transform: rotate(90deg);
}

/* 展开详情 */
.step-detail {
  margin-top: 8px;
  padding: 10px 12px;
  background: #f8f9fc;
  border-radius: 8px;
  border: 1px solid #eef0f5;
}

.detail-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.detail-bullet {
  color: var(--primary-color);
  flex-shrink: 0;
  margin-top: 1px;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
