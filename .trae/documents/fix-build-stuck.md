# 修复构建卡住问题

## 问题诊断

**根因**：项目运行在 **linux arm64** 环境下，但 `node_modules/@rollup/` 目录完全缺失。rollup（vite 的底层打包工具）需要平台对应的原生模块 `@rollup/rollup-linux-arm64-gnu`，由于 npm 的 optional dependencies bug（[npm/cli#4828](https://github.com/npm/cli/issues/4828)），该模块未被正确安装。

**错误信息**：
```
Error: Cannot find module @rollup/rollup-linux-arm64-gnu
```

## 修复方案

删除 `node_modules` 和 `package-lock.json`，重新安装依赖，让 npm 在当前 arm64 环境下正确解析平台依赖。

### 步骤

1. **清理旧依赖**
   - 删除 `node_modules/` 目录
   - 删除 `package-lock.json` 文件

2. **重新安装依赖**
   - 执行 `npm install`，npm 会根据当前 `linux/arm64` 平台正确安装 `@rollup/rollup-linux-arm64-gnu`

3. **验证构建**
   - 执行 `npm run build`，确认 `vue-tsc` 类型检查 + `vite build` 打包均通过

## 涉及文件

- `ai-question-generator/node_modules/`（删除后重建）
- `ai-question-generator/package-lock.json`（删除后重建）

## 验证标准

- `npm run build` 输出 `dist/` 目录且无报错
- 构建产物包含 `index.html`、JS/CSS 资源文件
