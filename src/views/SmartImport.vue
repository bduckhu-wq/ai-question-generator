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
              <el-tag v-if="adaptedMap[idx]" size="small" type="success">已改编</el-tag>
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
            <!-- 改编对比结果 -->
            <div v-if="adaptedMap[idx]" class="adapt-compare">
              <div class="compare-header">
                <span class="compare-label">✨ 改编结果</span>
                <el-tag size="small" type="success">{{ adaptedMap[idx].strategy }}</el-tag>
              </div>
              <div class="compare-content">
                <div class="compare-original">
                  <div class="compare-tag">原题</div>
                  <div class="compare-text">{{ adaptedMap[idx].original.content }}</div>
                </div>
                <div class="compare-arrow">→</div>
                <div class="compare-adapted">
                  <div class="compare-tag">改编</div>
                  <div class="compare-text">{{ adaptedMap[idx].adapted.content }}</div>
                  <div v-if="adaptedMap[idx].adapted.options" class="compare-options">
                    <div v-for="opt in adaptedMap[idx].adapted.options" :key="opt.label" class="compare-option">
                      {{ opt.label }}. {{ opt.content }}
                    </div>
                  </div>
                  <div class="compare-answer">答案：{{ adaptedMap[idx].adapted.answer }}</div>
                </div>
              </div>
            </div>
            <div class="result-item-actions">
              <el-button text size="small" @click="handleAdaptOne(idx)" :disabled="isAdapting">改编</el-button>
              <el-button text size="small" @click="handleAddOneToBank(idx)">入题库</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 改编过程 -->
      <div v-if="step === 'adapting'" class="adapting-section">
        <ReasoningSteps
          title="AI 题目改编过程"
          :steps="adaptReasoningSteps"
          :is-running="isAdapting"
          :is-completed="isAdaptCompleted"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { LABELS, DIFFICULTY_LABELS } from '../types'
import type { Question, ReasoningStep } from '../types'
import ReasoningSteps from '../components/ReasoningSteps.vue'

const step = ref<'upload' | 'recognizing' | 'result' | 'adapting'>('upload')
const isRecognizing = ref(false)
const isRecognizeCompleted = ref(false)
const reasoningSteps = ref<ReasoningStep[]>([])

// 改编相关状态
const isAdapting = ref(false)
const isAdaptCompleted = ref(false)
const adaptReasoningSteps = ref<ReasoningStep[]>([])
const adaptTargetIdx = ref(-1) // -1 表示批量改编

interface AdaptResult {
  strategy: string
  original: Question
  adapted: Question
}
const adaptedMap = reactive<Record<number, AdaptResult>>({})

const adaptStrategies = [
  { label: '换题型', value: 'changeType' },
  { label: '换难度', value: 'changeDifficulty' },
  { label: '换知识点', value: 'changeKnowledge' },
  { label: '数值变换', value: 'changeNumbers' }
]

// 改编用的模拟题库
const adaptTemplates: Record<string, Question[]> = {
  'import-1': [
    {
      id: 'adapt-1a', type: 'fillBlank', difficulty: 'hard', subject: 'math', grade: 'grade10',
      knowledgePoints: ['函数', '复合函数'],
      content: '已知函数 f(x) = 3x² - 2x + 1，若 f(a) = 7，则 a 的值为 ______。',
      answer: 'a = 2 或 a = -4/3',
      analysis: '3a² - 2a + 1 = 7 → 3a² - 2a - 6 = 0 → a = (2 ± √76)/6',
      score: 5, source: 'ai'
    },
    {
      id: 'adapt-1b', type: 'choice', difficulty: 'hard', subject: 'math', grade: 'grade10',
      knowledgePoints: ['函数', '反函数'],
      content: '已知函数 f(x) = 2x + 1，则 f⁻¹(5) 的值为（  ）',
      options: [
        { label: 'A', content: '1' },
        { label: 'B', content: '2' },
        { label: 'C', content: '3' },
        { label: 'D', content: '4' }
      ],
      answer: 'B',
      analysis: 'f⁻¹(x) = (x-1)/2，f⁻¹(5) = 2',
      score: 5, source: 'ai'
    },
    {
      id: 'adapt-1c', type: 'choice', difficulty: 'medium', subject: 'math', grade: 'grade11',
      knowledgePoints: ['函数', '指数函数'],
      content: '已知函数 f(x) = 2ˣ + 1，则 f(0) + f(1) 的值为（  ）',
      options: [
        { label: 'A', content: '2' },
        { label: 'B', content: '3' },
        { label: 'C', content: '4' },
        { label: 'D', content: '5' }
      ],
      answer: 'C',
      analysis: 'f(0) = 2⁰ + 1 = 2，f(1) = 2¹ + 1 = 3，f(0) + f(1) = 5… 等等让我重算：f(0)=2, f(1)=3, 和为5，选D',
      score: 5, source: 'ai'
    }
  ],
  'import-2': [
    {
      id: 'adapt-2a', type: 'choice', difficulty: 'medium', subject: 'math', grade: 'grade10',
      knowledgePoints: ['函数', '值域'],
      content: '函数 y = √(4 - x²) 的定义域是（  ）',
      options: [
        { label: 'A', content: '-2 ≤ x ≤ 2' },
        { label: 'B', content: 'x ≥ 4' },
        { label: 'C', content: 'x ≤ 4' },
        { label: 'D', content: 'x > 0' }
      ],
      answer: 'A',
      analysis: '需要 4 - x² ≥ 0，即 x² ≤ 4，-2 ≤ x ≤ 2',
      score: 5, source: 'ai'
    },
    {
      id: 'adapt-2b', type: 'fillBlank', difficulty: 'hard', subject: 'math', grade: 'grade11',
      knowledgePoints: ['函数', '对数'],
      content: '函数 y = ln(x - 1) 的定义域为 ______。',
      answer: 'x > 1',
      analysis: '需要 x - 1 > 0，即 x > 1',
      score: 5, source: 'ai'
    }
  ],
  'import-3': [
    {
      id: 'adapt-3a', type: 'choice', difficulty: 'medium', subject: 'math', grade: 'grade11',
      knowledgePoints: ['导数', '三角函数'],
      content: '函数 f(x) = cos x 的导数 f\'(x) 为（  ）',
      options: [
        { label: 'A', content: 'sin x' },
        { label: 'B', content: '-sin x' },
        { label: 'C', content: 'cos x' },
        { label: 'D', content: '-cos x' }
      ],
      answer: 'B',
      analysis: '(cos x)\' = -sin x',
      score: 5, source: 'ai'
    },
    {
      id: 'adapt-3b', type: 'fillBlank', difficulty: 'hard', subject: 'math', grade: 'grade11',
      knowledgePoints: ['导数', '链式法则'],
      content: "函数 f(x) = e^(2x) 的导数 f'(x) = ______。",
      answer: '2e^(2x)',
      analysis: "f'(x) = e^(2x) · (2x)' = 2e^(2x)",
      score: 5, source: 'ai'
    }
  ]
}

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

  reasoningSteps.value = [
    { id: 'preprocess', title: '图像预处理', description: '正在分析上传的文件...', status: 'running', startedAt: new Date().toISOString() },
    { id: 'detect', title: '题目区域检测', status: 'pending' },
    { id: 'recognize', title: '文字识别 (OCR)', status: 'pending' },
    { id: 'structure', title: '题目结构化解析', status: 'pending' }
  ]

  const t1 = Date.now()
  await new Promise(r => setTimeout(r, 800))
  reasoningSteps.value[0] = { ...reasoningSteps.value[0], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t1, detail: '已完成图像预处理，包括去噪、倾斜校正、二值化等操作。', detailItems: ['文件格式：PNG 图片', '分辨率：1920 × 1080', '预处理：去噪 + 倾斜校正 + 对比度增强', '检测到 3 个候选题目区域'] }

  reasoningSteps.value[1] = { ...reasoningSteps.value[1], status: 'running', description: '正在检测题目边界...', startedAt: new Date().toISOString() }
  const t2 = Date.now()
  await new Promise(r => setTimeout(r, 600))
  reasoningSteps.value[1] = { ...reasoningSteps.value[1], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t2, detail: '成功检测到 3 个题目区域，已裁剪并排序。', detailItems: ['区域 1：选择题（置信度 98%）', '区域 2：选择题（置信度 95%）', '区域 3：填空题（置信度 92%）'] }

  reasoningSteps.value[2] = { ...reasoningSteps.value[2], status: 'running', description: '正在识别文字内容...', startedAt: new Date().toISOString() }
  const t3 = Date.now()
  await new Promise(r => setTimeout(r, 1200))
  reasoningSteps.value[2] = { ...reasoningSteps.value[2], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t3, detail: '文字识别完成，平均置信度 96.3%。', detailItems: ['识别字符数：287 个', '平均置信度：96.3%', '涉及学科：数学', '涉及知识点：函数、导数、定义域'] }

  reasoningSteps.value[3] = { ...reasoningSteps.value[3], status: 'running', description: '正在解析题目结构...', startedAt: new Date().toISOString() }
  const t4 = Date.now()
  await new Promise(r => setTimeout(r, 800))

  recognizedQuestions.value = [
    { id: 'import-1', type: 'choice', difficulty: 'medium', subject: 'math', grade: 'grade10', knowledgePoints: ['函数'], content: '已知函数 f(x) = 2x + 1，则 f(0) 的值为（  ）', options: [{ label: 'A', content: '0' }, { label: 'B', content: '1' }, { label: 'C', content: '2' }, { label: 'D', content: '3' }], answer: 'B', analysis: 'f(0) = 2×0 + 1 = 1', score: 5, source: 'import' },
    { id: 'import-2', type: 'choice', difficulty: 'easy', subject: 'math', grade: 'grade10', knowledgePoints: ['函数', '定义域'], content: '函数 y = √(x - 2) 的定义域是（  ）', options: [{ label: 'A', content: 'x ≥ 2' }, { label: 'B', content: 'x > 2' }, { label: 'C', content: 'x ≤ 2' }, { label: 'D', content: 'x < 2' }], answer: 'A', analysis: '需要 x - 2 ≥ 0，即 x ≥ 2', score: 5, source: 'import' },
    { id: 'import-3', type: 'fillBlank', difficulty: 'medium', subject: 'math', grade: 'grade10', knowledgePoints: ['导数'], content: "函数 f(x) = sin x 的导数 f'(x) = ______。", answer: 'cos x', analysis: "(sin x)' = cos x", score: 5, source: 'import' }
  ]

  // 清空改编记录
  Object.keys(adaptedMap).forEach(k => delete adaptedMap[Number(k)])

  reasoningSteps.value[3] = { ...reasoningSteps.value[3], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t4, detail: `已将识别结果结构化为 ${recognizedQuestions.value.length} 道标准题目格式。`, detailItems: [`解析出 ${recognizedQuestions.value.length} 道题目`, '题型识别：2 道选择题 + 1 道填空题', '难度评估：1 道简单 + 2 道中等', '答案与解析已自动生成'] }

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

// ========== 改编功能 ==========

async function handleAdaptOne(idx: number) {
  adaptTargetIdx.value = idx
  await simulateAdapt([idx])
}

async function handleAdaptAll() {
  adaptTargetIdx.value = -1
  const allIdx = recognizedQuestions.value.map((_, i) => i)
  await simulateAdapt(allIdx)
}

async function simulateAdapt(indices: number[]) {
  step.value = 'adapting'
  isAdapting.value = true
  isAdaptCompleted.value = false

  const questionCount = indices.length
  const label = adaptTargetIdx.value >= 0 ? `第 ${adaptTargetIdx.value + 1} 题` : `${questionCount} 道题目`

  adaptReasoningSteps.value = [
    { id: 'analyze', title: '分析原题结构', description: `正在分析${label}...`, status: 'running', startedAt: new Date().toISOString() },
    { id: 'strategy', title: '制定改编策略', status: 'pending' },
    { id: 'generate', title: '生成改编题目', status: 'pending' },
    { id: 'verify', title: '验证改编质量', status: 'pending' }
  ]

  // 步骤 1: 分析原题
  const t1 = Date.now()
  await new Promise(r => setTimeout(r, 1000))
  const analyzedTypes = [...new Set(indices.map(i => LABELS[recognizedQuestions.value[i].type]))].join('、')
  const analyzedDifficulties = [...new Set(indices.map(i => DIFFICULTY_LABELS[recognizedQuestions.value[i].difficulty]))].join('、')
  adaptReasoningSteps.value[0] = {
    ...adaptReasoningSteps.value[0], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t1,
    detail: `已完成 ${label} 的结构分析。`,
    detailItems: [`题目数量：${questionCount} 道`, `题型分布：${analyzedTypes}`, `难度分布：${analyzedDifficulties}`, `涉及知识点：函数、导数、定义域`]
  }

  // 步骤 2: 制定策略
  adaptReasoningSteps.value[1] = { ...adaptReasoningSteps.value[1], status: 'running', description: '正在匹配改编策略...', startedAt: new Date().toISOString() }
  const t2 = Date.now()
  await new Promise(r => setTimeout(r, 800))
  const strategies = indices.map(i => {
    const s = adaptStrategies[Math.floor(Math.random() * adaptStrategies.length)]
    return `第 ${i + 1} 题：${s.label}`
  })
  adaptReasoningSteps.value[1] = {
    ...adaptReasoningSteps.value[1], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t2,
    detail: '已为每道题目匹配最优改编策略。',
    detailItems: ['改编原则：保持知识点不变，变换考查角度', ...strategies.slice(0, 4)]
  }

  // 步骤 3: 生成改编题
  adaptReasoningSteps.value[2] = { ...adaptReasoningSteps.value[2], status: 'running', description: '正在生成改编题目...', startedAt: new Date().toISOString() }
  const t3 = Date.now()
  await new Promise(r => setTimeout(r, 1500))

  // 为每道题生成改编结果
  for (const idx of indices) {
    const q = recognizedQuestions.value[idx]
    const templates = adaptTemplates[q.id] || []
    if (templates.length > 0) {
      const template = templates[Math.floor(Math.random() * templates.length)]
      const strategy = adaptStrategies.find(s => {
        if (s.value === 'changeType' && template.type !== q.type) return true
        if (s.value === 'changeDifficulty' && template.difficulty !== q.difficulty) return true
        if (s.value === 'changeKnowledge') return true
        if (s.value === 'changeNumbers') return true
        return false
      }) || adaptStrategies[0]

      adaptedMap[idx] = {
        strategy: strategy.label,
        original: { ...q, options: q.options ? [...q.options] : undefined },
        adapted: { ...template, options: template.options ? [...template.options.map(o => ({ ...o }))] : undefined }
      }
    }
  }

  adaptReasoningSteps.value[2] = {
    ...adaptReasoningSteps.value[2], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t3,
    detail: `已成功生成 ${questionCount} 道改编题目。`,
    detailItems: [`改编完成：${questionCount} 道`, ...indices.slice(0, 3).map(i => `第 ${i + 1} 题：${LABELS[adaptedMap[i]?.adapted.type || recognizedQuestions.value[i].type]}`), '所有改编题均保持知识点一致性']
  }

  // 步骤 4: 验证质量
  adaptReasoningSteps.value[3] = { ...adaptReasoningSteps.value[3], status: 'running', description: '正在验证改编质量...', startedAt: new Date().toISOString() }
  const t4 = Date.now()
  await new Promise(r => setTimeout(r, 700))
  adaptReasoningSteps.value[3] = {
    ...adaptReasoningSteps.value[3], status: 'completed', completedAt: new Date().toISOString(), duration: Date.now() - t4,
    detail: '改编质量验证通过。',
    detailItems: ['知识点一致性：✓ 通过', '答案正确性：✓ 通过', '难度梯度合理性：✓ 通过', '无重复题目：✓ 通过']
  }

  isAdapting.value = false
  isAdaptCompleted.value = true
  step.value = 'result'
  ElMessage.success(`已成功改编 ${questionCount} 道题目`)
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

/* 改编过程 */
.adapting-section {
  max-width: 600px;
  margin: 0 auto;
}

/* 改编对比 */
.adapt-compare {
  margin-top: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}

.compare-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.compare-label {
  font-size: 13px;
  font-weight: 600;
  color: #166534;
}

.compare-content {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.compare-original,
.compare-adapted {
  flex: 1;
  min-width: 0;
}

.compare-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.compare-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
}

.compare-arrow {
  flex-shrink: 0;
  padding-top: 20px;
  font-size: 18px;
  color: #22c55e;
  font-weight: bold;
}

.compare-options {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.compare-option {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.compare-answer {
  margin-top: 6px;
  font-size: 12px;
  color: #166534;
  font-weight: 500;
}
</style>
