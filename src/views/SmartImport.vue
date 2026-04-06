<template>
  <div class="smart-import-page">
    <div class="page-header">
      <span class="page-title">智能导入</span>
      <span class="page-desc">上传已有题目，AI 自动识别并数字化</span>
    </div>

    <div class="import-content">
      <!-- 上传区域 -->
      <div v-if="step === 'upload'" class="upload-section">
        <el-upload
          class="upload-area"
          drag
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          accept="image/*,.pdf,.doc,.docx"
        >
          <div class="upload-inner">
            <div class="upload-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 28V12M20 12L14 18M20 12L26 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 26V30C8 31.1046 8.89543 32 10 32H30C31.1046 32 32 31.1046 32 30V26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="upload-text">拖拽文件到此处，或 <em>点击上传</em></div>
            <div class="upload-hint">支持拍照、截图、PDF、Word 文档</div>
          </div>
        </el-upload>

        <!-- 示例图片 -->
        <div class="sample-section">
          <div class="sample-label">或使用示例图片体验：</div>
          <div class="sample-list">
            <div v-for="sample in samples" :key="sample.id" class="sample-card" @click="handleSampleSelect(sample)">
              <span class="sample-name">{{ sample.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 识别推理过程 -->
      <div v-if="step === 'recognizing'" class="recognizing-section">
        <ReasoningSteps
          title="AI 智能识别过程"
          :steps="reasoningSteps"
          :is-running="isRecognizing"
          :is-completed="isRecognizeCompleted"
        />
      </div>

      <!-- 识别结果 -->
      <div v-if="step === 'result'" class="result-section">
        <!-- 保留推理步骤（可折叠查看） -->
        <div class="reasoning-collapsed" v-if="reasoningSteps.length > 0">
          <ReasoningSteps
            title="AI 智能识别过程"
            :steps="reasoningSteps"
            :is-running="false"
            :is-completed="true"
          />
        </div>

        <div class="result-header">
          <div class="result-info">
            <span class="result-title">识别完成</span>
            <span class="result-count">共识别 {{ recognizedQuestions.length }} 道题目</span>
          </div>
          <div class="result-actions">
            <el-button @click="step = 'upload'">重新上传</el-button>
            <el-button type="primary" @click="handleAddToBank">全部入题库</el-button>
            <el-button @click="handleAdaptAll">批量改编</el-button>
          </div>
        </div>

        <div class="result-list">
          <div v-for="(q, idx) in recognizedQuestions" :key="idx" class="result-item">
            <div class="result-item-header">
              <span class="result-item-num">第 {{ idx + 1 }} 题</span>
              <el-tag size="small">{{ LABELS[q.type] }}</el-tag>
              <el-tag size="small">{{ DIFFICULTY_LABELS[q.difficulty] }}</el-tag>
            </div>
            <div class="result-item-content">
              <el-input v-model="q.content" type="textarea" :rows="2" size="small" />
              <div v-if="q.options && q.options.length" class="result-item-options">
                <div v-for="(opt, oIdx) in q.options" :key="oIdx" class="option-row">
                  <el-input v-model="q.options[oIdx].content" size="small" :placeholder="opt.label">
                    <template #prepend>{{ opt.label }}</template>
                  </el-input>
                </div>
              </div>
              <div class="result-item-meta">
                <el-input v-model="q.answer" size="small" placeholder="答案" style="width: 120px">
                  <template #prepend>答案</template>
                </el-input>
                <el-input v-model="q.analysis" size="small" placeholder="解析" style="flex: 1; margin-left: 8px">
                  <template #prepend>解析</template>
                </el-input>
              </div>
            </div>
            <div class="result-item-actions">
              <el-button text size="small" @click="handleAdaptOne(idx)">改编</el-button>
              <el-button text size="small" @click="handleAddOneToBank(idx)">入题库</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { LABELS, DIFFICULTY_LABELS } from '../types'
import type { Question, ReasoningStep } from '../types'
import ReasoningSteps from '../components/ReasoningSteps.vue'

const step = ref<'upload' | 'recognizing' | 'result'>('upload')
const isRecognizing = ref(false)
const isRecognizeCompleted = ref(false)
const reasoningSteps = ref<ReasoningStep[]>([])

const samples = [
  { id: 's1', name: '数学选择题', icon: '📐' },
  { id: 's2', name: '英语阅读理解', icon: '🔤' },
  { id: 's3', name: '物理填空题', icon: '⚡' }
]

const recognizedQuestions = ref<Question[]>([])

function handleFileChange(file: any) {
  simulateOCR()
}

function handleSampleSelect(sample: any) {
  simulateOCR()
}

async function simulateOCR() {
  step.value = 'recognizing'
  isRecognizing.value = true
  isRecognizeCompleted.value = false

  // 初始化推理步骤
  reasoningSteps.value = [
    {
      id: 'preprocess',
      title: '图像预处理',
      description: '正在分析上传的文件...',
      status: 'running',
      startedAt: new Date().toISOString()
    },
    {
      id: 'detect',
      title: '题目区域检测',
      status: 'pending'
    },
    {
      id: 'recognize',
      title: '文字识别 (OCR)',
      status: 'pending'
    },
    {
      id: 'structure',
      title: '题目结构化解析',
      status: 'pending'
    }
  ]

  // 步骤 1: 图像预处理
  const t1 = Date.now()
  await new Promise(r => setTimeout(r, 800))
  reasoningSteps.value[0] = {
    ...reasoningSteps.value[0],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t1,
    detail: '已完成图像预处理，包括去噪、倾斜校正、二值化等操作。',
    detailItems: [
      '文件格式：PNG 图片',
      '分辨率：1920 × 1080',
      '预处理：去噪 + 倾斜校正 + 对比度增强',
      '检测到 3 个候选题目区域'
    ]
  }

  // 步骤 2: 题目区域检测
  reasoningSteps.value[1] = {
    ...reasoningSteps.value[1],
    status: 'running',
    description: '正在检测题目边界...',
    startedAt: new Date().toISOString()
  }
  const t2 = Date.now()
  await new Promise(r => setTimeout(r, 600))
  reasoningSteps.value[1] = {
    ...reasoningSteps.value[1],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t2,
    detail: '成功检测到 3 个题目区域，已裁剪并排序。',
    detailItems: [
      '区域 1：选择题（置信度 98%）',
      '区域 2：选择题（置信度 95%）',
      '区域 3：填空题（置信度 92%）'
    ]
  }

  // 步骤 3: OCR 识别
  reasoningSteps.value[2] = {
    ...reasoningSteps.value[2],
    status: 'running',
    description: '正在识别文字内容...',
    startedAt: new Date().toISOString()
  }
  const t3 = Date.now()
  await new Promise(r => setTimeout(r, 1200))
  reasoningSteps.value[2] = {
    ...reasoningSteps.value[2],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t3,
    detail: '文字识别完成，平均置信度 96.3%。',
    detailItems: [
      '识别字符数：287 个',
      '平均置信度：96.3%',
      '涉及学科：数学',
      '涉及知识点：函数、导数、定义域'
    ]
  }

  // 步骤 4: 结构化解析
  reasoningSteps.value[3] = {
    ...reasoningSteps.value[3],
    status: 'running',
    description: '正在解析题目结构...',
    startedAt: new Date().toISOString()
  }
  const t4 = Date.now()
  await new Promise(r => setTimeout(r, 800))

  recognizedQuestions.value = [
    {
      id: 'import-1',
      type: 'choice',
      difficulty: 'medium',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['函数'],
      content: '已知函数 f(x) = 2x + 1，则 f(0) 的值为（  ）',
      options: [
        { label: 'A', content: '0' },
        { label: 'B', content: '1' },
        { label: 'C', content: '2' },
        { label: 'D', content: '3' }
      ],
      answer: 'B',
      analysis: 'f(0) = 2×0 + 1 = 1',
      score: 5,
      source: 'import'
    },
    {
      id: 'import-2',
      type: 'choice',
      difficulty: 'easy',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['函数', '定义域'],
      content: '函数 y = √(x - 2) 的定义域是（  ）',
      options: [
        { label: 'A', content: 'x ≥ 2' },
        { label: 'B', content: 'x > 2' },
        { label: 'C', content: 'x ≤ 2' },
        { label: 'D', content: 'x < 2' }
      ],
      answer: 'A',
      analysis: '需要 x - 2 ≥ 0，即 x ≥ 2',
      score: 5,
      source: 'import'
    },
    {
      id: 'import-3',
      type: 'fillBlank',
      difficulty: 'medium',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['导数'],
      content: "函数 f(x) = sin x 的导数 f'(x) = ______。",
      answer: 'cos x',
      analysis: "(sin x)' = cos x",
      score: 5,
      source: 'import'
    }
  ]

  reasoningSteps.value[3] = {
    ...reasoningSteps.value[3],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t4,
    detail: `已将识别结果结构化为 ${recognizedQuestions.value.length} 道标准题目格式。`,
    detailItems: [
      `解析出 ${recognizedQuestions.value.length} 道题目`,
      '题型识别：2 道选择题 + 1 道填空题',
      '难度评估：1 道简单 + 2 道中等',
      '答案与解析已自动生成'
    ]
  }

  isRecognizing.value = false
  isRecognizeCompleted.value = true
  step.value = 'result'
}

function handleAddToBank() {
  ElMessage.success(`已将 ${recognizedQuestions.value.length} 道题目添加到题库`)
}

function handleAddOneToBank(idx: number) {
  ElMessage.success('已添加到题库')
}

function handleAdaptAll() {
  ElMessage.info('批量改编功能（原型演示）')
}

function handleAdaptOne(idx: number) {
  ElMessage.info('改编功能（原型演示）')
}
</script>

<style scoped>
.smart-import-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.page-header {
  padding: 16px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: 12px;
}

.import-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 上传区域 */
.upload-section {
  max-width: 600px;
  margin: 0 auto;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  border-radius: 8px;
  padding: 40px;
  border: 2px dashed var(--border-primary);
  transition: border-color var(--transition-fast);
  background: var(--bg-primary);
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--accent);
}

.upload-inner {
  text-align: center;
}

.upload-icon {
  margin-bottom: 12px;
  color: var(--text-quaternary);
  display: flex;
  justify-content: center;
}

.upload-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.upload-text em {
  color: var(--text-primary);
  font-style: normal;
  font-weight: 500;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

/* 示例 */
.sample-section {
  margin-top: 24px;
}

.sample-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.sample-list {
  display: flex;
  gap: 12px;
}

.sample-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sample-card:hover {
  border-color: var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.sample-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 识别过程 */
.recognizing-section {
  max-width: 600px;
  margin: 0 auto;
}

/* 识别结果 */
.result-section {
  max-width: 800px;
  margin: 0 auto;
}

.reasoning-collapsed {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 16px;
}

.result-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.result-item-num {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.result-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-row {
  display: flex;
}

.result-item-meta {
  display: flex;
  align-items: center;
}

.result-item-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  gap: 8px;
}
</style>
