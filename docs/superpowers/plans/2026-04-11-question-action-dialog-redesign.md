# 题目操作弹窗重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构题目操作弹窗，优化内容分区和操作逻辑，使其符合教师真实使用场景

**Architecture:** 保留 el-dialog 弹窗形态，重写内部模板、脚本逻辑和样式。精简题目预览为标签摘要，换难度/换题型改为展开选择，新增「换一道类似的」一键操作，删除弱化到标题栏，分值调整即时生效，自定义改编始终可见。

**Tech Stack:** Vue 3 + TypeScript + Element Plus + Pinia

**Design Spec:** `docs/superpowers/specs/2026-04-10-question-action-dialog-design.md`

---

### Task 1: 重写弹窗模板

**Files:**
- Modify: `src/views/AIExam.vue:289-369`

- [ ] **Step 1: 替换 el-dialog 内部模板**

将第 289-369 行的整个 `el-dialog` 替换为以下内容：

```html
    <!-- 题目操作弹窗 -->
    <el-dialog
      v-model="actionDialogVisible"
      width="420px"
      :close-on-click-modal="true"
      class="question-action-dialog"
      append-to-body
    >
      <template #header>
        <div class="action-dialog-header">
          <span class="action-dialog-title">题目操作</span>
          <div class="action-dialog-header-actions">
            <el-popconfirm
              title="确定删除此题？"
              confirm-button-text="确定删除"
              cancel-button-text="取消"
              confirm-button-type="danger"
              @confirm="handleDeleteQuestion"
            >
              <template #reference>
                <button class="action-delete-btn">删除</button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </template>

      <div v-if="actionQuestion" class="action-panel">
        <!-- 精简摘要 -->
        <div class="action-summary">
          <el-tag size="small" type="info">{{ getTypeLabel(actionQuestion.type) }}</el-tag>
          <el-tag size="small" :type="difficultyTagType(actionQuestion.difficulty)">{{ DIFFICULTY_LABELS[actionQuestion.difficulty] }}</el-tag>
          <el-tag size="small" type="warning">{{ actionQuestion.score }}分</el-tag>
          <el-tag v-for="kp in actionQuestion.knowledgePoints?.slice(0, 2)" :key="kp" size="small" type="success" class="action-kp-tag">{{ kp }}</el-tag>
        </div>

        <!-- 操作按钮区 -->
        <div class="action-ops-grid">
          <!-- 换难度 -->
          <div class="action-op-item" :class="{ 'action-op-item--active': actionExpandKey === 'difficulty' }">
            <button class="action-op-btn" @click="toggleActionExpand('difficulty')">
              <span class="action-op-icon">📊</span>
              <span class="action-op-text">换难度</span>
              <span class="action-op-value">{{ DIFFICULTY_LABELS[actionQuestion.difficulty] }}</span>
              <span class="action-op-arrow" :class="{ 'action-op-arrow--open': actionExpandKey === 'difficulty' }">▾</span>
            </button>
            <transition name="expand">
              <div v-if="actionExpandKey === 'difficulty'" class="action-expand-list">
                <button
                  v-for="d in difficultyOptions"
                  :key="d.value"
                  class="action-expand-item"
                  :class="{ 'action-expand-item--active': actionQuestion.difficulty === d.value }"
                  @click="handleDifficultyChange(d.value)"
                >
                  <span class="action-expand-radio">{{ actionQuestion.difficulty === d.value ? '●' : '○' }}</span>
                  {{ d.label }}
                </button>
              </div>
            </transition>
          </div>

          <!-- 换题型 -->
          <div class="action-op-item" :class="{ 'action-op-item--active': actionExpandKey === 'questionType' }">
            <button class="action-op-btn" @click="toggleActionExpand('questionType')">
              <span class="action-op-icon">📝</span>
              <span class="action-op-text">换题型</span>
              <span class="action-op-value">{{ getTypeLabel(actionQuestion.type) }}</span>
              <span class="action-op-arrow" :class="{ 'action-op-arrow--open': actionExpandKey === 'questionType' }">▾</span>
            </button>
            <transition name="expand">
              <div v-if="actionExpandKey === 'questionType'" class="action-expand-list">
                <button
                  v-for="t in questionTypeOptions"
                  :key="t.value"
                  class="action-expand-item"
                  :class="{ 'action-expand-item--active': actionQuestion.type === t.value }"
                  @click="handleQuestionTypeChange(t.value)"
                >
                  <span class="action-expand-radio">{{ actionQuestion.type === t.value ? '●' : '○' }}</span>
                  {{ t.label }}
                </button>
              </div>
            </transition>
          </div>

          <!-- 换一道类似的 -->
          <div class="action-op-item">
            <button class="action-op-btn" :disabled="actionSimilarLoading" @click="handleSimilarReplace">
              <span class="action-op-icon" :class="{ 'action-op-icon--loading': actionSimilarLoading }">🔄</span>
              <span class="action-op-text">换一道类似的</span>
            </button>
          </div>

          <!-- 分值调整 -->
          <div class="action-op-item">
            <button class="action-op-btn action-op-btn--score">
              <span class="action-op-icon">🔢</span>
              <span class="action-op-text">分值</span>
              <el-input-number
                v-model="actionScore"
                :min="1"
                :max="20"
                :step="1"
                size="small"
                controls-position="right"
                class="action-score-input"
                @change="handleScoreChange"
              />
            </button>
          </div>
        </div>

        <!-- 自定义改编 -->
        <div class="action-custom">
          <div class="action-custom-label">✏️ 自定义改编</div>
          <el-input
            v-model="actionCustomText"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="请描述修改需求，例如：换成带图形的几何题、降低计算量"
            size="small"
            @keydown.enter.ctrl="confirmCustomAction"
          />
          <div class="action-tips">
            💡 例如：换成带图形的几何题、降低计算量、换成关于三角函数的题目
          </div>
          <div class="action-custom-submit">
            <el-button size="small" type="primary" :disabled="!actionCustomText.trim()" @click="confirmCustomAction">
              提交改编
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
```

- [ ] **Step 2: 验证模板语法**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 可能有脚本相关的类型错误（Task 2 会修复），但模板本身不应有语法错误

---

### Task 2: 重写弹窗脚本逻辑

**Files:**
- Modify: `src/views/AIExam.vue:454-508`

- [ ] **Step 1: 替换题目操作弹窗相关的脚本代码**

将第 454-508 行（从 `// ========== 题目操作弹窗 ==========` 到 `handleUpdateScore` 函数结束）替换为以下内容：

```typescript
// ========== 题目操作弹窗 ==========
const actionDialogVisible = ref(false)
const actionQuestion = ref<Question | null>(null)
const actionCustomText = ref('')
const actionScore = ref(5)
const actionExpandKey = ref<'difficulty' | 'questionType' | null>(null)
const actionSimilarLoading = ref(false)

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' }
]

const questionTypeOptions = computed(() => {
  const subject = examStore.condition.subject || 'math'
  const types = SUBJECT_QUESTION_TYPES[subject] || ['choice', 'fillBlank', 'shortAnswer', 'judgment'] as QuestionType[]
  const typeLabels = SUBJECT_TYPE_LABELS[subject] || LABELS
  return types.map(t => ({ value: t, label: typeLabels[t] || LABELS[t] }))
})

function getTypeLabel(type: QuestionType): string {
  const subject = examStore.condition.subject || 'math'
  const typeLabels = SUBJECT_TYPE_LABELS[subject]
  return typeLabels?.[type] || LABELS[type]
}

function difficultyTagType(difficulty: Difficulty): '' | 'success' | 'danger' {
  const map: Record<Difficulty, '' | 'success' | 'danger'> = { easy: 'success', medium: '', hard: 'danger' }
  return map[difficulty]
}

function toggleActionExpand(key: 'difficulty' | 'questionType') {
  actionExpandKey.value = actionExpandKey.value === key ? null : key
}

function openQuestionAction(q: Question) {
  actionQuestion.value = q
  actionCustomText.value = ''
  actionScore.value = q.score
  actionExpandKey.value = null
  actionSimilarLoading.value = false
  actionDialogVisible.value = true
}

async function handleDifficultyChange(difficulty: Difficulty) {
  if (!actionQuestion.value || actionQuestion.value.difficulty === difficulty) {
    actionExpandKey.value = null
    return
  }
  await examStore.adaptQuestion(actionQuestion.value.id, 'difficulty')
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) actionQuestion.value = updated
  actionExpandKey.value = null
}

async function handleQuestionTypeChange(type: QuestionType) {
  if (!actionQuestion.value || actionQuestion.value.type === type) {
    actionExpandKey.value = null
    return
  }
  await examStore.adaptQuestion(actionQuestion.value.id, 'questionType')
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) actionQuestion.value = updated
  actionExpandKey.value = null
}

async function handleSimilarReplace() {
  if (!actionQuestion.value || actionSimilarLoading.value) return
  actionSimilarLoading.value = true
  try {
    await examStore.replaceQuestion(actionQuestion.value.id)
    const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
    if (updated) {
      actionQuestion.value = updated
      actionScore.value = updated.score
    }
  } finally {
    actionSimilarLoading.value = false
  }
}

function handleScoreChange(val: number | undefined) {
  if (!actionQuestion.value || !val) return
  examStore.updateQuestionScore(actionQuestion.value.id, val)
  const updated = examStore.currentPaper?.questions.find(q => q.id === actionQuestion.value?.id)
  if (updated) actionQuestion.value = updated
}

async function confirmCustomAction() {
  if (!actionQuestion.value || !actionCustomText.value.trim()) return
  await examStore.replaceQuestion(actionQuestion.value.id)
  actionDialogVisible.value = false
}

function handleDeleteQuestion() {
  if (!actionQuestion.value) return
  examStore.removeQuestion(actionQuestion.value.id)
  actionDialogVisible.value = false
}
```

- [ ] **Step 2: 移除不再使用的旧代码**

确认以下旧代码已被删除（它们在 Task 1 的模板替换中已不再引用）：
- `difficultyOrder` 常量
- `questionTypeOrder` 常量
- `nextDifficulty` computed
- `nextQuestionType` computed
- `quickAction` 函数
- `handleUpdateScore` 函数

- [ ] **Step 3: 验证类型检查**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 无类型错误

---

### Task 3: 重写弹窗样式

**Files:**
- Modify: `src/views/AIExam.vue:1505-1619`

- [ ] **Step 1: 替换题目操作弹窗相关样式**

将第 1505 行到第 1619 行（从 `/* ========== 题目操作弹窗 ========== */` 到 `.score-adjust :deep(.el-input-number) { width: 120px; }`）替换为以下内容：

```css
/* ========== 题目操作弹窗 ========== */
.action-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.action-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.action-delete-btn {
  font-size: 12px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.action-delete-btn:hover {
  color: var(--color-danger, #f56c6c);
  background-color: #fef0f0;
}

.action-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 精简摘要 */
.action-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.action-kp-tag {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作按钮网格 */
.action-ops-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-op-item {
  position: relative;
}

.action-op-item--active {
  z-index: 1;
}

.action-op-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-secondary, #f5f7fa);
  border: 1px solid var(--border-primary, #e4e7ed);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: border-color 0.2s ease, background-color 0.2s ease;
  text-align: left;
}

.action-op-btn:hover {
  border-color: var(--accent, #409eff);
  background-color: var(--bg-hover, #ecf5ff);
}

.action-op-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.action-op-btn--score {
  cursor: default;
}

.action-op-btn--score:hover {
  border-color: var(--border-primary, #e4e7ed);
  background: var(--bg-secondary, #f5f7fa);
}

.action-op-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.action-op-icon--loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.action-op-text {
  font-weight: 500;
  flex-shrink: 0;
}

.action-op-value {
  font-size: 12px;
  color: var(--text-tertiary);
  flex: 1;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-op-arrow {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.action-op-arrow--open {
  transform: rotate(180deg);
}

/* 展开列表 */
.action-expand-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-primary, #e4e7ed);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.action-expand-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: background-color 0.15s ease;
  text-align: left;
}

.action-expand-item:hover {
  background-color: var(--bg-hover, #ecf5ff);
}

.action-expand-item--active {
  color: var(--accent, #409eff);
  font-weight: 500;
}

.action-expand-radio {
  font-size: 12px;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top center;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: scaleY(0.9);
}

/* 分值输入 */
.action-score-input {
  width: 100px !important;
  margin-left: auto;
}

.action-score-input :deep(.el-input__inner) {
  text-align: center;
}

/* 自定义改编 */
.action-custom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-custom-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.action-tips {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.action-custom-submit {
  display: flex;
  justify-content: flex-end;
}
```

- [ ] **Step 2: 构建验证**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npm run build 2>&1 | tail -20`
Expected: 构建成功，无错误

---

### Task 4: 本地启动验证

**Files:** 无新增/修改

- [ ] **Step 1: 启动开发服务器**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npm run dev`
Expected: 开发服务器启动成功，显示 localhost URL

- [ ] **Step 2: 功能验证清单**

在浏览器中完成以下验证：

1. 生成一份试卷进入预览状态
2. 点击任意题目的「操作 ▾」按钮
3. 验证弹窗顶部显示精简摘要（题型·难度·分值·知识点标签）
4. 验证标题栏右侧有灰色「删除」文字，hover 变红
5. 点击「删除」→ 弹出 popover 确认 → 确认后题目被删除、弹窗关闭
6. 点击「换难度」→ 展开难度选项列表 → 当前难度高亮 → 选择其他难度 → 题目替换 → 摘要更新
7. 点击「换题型」→ 展开题型选项列表 → 当前题型高亮 → 选择其他题型 → 题目替换
8. 点击「换一道类似的」→ 按钮显示 loading 旋转 → 题目替换
9. 修改分值数字 → 即时生效（无需点击应用按钮）
10. 在自定义改编输入框输入文字 → 点击「提交改编」→ 弹窗关闭
11. 验证弹窗可通过点击遮罩层关闭
12. 验证换难度/换题型后弹窗保持打开

- [ ] **Step 3: Commit**

```bash
cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator
git add src/views/AIExam.vue docs/superpowers/specs/2026-04-10-question-action-dialog-design.md
git commit -m "refactor: redesign question action dialog with expand selectors and simplified summary"
```
