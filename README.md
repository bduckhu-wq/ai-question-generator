# AI Question Generator

一个基于Vue 3的AI题库生成工具，用于创建和管理题库。

## 功能特性

- AI题库生成
- 题库管理
- 智能导入
- 考试模拟

## 技术栈

- Vue 3
- TypeScript
- Vue Router
- Pinia
- Element Plus
- Vite

## 安装步骤

1. 克隆项目到本地

```bash
git clone https://github.com/bduckhu-wq/ai-question-generator.git
cd ai-question-generator
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

4. 构建生产版本

```bash
npm run build
```

5. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
├── src/
│   ├── assets/         # 静态资源
│   ├── components/     # 组件
│   ├── mock/           # 模拟数据
│   ├── router/         # 路由
│   ├── stores/         # 状态管理
│   ├── types/          # TypeScript类型定义
│   ├── views/          # 页面
│   ├── App.vue         # 根组件
│   └── main.ts         # 入口文件
├── index.html          # HTML模板
├── package.json        # 项目配置
└── vite.config.ts      # Vite配置
```

## 部署说明

### 开发环境

使用 `npm run dev` 启动开发服务器，默认访问地址为 `http://localhost:5173`。

### 生产环境

1. 运行 `npm run build` 构建生产版本，构建产物会输出到 `dist` 目录。
2. 将 `dist` 目录部署到任何静态网站托管服务，如：
   - GitHub Pages
   - Vercel
   - Netlify
   - 阿里云OSS
   - 腾讯云COS

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT
