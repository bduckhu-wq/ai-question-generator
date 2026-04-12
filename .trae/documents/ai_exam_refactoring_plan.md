# AIExam.vue 文件拆分计划

## 问题分析

AIExam.vue 文件当前大小为 **66K**，包含了大量的代码，超出了合理的文件大小阈值。这会导致以下问题：
- 代码可读性差
- 维护困难
- 编译时间长
- 团队协作效率低

## 拆分策略

采用**功能模块化**的拆分策略，将 AIExam.vue 拆分为以下几个部分：

### 1. 组件拆分

| 原文件部分 | 新组件名称 | 功能职责 | 文件路径 |
|-----------|-----------|---------|----------|
| 题目操作弹窗 | QuestionActionDialog.vue | 处理题目的各种操作（删除、改编、调整难度等） | src/components/QuestionActionDialog.vue |
| 批量操作弹窗 | BatchActionDialog.vue | 处理批量操作（批量删除、改编、调整分值） | src/components/BatchActionDialog.vue |
| 输入参数面板 | ParamInputPanel.vue | 处理出题参数的输入和配置 | src/components/ParamInputPanel.vue |
| 初始化场景选择 | QuickScenes.vue | 处理快捷场景选择功能 | src/components/QuickScenes.vue |
| 卷面预览 | ExamPreview.vue | 处理试卷预览和相关操作 | src/components/ExamPreview.vue |

### 2. 逻辑拆分

| 原文件逻辑 | 新模块名称 | 功能职责 | 文件路径 |
|-----------|-----------|---------|----------|
| 对话逻辑 | useExamChat.ts | 处理对话流程和消息管理 | src/composables/useExamChat.ts |
| 参数处理逻辑 | useExamParams.ts | 处理出题参数的管理和验证 | src/composables/useExamParams.ts |
| 文件上传逻辑 | useExamUpload.ts | 处理参考素材的上传和管理 | src/composables/useExamUpload.ts |
| 批量操作逻辑 | useBatchOperations.ts | 处理批量操作相关逻辑 | src/composables/useBatchOperations.ts |

### 3. 类型定义拆分

| 原文件类型 | 新文件名称 | 功能职责 | 文件路径 |
|-----------|-----------|---------|----------|
| 考试相关类型 | exam.ts | 定义考试相关的类型接口 | src/types/exam.ts |

## 实现步骤

### 步骤 1：创建组件目录结构

1. 检查 src/components 目录结构
2. 创建必要的子目录（如果需要）

### 步骤 2：拆分组件

1. 创建 QuestionActionDialog.vue 组件
2. 创建 BatchActionDialog.vue 组件
3. 创建 ParamInputPanel.vue 组件
4. 创建 QuickScenes.vue 组件
5. 创建 ExamPreview.vue 组件

### 步骤 3：拆分逻辑

1. 创建 useExamChat.ts  composable
2. 创建 useExamParams.ts  composable
3. 创建 useExamUpload.ts  composable
4. 创建 useBatchOperations.ts  composable

### 步骤 4：拆分类型定义

1. 创建 src/types/exam.ts 文件
2. 移动相关类型定义到新文件

### 步骤 5：重构 AIExam.vue

1. 导入新创建的组件和 composables
2. 替换原有的内联组件和逻辑
3. 保持核心功能不变
4. 优化代码结构和可读性

### 步骤 6：测试验证

1. 运行开发服务器
2. 测试所有功能是否正常工作
3. 检查是否有编译错误或运行时错误

## 潜在风险和考虑因素

### 风险

1. **功能回归**：拆分过程中可能会导致某些功能失效
2. **依赖关系**：组件间的依赖关系可能变得复杂
3. **性能影响**：过多的组件可能会影响渲染性能

### 缓解措施

1. **单元测试**：为每个组件编写单元测试
2. **集成测试**：测试组件间的交互
3. **性能优化**：使用 Vue 的异步组件和缓存策略
4. **代码审查**：仔细审查拆分后的代码

## 预期结果

1. AIExam.vue 文件大小显著减少（预计减少 60-70%）
2. 代码结构更加清晰，易于维护
3. 组件复用性提高
4. 开发和调试效率提升

## 技术栈

- Vue 3 Composition API
- TypeScript
- Element Plus
- Vite