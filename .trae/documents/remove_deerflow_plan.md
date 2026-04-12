# 删除 DeerFlow 相关代码计划

## 项目分析

通过搜索，发现项目中包含以下与 DeerFlow 相关的文件：

1. **核心文件**：
   - [src/services/deerflow.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/services/deerflow.ts) - DeerFlow 服务配置
   - [src/composables/useDeerFlowChat.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/composables/useDeerFlowChat.ts) - DeerFlow 聊天功能
   - [src/composables/useDeerFlowUpload.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/composables/useDeerFlowUpload.ts) - DeerFlow 文件上传
   - [src/composables/useDeerFlowSkills.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/composables/useDeerFlowSkills.ts) - DeerFlow 技能管理

2. **组件文件**：
   - [src/components/DeerFlowChat.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/components/DeerFlowChat.vue) - DeerFlow 聊天组件
   - [src/views/DeerFlowChat.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/views/DeerFlowChat.vue) - DeerFlow 聊天页面

3. **引用文件**：
   - [src/views/AIExam.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/views/AIExam.vue) - 引用了 DeerFlow 相关功能
   - [src/components/layout/SideBar.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/components/layout/SideBar.vue) - 包含 DeerFlow 菜单项
   - [src/router/index.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/router/index.ts) - 包含 DeerFlow 路由

## 执行计划

### 步骤 1：删除核心文件
- 删除 [src/services/deerflow.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/services/deerflow.ts)
- 删除 [src/composables/useDeerFlowChat.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/composables/useDeerFlowChat.ts)
- 删除 [src/composables/useDeerFlowUpload.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/composables/useDeerFlowUpload.ts)
- 删除 [src/composables/useDeerFlowSkills.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/composables/useDeerFlowSkills.ts)

### 步骤 2：删除组件文件
- 删除 [src/components/DeerFlowChat.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/components/DeerFlowChat.vue)
- 删除 [src/views/DeerFlowChat.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/views/DeerFlowChat.vue)

### 步骤 3：修改引用文件

**修改 [src/views/AIExam.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/views/AIExam.vue)**：
- 移除 DeerFlow 相关导入
- 移除 DeerFlow 相关状态和函数
- 简化 startGenerate 和 handleSend 函数，移除 DeerFlow 相关逻辑
- 确保本地生成逻辑正常工作

**修改 [src/components/layout/SideBar.vue](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/components/layout/SideBar.vue)**：
- 移除 DeerFlow 菜单项

**修改 [src/router/index.ts](file:///Users/pinya_hu/Desktop/tare SOLO beta/AI_Quiz/ai-question-generator/src/router/index.ts)**：
- 移除 DeerFlow 路由配置

## 风险处理

1. **功能影响**：删除 DeerFlow 后，系统将回退到本地生成逻辑，确保本地生成功能正常工作
2. **代码依赖**：确保所有 DeerFlow 相关的导入和引用都被正确移除
3. **构建错误**：删除文件后需要运行构建命令确保项目能正常构建

## 验证步骤

1. 运行 `npm run dev` 确保开发服务器正常启动
2. 测试 AI 组卷功能，确保本地生成逻辑正常工作
3. 运行 `npm run build` 确保项目能正常构建
4. 检查是否有任何编译错误或警告

## 预期结果

- 项目中不再包含任何 DeerFlow 相关代码
- 系统使用本地生成逻辑正常工作
- 项目能正常构建和运行