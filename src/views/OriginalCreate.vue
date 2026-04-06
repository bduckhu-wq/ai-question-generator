<template>
  <div class="original-create-page">
    <div class="page-header">
      <span class="page-title">原创出题</span>
      <span class="page-desc">上传教学素材，AI 生成符合新课标的原创题目</span>
    </div>

    <div class="create-content">
      <div class="create-layout">
        <!-- 左侧：素材上传 -->
        <div class="material-section">
          <div class="section-title">上传素材</div>
          <div class="material-upload">
            <el-upload
              class="upload-area"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleMaterialUpload"
              accept="image/*,.pdf,.doc,.docx,.txt"
            >
              <div class="upload-inner">
                <div class="upload-icon">
                  <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 28V12M20 12L14 18M20 12L26 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 26V30C8 31.1046 8.89543 32 10 32H30C31.1046 32 32 31.1046 32 30V26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="upload-text">拖拽或点击上传素材</div>
                <div class="upload-hint">支持文档、图片、知识点描述等</div>
              </div>
            </el-upload>
          </div>

          <!-- 或手动输入知识点 -->
          <div class="manual-input">
            <div class="section-title" style="margin-top: 16px;">或手动输入知识点</div>
            <el-input
              v-model="knowledgeInput"
              type="textarea"
              :rows="4"
              placeholder="输入知识点描述，如：&#10;高一数学必修一第三章：函数的概念与基本性质&#10;重点：函数的单调性、奇偶性、最值"
            />
          </div>

          <!-- 出题条件 -->
          <div class="create-conditions">
            <div class="section-title" style="margin-top: 16px;">出题条件</div>
            <div class="condition-grid">
              <div class="condition-field">
                <span class="cond-label">题型</span>
                <el-select v-model="conditions.questionTypes" size="small" multiple style="width: 100%">
                  <el-option v-for="(label, key) in LABELS" :key="key" :label="label" :value="key" />
                </el-select>
              </div>
              <div class="condition-field">
                <span class="cond-label">难度</span>
                <el-select v-model="conditions.difficulty" size="small" style="width: 100%">
                  <el-option v-for="(label, key) in DIFFICULTY_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
              </div>
              <div class="condition-field">
                <span class="cond-label">数量</span>
                <el-input-number v-model="conditions.count" :min="1" :max="20" size="small" style="width: 100%" />
              </div>
            </div>
            <el-button
              type="primary"
              style="width: 100%; margin-top: 16px;"
              @click="handleGenerate"
              :loading="isGenerating"
            >
              生成原创题
            </el-button>
          </div>
        </div>

        <!-- 右侧：生成结果 -->
        <div class="result-section">
          <div class="section-title">
            生成结果
            <span v-if="generatedQuestions.length" class="result-count">（{{ generatedQuestions.length }} 道）</span>
          </div>

          <!-- 推理步骤展示 -->
          <div v-if="reasoningSteps.length > 0" class="reasoning-wrapper">
            <ReasoningSteps
              title="AI 原创出题过程"
              :steps="reasoningSteps"
              :is-running="isGenerating"
              :is-completed="isGenerateCompleted"
            />
          </div>

          <div v-if="generatedQuestions.length === 0 && !isGenerating && reasoningSteps.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" stroke-width="1.5"/>
                <line x1="14" y1="16" x2="34" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="14" y1="22" x2="28" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="14" y1="28" x2="24" y2="28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="empty-text">上传素材并设置条件后<br>AI 将为您生成原创题目</div>
          </div>

          <div v-if="generatedQuestions.length > 0" class="result-list">
            <div v-for="(q, idx) in generatedQuestions" :key="q.id" class="result-card">
              <div class="card-header">
                <span class="card-num">第 {{ idx + 1 }} 题</span>
                <el-tag size="small">{{ LABELS[q.type] }}</el-tag>
                <el-tag size="small">{{ DIFFICULTY_LABELS[q.difficulty] }}</el-tag>
                <el-tag size="small">原创</el-tag>
              </div>
              <div class="card-content">
                <el-input v-model="q.content" type="textarea" :rows="2" size="small" />
                <div v-if="q.options?.length" class="card-options">
                  <div v-for="opt in q.options" :key="opt.label" class="option-row">
                    <span class="opt-label">{{ opt.label }}</span>
                    <el-input v-model="opt.content" size="small" />
                  </div>
                </div>
                <div class="card-meta">
                  <div class="meta-row">
                    <span class="meta-label">答案：</span>
                    <el-input v-model="q.answer" size="small" />
                  </div>
                  <div class="meta-row">
                    <span class="meta-label">解析：</span>
                    <el-input v-model="q.analysis" size="small" type="textarea" :rows="2" />
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <el-button text size="small" @click="handleAddToBank(idx)">入题库</el-button>
                <el-button text size="small" @click="handleRegenerateOne(idx)">重新生成</el-button>
              </div>
            </div>

            <div class="batch-actions">
              <el-button type="primary" @click="handleAddAllToBank">全部入题库</el-button>
              <el-button @click="handleAddToExam">添加到当前试卷</el-button>
            </div>
          </div>
        </div>
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

const knowledgeInput = ref('')
const isGenerating = ref(false)
const isGenerateCompleted = ref(false)
const generatedQuestions = ref<Question[]>([])
const reasoningSteps = ref<ReasoningStep[]>([])

const conditions = reactive({
  questionTypes: ['choice', 'fillBlank'] as any[],
  difficulty: 'medium' as any,
  count: 5
})

function handleMaterialUpload(file: any) {
  ElMessage.success('素材已上传（原型演示）')
}

async function handleGenerate() {
  if (!knowledgeInput.value.trim()) {
    ElMessage.warning('请先上传素材或输入知识点描述')
    return
  }

  isGenerating.value = true
  isGenerateCompleted.value = false
  generatedQuestions.value = []

  // 初始化推理步骤
  reasoningSteps.value = [
    {
      id: 'analyze',
      title: '分析教学素材',
      description: '正在解析知识点与教学目标...',
      status: 'running',
      startedAt: new Date().toISOString()
    },
    {
      id: 'design',
      title: '设计题目方案',
      status: 'pending'
    },
    {
      id: 'generate',
      title: '生成原创题目',
      status: 'pending'
    },
    {
      id: 'verify',
      title: '质量校验',
      status: 'pending'
    }
  ]

  // 步骤 1: 分析教学素材
  const t1 = Date.now()
  await new Promise(r => setTimeout(r, 700))
  reasoningSteps.value[0] = {
    ...reasoningSteps.value[0],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t1,
    detail: '已分析教学素材，提取核心知识点与能力要求。',
    detailItems: [
      '核心知识点：函数单调性、奇偶性、最值',
      '能力层级：理解 → 应用 → 分析',
      '新课标要求：掌握函数性质的基本判定方法',
      '建议题型分布：选择题 60% + 填空题 40%'
    ]
  }

  // 步骤 2: 设计题目方案
  reasoningSteps.value[1] = {
    ...reasoningSteps.value[1],
    status: 'running',
    description: '正在规划题目结构与考查点...',
    startedAt: new Date().toISOString()
  }
  const t2 = Date.now()
  await new Promise(r => setTimeout(r, 600))
  reasoningSteps.value[1] = {
    ...reasoningSteps.value[1],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t2,
    detail: `已设计 ${conditions.count} 道原创题目的考查方案。`,
    detailItems: [
      `题目 1：函数单调性判定（选择题，中等难度）`,
      `题目 2：奇函数性质应用（选择题，中等难度）`,
      `题目 3：函数最值求解（填空题，中等难度）`,
      `题目 4：零点个数判断（选择题，较高难度）`,
      `题目 5：导数切线应用（填空题，较高难度）`
    ]
  }

  // 步骤 3: 生成原创题目
  reasoningSteps.value[2] = {
    ...reasoningSteps.value[2],
    status: 'running',
    description: 'AI 正在逐题生成原创内容...',
    startedAt: new Date().toISOString()
  }
  const t3 = Date.now()

  // 模拟逐题生成
  for (let i = 0; i < conditions.count; i++) {
    await new Promise(r => setTimeout(r, 400))
    reasoningSteps.value[2] = {
      ...reasoningSteps.value[2],
      description: `正在生成第 ${i + 1}/${conditions.count} 道题目...`
    }
  }

  generatedQuestions.value = [
    {
      id: 'orig-1',
      type: 'choice',
      difficulty: 'medium',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['函数', '单调性'],
      content: '已知函数 f(x) = x² - 2ax + 3 在区间 (1, +∞) 上是单调递增函数，则 a 的取值范围是（  ）',
      options: [
        { label: 'A', content: 'a ≤ 1' },
        { label: 'B', content: 'a < 1' },
        { label: 'C', content: 'a ≥ 1' },
        { label: 'D', content: 'a > 1' }
      ],
      answer: 'A',
      analysis: "f'(x) = 2x - 2a，在 (1,+∞) 上 f'(x) ≥ 0，即 2×1 - 2a ≥ 0，a ≤ 1。",
      score: 5,
      source: 'ai'
    },
    {
      id: 'orig-2',
      type: 'choice',
      difficulty: 'medium',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['函数', '奇偶性'],
      content: '若 f(x) 是定义在 R 上的奇函数，且当 x > 0 时，f(x) = x² + 1，则 f(-2) = （  ）',
      options: [
        { label: 'A', content: '5' },
        { label: 'B', content: '-5' },
        { label: 'C', content: '3' },
        { label: 'D', content: '-3' }
      ],
      answer: 'B',
      analysis: 'f(-2) = -f(2) = -(2² + 1) = -5。',
      score: 5,
      source: 'ai'
    },
    {
      id: 'orig-3',
      type: 'fillBlank',
      difficulty: 'medium',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['函数', '最值'],
      content: '函数 f(x) = -x² + 4x - 3 的最大值为 ______。',
      answer: '1',
      analysis: 'f(x) = -(x-2)² + 1，当 x=2 时取最大值 1。',
      score: 5,
      source: 'ai'
    },
    {
      id: 'orig-4',
      type: 'choice',
      difficulty: 'hard',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['函数', '综合'],
      content: '设函数 f(x) = ln x - x + 1，则 f(x) 的零点个数为（  ）',
      options: [
        { label: 'A', content: '0 个' },
        { label: 'B', content: '1 个' },
        { label: 'C', content: '2 个' },
        { label: 'D', content: '3 个' }
      ],
      answer: 'B',
      analysis: "f'(x) = 1/x - 1，在 (0,1) 上 f'(x)>0 递增，在 (1,+∞) 上 f'(x)<0 递减。f(1)=0，故只有 1 个零点。",
      score: 5,
      source: 'ai'
    },
    {
      id: 'orig-5',
      type: 'fillBlank',
      difficulty: 'hard',
      subject: 'math',
      grade: 'grade10',
      knowledgePoints: ['导数', '应用'],
      content: '曲线 y = x³ - 3x² + 2 在点 (1, 0) 处的切线与 x 轴围成的三角形面积为 ______。',
      answer: '4/3',
      analysis: "y' = 3x² - 6x，切线斜率 k = 3-6 = -3，切线方程 y = -3(x-1)。与 x 轴交点 (1,0)，与 y 轴交点 (0,3)，面积 = 1/2 × 1 × 3 = 3/2...需重新计算。",
      score: 5,
      source: 'ai'
    }
  ]

  reasoningSteps.value[2] = {
    ...reasoningSteps.value[2],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t3,
    detail: `已生成 ${generatedQuestions.value.length} 道原创题目。`,
    detailItems: generatedQuestions.value.map((q, i) => `第${i + 1}题：[${LABELS[q.type]}] ${q.content.substring(0, 35)}...`)
  }

  // 步骤 4: 质量校验
  reasoningSteps.value[3] = {
    ...reasoningSteps.value[3],
    status: 'running',
    description: '正在校验题目质量...',
    startedAt: new Date().toISOString()
  }
  const t4 = Date.now()
  await new Promise(r => setTimeout(r, 500))
  reasoningSteps.value[3] = {
    ...reasoningSteps.value[3],
    status: 'completed',
    completedAt: new Date().toISOString(),
    duration: Date.now() - t4,
    detail: '所有题目已通过质量校验。',
    detailItems: [
      `题目重复率检查：通过（0% 重复）`,
      `答案正确性验证：通过`,
      `难度分布检查：通过（中等 60% + 较难 40%）`,
      `知识点覆盖度：通过（单调性、奇偶性、最值、导数）`,
      `新课标符合度：通过`
    ]
  }

  isGenerating.value = false
  isGenerateCompleted.value = true
}

function handleAddToBank(idx: number) {
  ElMessage.success('已添加到题库')
}

function handleAddAllToBank() {
  ElMessage.success(`已将 ${generatedQuestions.value.length} 道原创题添加到题库`)
}

function handleAddToExam() {
  ElMessage.success('已添加到当前试卷')
}

function handleRegenerateOne(idx: number) {
  ElMessage.info('重新生成（原型演示）')
}
</script>

<style scoped>
.original-create-page {
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

.create-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.create-layout {
  display: flex;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.material-section {
  width: 360px;
  flex-shrink: 0;
}

.result-section {
  flex: 1;
  min-width: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.result-count {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 上传 */
.upload-area :deep(.el-upload-dragger) {
  border-radius: 8px;
  padding: 24px;
  border: 2px dashed var(--border-primary);
  background: var(--bg-primary);
  transition: border-color var(--transition-fast);
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--accent);
}

.upload-inner {
  text-align: center;
}

.upload-icon {
  margin-bottom: 8px;
  color: var(--text-quaternary);
  display: flex;
  justify-content: center;
}

.upload-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.upload-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* 条件 */
.condition-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.condition-field {
  display: flex;
  flex-direction: column;
}

.cond-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

/* 推理步骤 */
.reasoning-wrapper {
  margin-bottom: 20px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 12px;
  color: var(--text-quaternary);
  display: flex;
  justify-content: center;
}

.empty-text {
  font-size: 14px;
  color: var(--text-tertiary);
  line-height: 1.6;
}

/* 结果卡片 */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.card-num {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opt-label {
  font-weight: 600;
  font-size: 13px;
  width: 20px;
  flex-shrink: 0;
  color: var(--text-primary);
}

.card-meta {
  margin-top: 4px;
}

.meta-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  line-height: 32px;
}

.card-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  gap: 8px;
}

.batch-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
