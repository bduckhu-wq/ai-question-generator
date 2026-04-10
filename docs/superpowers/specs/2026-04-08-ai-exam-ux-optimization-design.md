# AI 组卷流程优化设计文档

> 日期：2026-04-08
> 状态：Draft（v2 — 推理过程重设计）
> 范围：AI 组卷页面（`AIExam.vue`）渐进式优化

## 1. 背景与目标

### 1.1 当前状态

AI 出题助手 v0.1.0 原型已完成前端 UI，AI 组卷页面采用 4 状态机设计（init → confirm → generating → done），包含对话区 + 参数配置栏 + 卷面预览三大区域。当前使用 Mock 数据驱动，尚未接入真实后端。

### 1.2 核心痛点

1. **整体流程引导不足**：状态间过渡突兀，用户不清楚"我在哪、下一步做什么"
2. **推理过程体验差**：当前采用固定 4 步流水线 + 硬编码延时动画，步骤和内容都是预设的，不符合主流 AI 产品（ChatGPT o3、DeepSeek R1、Claude）的流式思考展示范式，用户感知是"看动画"而非"AI 在思考"
3. **卷面编辑能力弱**：操作单一（仅文本编辑 + 弹窗改编），缺少拖拽排序、分值调整、批量操作
4. **缺少版本回撤**：改编/编辑后无法撤销，效果不好无法恢复

### 1.3 优化目标

- 提升用户对组卷流程的感知和控制感
- 增强卷面编辑的灵活性和效率
- 支持操作回撤，降低试错成本

### 1.4 约束

- 渐进式优化，不改变整体架构和状态机设计
- 保持现有技术栈（Vue 3 + TypeScript + Element Plus + Pinia）
- 复用已有依赖（vuedraggable）

---

## 2. 整体流程引导优化

### 2.1 流程进度指示器

**位置**：对话区顶部（chat-header 下方）

**设计**：
- 轻量水平步骤条，4 个节点：`选择场景 → 配置参数 → 生成试卷 → 编辑调整`
- 当前步骤：主题色填充 + 文字加粗
- 已完成步骤：打勾图标 + 灰色文字
- 未来步骤：灰色圆点 + 灰色文字
- 步骤间用细线连接，已完成段为主题色
- 状态变化时节点有 scale + fade 过渡动画（0.3s ease）

**状态映射**：
| 页面 step | 进度指示器高亮 |
|-----------|---------------|
| init | 选择场景 |
| confirm | 配置参数 |
| generating | 生成试卷 |
| done | 编辑调整 |

**实现**：新增 `FlowProgress.vue` 组件，接收 `currentStep` prop。

### 2.2 init → confirm 过渡优化

**当前问题**：点击场景按钮后 init 界面直接消失，参数栏静默出现。

**优化**：
1. 点击场景按钮后，init 容器以 fade-out 动画消失（0.3s）
2. 同时在对话区新增一条用户消息气泡："我选择了「课后练习」"
3. AI 回复确认消息："已为您预设课后练习参数，您可以在下方调整后点击发送。"
4. 参数配置栏以 highlight-border 动画出现（边框闪烁 2 次，0.5s），提示用户注意
5. 被预设修改的参数项以主题色小标签形式在参数栏下方展示摘要（如"难度 4:5:1 · 15题 · 选择题+填空题"）

### 2.3 confirm → generating 过渡优化

**当前问题**：点击发送后直接进入推理步骤。

**优化**：
1. 发送后先显示用户消息气泡（含发送动画）
2. AI 回复"好的，正在为您生成试卷..."（打字机效果，0.5s）
3. 思考气泡（ThinkingBubble）以 scale-y 动画从 0 展开到完整高度（0.4s ease-out），开始流式展示思考内容

### 2.4 generating → done 过渡优化

**当前问题**：推理完成后卷面预览直接弹出。

**优化**：
1. 推理全部完成后，AI 发送完成消息
2. 完成消息下方附带试卷摘要卡片（题数、分值、时长、难度分布）
3. 摘要卡片出现 0.8s 后，卷面预览以 slide-right 动画滑入
4. 摘要卡片中包含「查看试卷 →」按钮，点击也可触发卷面滑入

---

## 3. 推理过程体验优化（v2 重设计）

> **设计变更说明**：原方案采用固定 4 步流水线 + 硬编码延时动画，步骤数量和内容都是预设的。这不符合当前主流 AI 产品（ChatGPT o3/o4 的 Thinking 气泡、DeepSeek R1 的 `<think标签>` 流式输出、Claude 的 Extended Thinking）的设计范式。
>
> **新方案核心转变**：从"固定步骤流水线" → "AI 实时思考流"。AI 的推理过程是一段连续的、动态的文本流，通过 SSE 逐 token 推送到前端实时渲染，用户看到的是 AI "正在思考"的真实过程。

### 3.1 问题诊断

| 问题 | 当前实现 | 主流 AI 产品做法 |
|------|----------|------------------|
| 步骤固定 | 硬编码 4 步（解析→检索→生成→排版） | 动态生成，步骤数量和内容由 AI 推理实时决定 |
| 内容静态 | 预设的 detail/detailItems 文本 | 流式输出，逐 token 渲染，实时展示 AI 的思考 |
| 结构僵化 | 线性时间线，一步接一步 | 可折叠的思考气泡，用户可选择展开/收起 |
| 无真实推理 | setTimeout 模拟延时 | SSE/WebSocket 接收真实推理 token 流 |

### 3.2 流式思考气泡（ThinkingBubble）

#### 3.2.1 交互设计

**思考中状态（展开）**：

```
┌─────────────────────────────────────────────┐
│ 💭 AI 正在思考...              ⏱ 3.2s [收起] │
│                                              │
│  正在分析出题需求：                           │
│  用户需要一份高一数学课后练习，包含选择题和    │
│  填空题，难度以中等为主。知识点聚焦在函数与    │
│  导数...█                                     │
│                                              │
│  正在检索题库：                               │
│  在题库中匹配到 5 道相关题目，覆盖函数定义域、 │
│  单调性、极值等知识点...                       │
│                                              │
│  ▌  (光标闪烁，表示正在输出)                   │
└─────────────────────────────────────────────┘
```

- 外观：浅灰色背景 + 左侧思考图标，与普通消息气泡视觉区分
- 标题栏：显示"AI 正在思考..." + 实时计时器 + 收起/展开按钮
- 内容区：实时流式渲染 AI 的推理文本（逐 token 追加，打字机效果）
- 底部：闪烁光标 `▌`，表示正在持续输出
- 默认**展开**（让用户感知 AI 正在工作）

**思考完成后（自动收起）**：

```
┌─────────────────────────────────────────────┐
│ 💭 已思考 12 秒，点击展开查看推理过程  [展开] │
└─────────────────────────────────────────────┘
```

- 思考完成后自动折叠为一行摘要：思考耗时 + 展开提示
- 点击可展开查看完整思考过程（内容保留在 DOM 中，无需重新加载）
- 收起状态下显示为对话流中一个轻量的节点，不占用过多空间

**思考完成后的结果消息**：

思考气泡收起后，在其下方出现正常的 AI 回复消息气泡：

```
┌─────────────────────────────────────────────┐
│ ✅ 试卷生成完成！共 15 道题目（题库匹配 9 道， │
│ AI 生成 6 道），请在右侧卷面中查看和调整。      │
│                                              │
│ [查看试卷]  [重新生成]                        │
└─────────────────────────────────────────────┘
```

#### 3.2.2 组件设计

**新增 `ThinkingBubble.vue`**，替代当前 `ReasoningSteps.vue`：

```vue
<template>
  <div class="thinking-bubble" :class="{ collapsed, completed }">
    <!-- 标题栏 -->
    <div class="thinking-header" @click="toggleCollapse">
      <span class="thinking-icon">💭</span>
      <span class="thinking-label">
        {{ completed ? `已思考 ${formattedDuration}` : 'AI 正在思考...' }}
      </span>
      <span v-if="!completed" class="thinking-timer">{{ elapsed }}</span>
      <span class="thinking-toggle">{{ collapsed ? '展开' : '收起' }}</span>
    </div>

    <!-- 思考内容（流式渲染） -->
    <div v-show="!collapsed" class="thinking-content">
      <div class="thinking-text" v-html="renderedText"></div>
      <span v-if="!completed" class="thinking-cursor">▌</span>
    </div>
  </div>
</template>
```

**Props**：
| Prop | 类型 | 说明 |
|------|------|------|
| `thinkingText` | `string` | 累积的思考文本（由 Store 驱动） |
| `isThinking` | `boolean` | 是否正在思考 |
| `isThinkingCompleted` | `boolean` | 思考是否完成 |
| `thinkingDuration` | `number` | 思考耗时（ms） |

**关键行为**：
- `isThinking` 变为 true 时，气泡以 scale-y 动画展开，开始显示文本
- `thinkingText` 变化时，新内容以 fade-in 动画追加到末尾
- `isThinkingCompleted` 变为 true 时，延迟 0.5s 后自动折叠
- 折叠/展开使用 max-height transition（0.3s ease）

#### 3.2.3 SSE 事件协议设计

为后续接入真实后端做准备，定义 SSE 事件协议：

```typescript
// SSE 事件类型
type SSEEvent =
  | { type: 'thinking_start' }                        // 思考开始
  | { type: 'thinking_delta', content: string }        // 思考内容增量（一个 token）
  | { type: 'thinking_end', duration: number }         // 思考结束
  | { type: 'result_start' }                           // 结果开始
  | { type: 'result_delta', content: string }          // 结果内容增量
  | { type: 'result_end' }                             // 结果结束
  | { type: 'paper_ready', paper: ExamPaper }          // 试卷数据就绪
  | { type: 'error', message: string }                 // 错误
```

**前端消费逻辑**（`exam.ts`）：

```typescript
async function generateExam(cond?: Partial<ExamCondition>) {
  // ... 参数处理 ...

  const eventSource = new EventSource(`/api/exam/generate?${params}`)
  eventSource.addEventListener('message', (e) => {
    const event: SSEEvent = JSON.parse(e.data)
    switch (event.type) {
      case 'thinking_start':
        isThinking.value = true
        thinkingText.value = ''
        thinkingStartTime.value = Date.now()
        break
      case 'thinking_delta':
        thinkingText.value += event.content
        break
      case 'thinking_end':
        isThinking.value = false
        isThinkingCompleted.value = true
        thinkingDuration.value = event.duration
        break
      case 'paper_ready':
        currentPaper.value = event.paper
        showPreview.value = true
        step.value = 'done'
        break
      // ...
    }
  })
}
```

#### 3.2.4 Mock 阶段过渡方案

在真实后端就绪之前，用模拟流式输出来替代当前的固定延时动画：

```typescript
// stores/exam.ts — 模拟流式思考
async function generateExam(cond?: Partial<ExamCondition>) {
  // ... 参数处理 ...
  isGenerating.value = true
  thinkingText.value = ''
  isThinking.value = true
  thinkingStartTime.value = Date.now()

  // 模拟流式输出的思考内容（逐句追加，每句 80-200ms）
  const thinkingChunks = [
    '正在分析出题需求...\n',
    `学科：数学，年级：高一，题型：选择题、填空题\n`,
    `难度分配：简单 30%、中等 50%、困难 20%\n`,
    `知识点：函数与导数\n\n`,
    '正在检索题库...\n',
    `匹配到 5 道相关题目：\n`,
    `  · 选择题：函数的定义域与值域（简单）\n`,
    `  · 选择题：导数的几何意义（中等）\n`,
    `  · 填空题：单调性的判定（中等）\n`,
    `  · 填空题：函数的极值（困难）\n`,
    `  · 解答题：导数综合应用（困难）\n\n`,
    '题库题目不足，AI 正在生成补充题目...\n',
    `已生成 10 道原创题目，覆盖：\n`,
    `  · 函数零点问题 3 道\n`,
    `  · 导数求切线方程 2 道\n`,
    `  · 函数最值优化 2 道\n`,
    `  · 抽象函数推理 3 道\n\n`,
    '正在组卷排版...\n',
    `按题型分组：选择题 8 道、填空题 4 道、解答题 3 道\n`,
    `总分：100 分，预计时长：60 分钟\n`,
  ]

  for (const chunk of thinkingChunks) {
    if (!isGenerating.value) break  // 支持取消
    await new Promise(r => setTimeout(r, 80 + Math.random() * 120))
    thinkingText.value += chunk
  }

  // 思考结束
  isThinking.value = false
  isThinkingCompleted.value = true
  thinkingDuration.value = Date.now() - thinkingStartTime.value

  // ... 创建试卷 ...
}
```

**关键差异**：思考内容是**有意义的自然语言描述**，而非固定步骤的标签。后续接入真实 LLM 后，这些内容将直接来自模型的推理输出。

### 3.3 取消生成

**位置**：思考气泡标题栏右侧（与计时器同行）

**设计**：
- 文字按钮"取消"，灰色，hover 变红色
- 仅在 `isThinking === true` 时显示
- 点击后：
  1. 停止流式输出（关闭 SSE 连接 / 中断 mock 循环）
  2. 思考气泡内容保留到当前已输出的位置
  3. 气泡状态变为"已取消"（标题显示"已取消 · 思考了 X 秒"）
  4. AI 发送消息："已取消生成。是否保留当前结果？"
  5. 消息下方提供两个按钮：「保留结果」「丢弃重来」

**实现**：在 `exam.ts` 中新增 `cancelGenerate()` action，设置 `isGenerating = false`，关闭 EventSource。

### 3.4 完成摘要卡片

**位置**：思考气泡收起后，作为一条新的 assistant 消息插入对话区

**设计**：
- 卡片式消息（`type: 'summary-card'`）
- 内容：
  ```
  ┌─────────────────────────────────┐
  │  试卷生成完成                     │
  │                                   │
  │  总题数：15 道                     │
  │  ├ 题库匹配：9 道                 │
  │  └ AI 生成：6 道                  │
  │                                   │
  │  难度分布                         │
  │  简单 5道 ██████░░░░░░ 33%       │
  │  中等 7道 █████████░░░ 47%       │
  │  困难 3道 ████░░░░░░░░ 20%       │
  │                                   │
  │  满分：100 分  |  时长：60 分钟   │
  │                                   │
  │           [ 查看试卷 → ]          │
  └─────────────────────────────────┘
  ```
- 「查看试卷」按钮点击后触发卷面预览 slide-right 滑入

### 3.5 与原方案对比

| 维度 | 原方案（固定步骤流水线） | 新方案（流式思考气泡） |
|------|--------------------------|------------------------|
| 步骤数量 | 固定 4 步 | 动态，由 AI 推理内容决定 |
| 内容来源 | 预设文本 | 流式 token 实时输出 |
| 用户感知 | "这是个动画" | "AI 真的在思考" |
| 可扩展性 | 新增步骤需改代码 | AI 自主决定思考内容和深度 |
| 后端对接 | 需要重写 | SSE 协议已设计好，直接对接 |
| 信息密度 | 低（每步一句话） | 高（完整的推理文本流） |
| 用户控制 | 无（只能看） | 可折叠/展开，思考中可取消 |
| 行业对齐 | ❌ 不符合主流范式 | ✅ 对齐 ChatGPT/DeepSeek/Claude |

---

## 4. 卷面编辑能力增强

### 4.1 题目拖拽排序

**设计**：
- 每道题目左侧增加拖拽手柄（⋮⋮ 图标），仅在 hover 时显示
- 支持同题型组内拖拽排序
- 支持跨题型组拖拽（拖到另一组时自动更新分组）
- 拖拽时原位置显示半透明占位符
- 松手后题目平滑归位（0.2s ease）

**实现**：
- 使用已安装的 `vuedraggable`（v4.1）
- 在 `questionGroups` computed 中处理分组逻辑
- 拖拽结束后更新 `currentPaper.questions` 数组顺序

### 4.2 分值调整

**设计**：
- 在题目操作弹窗中增加「分值」输入框（el-input-number，min: 1, max: 20, step: 1）
- 默认值继承题型默认分值（选择题 5 分、填空题 5 分、解答题 10 分、判断题 3 分）
- 分值变化后：
  - 自动更新该题所属分组的"共 XX 分"显示
  - 自动更新试卷 totalScore
  - 更新 paper-meta 中的满分显示

**实现**：在 `Question` 类型中已有 `score` 字段，直接修改即可。

### 4.3 批量操作工具栏

**位置**：卷面预览 header 下方，仅在 done 状态显示

**设计**：
- 工具栏内容：全选复选框 + 已选计数 + 「批量删除」「批量改编」「批量调整分值」按钮
- 点击全选后，所有题目左侧出现复选框
- 选中题目后高亮显示（浅色背景 + 左侧主题色边框）
- 批量改编：弹出改编配置弹窗（选择目标难度/题型），确认后对所有选中题目执行
- 批量调整分值：弹出分值输入弹窗，确认后统一设置
- 批量删除：弹出确认弹窗，显示将删除的题目数量

**实现**：新增 `selectedQuestionIds: ref<Set<string>>` 状态管理选中状态。

### 4.4 题目操作弹窗增强

**新增功能**：

1. **换知识点**：在快捷调整区域增加第三个按钮「换知识点」，点击后弹出知识点选择下拉框
2. **预览效果**：自定义需求输入后，「确认更换」按钮改为「预览效果」，点击后：
   - 弹窗内容切换为对比视图（左：当前题目 / 右：AI 改编预览）
   - 底部按钮变为「采用此题」「重新生成」「取消」
3. **相似题推荐**：弹窗底部增加「相似题目推荐」折叠区域，展示 2-3 道相似题目卡片，每张卡片显示题型、难度、内容预览，点击「替换」直接替换当前题目

---

## 5. 版本回撤功能

### 5.1 数据结构

```typescript
// 新增类型定义（types/index.ts）
interface QuestionVersion {
  question: Question    // 该版本的完整题目快照
  action: string        // 操作描述（"换难度"、"自定义改编"、"手动编辑"等）
  timestamp: string     // ISO 时间戳
}

// Store 中新增状态
questionVersions: Map<string, QuestionVersion[]>  // key: question.id
```

### 5.2 版本记录规则

以下操作触发版本记录（操作前自动压栈）：
- `adaptQuestion()` — 改编题目
- `replaceQuestion()` — 替换题目
- `saveEdit()` — 手动编辑保存
- 批量改编/批量调整分值中的单题操作

**限制**：每道题最多保留 10 个历史版本，超出时丢弃最旧的版本。

### 5.3 回撤交互 — 题目级

**入口**：
- 题目操作弹窗中增加「撤销」按钮（仅在版本栈非空时可用，显示可回撤次数如"撤销 (3)"）
- 被修改过的题目右上角显示小蓝点标记（表示有历史版本）

**版本列表面板**：
- 点击「撤销」按钮后，从弹窗右侧滑出版本列表面板（宽度 320px）
- 面板内容：
  - 标题："历史版本"
  - 按时间倒序排列的版本卡片：
    - 操作描述 + 相对时间（如"2 分钟前"）
    - 题目内容预览（前 50 字，超出省略号）
    - 当前版本标记（最顶部标注"当前"）
  - 点击某个版本卡片 → 展开对比视图

**对比视图**：
- 左右分栏对比：左 = 当前版本，右 = 选中的历史版本
- 差异部分高亮显示（文本 diff）
- 底部操作：「恢复此版本」「关闭」

### 5.4 全局撤销

**入口**：
- 卷面预览 header 中增加「撤销」图标按钮
- 支持 Ctrl+Z / Cmd+Z 快捷键

**行为**：
- 维护一个全局操作栈 `globalUndoStack: Array<{ questionId: string, version: QuestionVersion }>`
- 每次题目变更操作同时压入全局栈
- Ctrl+Z 时弹出最近一次操作的 toast 提示："已撤销：对第 3 题的换难度操作"
- 再次 Ctrl+Z 继续回撤上一次操作

**实现**：
- 在 `AppLayout.vue` 或 `AIExam.vue` 中监听 keydown 事件
- 在 `exam.ts` 中新增 `undoLastAction()` action

---

## 6. 其他交互细节优化

### 6.1 参数配置栏优化

- 场景预设后，被修改的参数以主题色标签形式展示在参数栏下方
- 增加「重置为默认」文字按钮（仅在参数被修改后显示），点击后恢复场景默认值

### 6.2 对话区优化

- init 状态的欢迎语增加打字机效果（逐字显示，0.8s 完成）
- 快捷场景按钮增加左侧图标（使用 Element Plus 图标或 emoji）

### 6.3 卷面预览优化

- 增加「缩放」控制按钮组：适应宽度 / 100% / 150%
- 增加「显示/隐藏答案解析」切换开关
- 试卷标题支持点击编辑（inline edit）

---

## 7. 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 新增 `QuestionVersion`、`SSEEvent` 类型 |
| `src/stores/exam.ts` | 修改 | 重写 `generateExam()` 为流式思考模式；新增版本管理、取消生成、全局撤销等 actions 和状态；新增 `thinkingText`、`isThinking`、`isThinkingCompleted`、`thinkingDuration`、`thinkingStartTime` 等状态 |
| `src/views/AIExam.vue` | 修改 | 流程进度指示器、过渡动画、拖拽排序、批量操作、版本回撤 UI；替换 ReasoningSteps 为 ThinkingBubble |
| `src/components/ThinkingBubble.vue` | **新增** | 流式思考气泡组件（替代 ReasoningSteps.vue） |
| `src/components/ReasoningSteps.vue` | **废弃** | 保留文件但不再使用，后续可删除 |
| `src/components/FlowProgress.vue` | **新增** | 流程进度指示器组件 |
| `src/components/SummaryCard.vue` | **新增** | 试卷摘要卡片组件 |
| `src/components/VersionPanel.vue` | **新增** | 版本历史列表面板组件 |
| `src/components/DiffViewer.vue` | **新增** | 题目版本对比视图组件 |

---

## 8. 优先级排序

### P1（核心体验）
1. 流式思考气泡（ThinkingBubble）— 替代固定步骤流水线
2. 流程进度指示器
3. 状态过渡动画优化
4. 完成摘要卡片
5. 题目拖拽排序
6. 版本回撤（版本栈 + 回撤交互）

### P2（增强体验）
7. 取消生成按钮
8. 分值调整
9. 批量操作工具栏
10. 操作弹窗增强
11. 全局撤销（Ctrl+Z）
12. 卷面预览缩放/答案切换

### P3（锦上添花）
13. 参数配置栏优化
14. 对话区细节优化（打字机效果、场景图标）
