# 启动 AI 出题助手开发服务

## 摘要
修复 npm 依赖中缺失的 Linux ARM64 平台包，然后启动 Vite 开发服务器。

## 当前状态分析
- **项目路径**: `ai-question-generator/`
- **环境**: Linux aarch64, Node v22.22.2, npm 10.9.4
- **已安装依赖**: vue, vite, element-plus, vue-router, pinia 等核心包已存在
- **阻塞问题**: `@rollup/rollup-darwin-arm64` 已安装，但缺少 `@rollup/rollup-linux-arm64-gnu`，导致 vite 无法启动（rollup 报错 MODULE_NOT_FOUND）
- **根因**: npm optional dependencies 安装 bug，错误地安装了 darwin 平台包而非 linux 平台包

## 执行步骤

### 步骤 1：安装缺失的平台包
```bash
cd ai-question-generator
npm install @rollup/rollup-linux-arm64-gnu --save-optional
```
- 如果上述命令因网络问题失败，尝试先删除 `node_modules/@rollup/rollup-darwin-arm64` 再重新安装

### 步骤 2：启动 Vite 开发服务器
```bash
npx vite --host 0.0.0.0 --port 5173
```

### 步骤 3：验证服务启动
- 确认控制台输出 `Local: http://localhost:5173/`
- 通过浏览器访问确认页面可加载

## 假设与决策
- 假设网络可以正常访问 npm registry
- 如果 `@rollup/rollup-linux-arm64-gnu` 不可用，备选方案是安装 `@rollup/rollup-linux-arm64-musl`

## 验证
- Vite 启动无报错
- 浏览器可访问 `http://localhost:5173/` 并看到 AI 出题助手界面
