# AI 组卷交互设计优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 AI 组卷页面的交互设计，使其更贴合教师真实使用预期，同时预留后续接入大模型/Agent API 的服务入口。

**Architecture:** 保持 Vue 3 + Pinia + Element Plus 技术栈不变。在现有对话驱动架构上优化：1) 新增教材版本参数和学科相关题型；2) 参数面板改为摘要卡片+按需展开模式；3) 自然语言输入增加追问补齐逻辑；4) 新增知识点覆盖度面板组件；5) API 层扩展为支持 mock/真实双模式。

**Tech Stack:** Vue 3, TypeScript, Pinia, Element Plus, vuedraggable, Vite

**Spec 文档:** `AI组卷交互设计优化-spec.md`（workspace 根目录）

---

## 文件结构总览

```
src/
├── types/index.ts                    # [修改] 新增类型定义
├── utils/geo.ts                      # [新建] IP 地理位置定位工具
├── mock/index.ts                     # [修改] 更新 mock 数据
├── api/
│   ├── adapters/base.ts              # [修改] 扩展接口定义
│   ├── adapters/coze.ts              # [保留] 不变
│   ├── adapters/mock-adapter.ts      # [新建] Mock 适配器
│   └── index.ts                      # [修改] 工厂函数支持 mock 模式
├── stores/exam.ts                    # [修改] 新增追问逻辑、覆盖度计算、地区自动获取
├── components/
│   ├── ParamSummaryCard.vue          # [新建] 参数摘要卡片组件
│   ├── CoveragePanel.vue             # [新建] 知识点覆盖度面板
│   ├── ClarifyQuestion.vue           # [新建] 追问消息组件
│   └── ChapterSelect.vue             # [新建] 章节多选组件
├── views/AIExam.vue                  # [修改] 主要交互重构
└── assets/styles/global.css          # [修改] 新增 CSS 变量
```

---

### Task 1: 扩展类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 新增教材版本和地区类型**

在 `types/index.ts` 中，在 `type Grade = ...` 之后添加：

```typescript
// 教材版本
export type TextbookVersion = 'pep' | 'bs' | 'su' | 'zj' | 'hu' | 'jb' | 'fltrp' | string

// 地区
export type Region = string
```

- [ ] **Step 2: 新增教材版本标签常量**

在 `GRADE_LABELS` 之后添加：

```typescript
export const TEXTBOOK_VERSION_LABELS: Record<string, string> = {
  pep: '人教版',
  bs: '北师大版',
  su: '苏教版',
  zj: '浙教版',
  hu: '沪教版',
  jb: '冀教版',
  fltrp: '外研版'
}

export const REGION_LABELS: Record<string, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangdong: '广东',
  zhejiang: '浙江',
  jiangsu: '江苏',
  shandong: '山东',
  sichuan: '四川',
  hubei: '湖北',
  hunan: '湖南',
  henan: '河南',
  hebei: '河北',
  fujian: '福建',
  anhui: '安徽',
  liaoning: '辽宁',
  jiangxi: '江西',
  shaanxi: '陕西',
  gansu: '甘肃',
  guangxi: '广西',
  yunnan: '云南',
  guizhou: '贵州',
  chongqing: '重庆',
  tianjin: '天津',
  other: '其他'
}
```

- [ ] **Step 3: 新增学科相关题型映射**

在 `SCENE_LABELS` 之后添加：

```typescript
// 学科相关题型映射
export const SUBJECT_QUESTION_TYPES: Record<Subject, QuestionType[]> = {
  math: ['choice', 'fillBlank', 'shortAnswer'],
  chinese: ['choice', 'fillBlank', 'shortAnswer', 'shortAnswer'],
  english: ['choice', 'fillBlank', 'shortAnswer', 'shortAnswer'],
  physics: ['choice', 'fillBlank', 'shortAnswer'],
  chemistry: ['choice', 'fillBlank', 'shortAnswer'],
  biology: ['choice', 'fillBlank', 'shortAnswer'],
  history: ['choice', 'shortAnswer'],
  geography: ['choice', 'shortAnswer'],
  politics: ['choice', 'shortAnswer']
}

// 学科题型标签（学科特定的题型名称）
export const SUBJECT_TYPE_LABELS: Record<string, Record<QuestionType, string>> = {
  math: { choice: '选择题', fillBlank: '填空题', shortAnswer: '解答题', judgment: '判断题' },
  chinese: { choice: '选择题', fillBlank: '默写题', shortAnswer: '阅读/作文', judgment: '判断题' },
  english: { choice: '阅读/完形', fillBlank: '语法填空', shortAnswer: '写作/七选五', judgment: '判断题' },
  physics: { choice: '选择题', fillBlank: '填空/实验题', shortAnswer: '计算题', judgment: '判断题' },
  chemistry: { choice: '选择题', fillBlank: '填空/实验题', shortAnswer: '计算题', judgment: '判断题' },
  biology: { choice: '选择题', fillBlank: '填空题', shortAnswer: '实验探究题', judgment: '判断题' },
  history: { choice: '选择题', fillBlank: '材料题', shortAnswer: '简答题', judgment: '判断题' },
  geography: { choice: '选择题', fillBlank: '综合题', shortAnswer: '读图题', judgment: '判断题' },
  politics: { choice: '选择题', fillBlank: '材料分析', shortAnswer: '简答题', judgment: '判断题' }
}
```

- [ ] **Step 4: 更新 ExamCondition 接口**

替换现有的 `ExamCondition` 接口为：

```typescript
// 考试范围
export interface ExamScope {
  chapters: string[]
  textbookVersion: TextbookVersion
}

// 题型配置项
export interface QuestionTypeConfig {
  type: QuestionType
  count: number
  scorePerQuestion: number
}

// 出题条件（更新版）
export interface ExamCondition {
  subject?: Subject
  grade?: Grade
  textbookVersion?: TextbookVersion
  region?: Region
  scene?: ExamScene
  scope?: ExamScope
  questionTypeConfigs?: QuestionTypeConfig[]
  // 兼容旧字段
  questionTypes?: QuestionType[]
  difficulty?: Difficulty
  difficultyRatio?: DifficultyRatio
  knowledgePoints?: string[]
  count?: number
  duration?: number
  referenceFiles?: ReferenceFile[]
  customRequirement?: string
  // 高级选项
  sourcePreference?: 'bank' | 'realExam' | 'schoolExam' | 'original'
  excludeUsedQuestions?: boolean
  title?: string
  schoolName?: string
}
```

- [ ] **Step 5: 新增知识点覆盖度类型**

在 `ExamSummary` 之后添加：

```typescript
// 知识点覆盖度
export interface CoverageItem {
  knowledgePoint: string
  chapter: string
  coveredCount: number
  suggestedCount: number
  coverageRate: number
  questions: string[]  // 已覆盖的题目 ID 列表
}

// 追问缺失信息
export interface MissingInfo {
  subject?: boolean
  grade?: boolean
  textbookVersion?: boolean
  scope?: boolean
  scene?: boolean
}
```

- [ ] **Step 6: 更新章节数据 key 格式**

将 `CHAPTER_OPTIONS` 的 key 格式从 `'math-grade10'` 改为 `'math-grade10-pep'`，同时保留旧格式作为默认（pep）的兼容：

```typescript
// 更新 CHAPTER_OPTIONS：key 格式为 '学科-年级-教材版本'
// 保留旧 key 作为 pep（人教版）的别名
export const CHAPTER_OPTIONS: Record<string, string[]> = {
  // ===== 数学 =====
  // 人教版（默认）
  'math-grade7-pep': ['有理数', '整式的加减', '一元一次方程', '几何图形初步'],
  'math-grade8-pep': ['三角形', '全等三角形', '轴对称', '整式的乘法与因式分解', '分式'],
  'math-grade9-pep': ['一元二次方程', '二次函数', '旋转', '圆', '概率初步'],
  'math-grade10-pep': ['集合与函数', '基本初等函数', '函数的应用', '空间几何体', '点线面关系'],
  'math-grade11-pep': ['三角函数', '数列', '不等式', '立体几何', '解析几何', '导数及其应用'],
  'math-grade12-pep': ['集合与逻辑', '函数与导数', '三角函数', '数列', '解析几何', '概率统计'],
  // 北师大版
  'math-grade7-bs': ['丰富的图形世界', '有理数及其运算', '字母表示数', '平面图形及其位置关系', '一元一次方程'],
  'math-grade8-bs': ['勾股定理', '实数', '位置与坐标', '一次函数', '二元一次方程组', '数据的分析', '平行线的证明'],
  'math-grade9-bs': ['特殊平行四边形', '一元二次方程', '概率', '直角三角形', '二次函数', '圆'],
  'math-grade10-bs': ['集合', '函数', '指数函数和对数函数'],
  'math-grade11-bs': ['数列', '统计与概率', '综合'],
  'math-grade12-bs': ['导数应用', '综合复习'],
  // 苏教版
  'math-grade7-su': ['数学与我们同行', '有理数', '用字母表示数', '一元一次方程', '走进图形世界'],
  'math-grade8-su': ['勾股定理', '实数', '平面直角坐标系', '一次函数', '二元一次方程组', '数据的集中趋势和离散程度', '平行四边形'],
  'math-grade9-su': ['一元二次方程', '对称图形——圆', '数据的集中趋势', '等可能条件下的概率'],
  'math-grade10-su': ['集合', '函数概念与基本初等函数', '指数函数、对数函数和幂函数'],
  'math-grade11-su': ['解三角形', '数列', '不等式', '统计'],
  'math-grade12-su': ['导数及其应用', '统计与概率'],

  // ===== 语文 =====
  'chinese-grade7-pep': ['现代文阅读', '古诗文', '写作基础', '语言运用'],
  'chinese-grade8-pep': ['现代文阅读', '文言文', '写作进阶', '名著阅读'],
  'chinese-grade9-pep': ['现代文阅读', '古诗文', '综合性学习', '写作'],
  'chinese-grade10-pep': ['现代文阅读', '文言文', '诗词鉴赏', '写作', '语言文字运用'],
  'chinese-grade11-pep': ['现代文阅读', '文言文', '诗词鉴赏', '写作', '名著导读'],
  'chinese-grade12-pep': ['现代文阅读', '文言文', '诗词鉴赏', '写作', '语言文字运用'],
  'chinese-grade7-bs': ['感受自然', '感悟人生', '童话与寓言', '古诗与对联'],
  'chinese-grade8-bs': ['科学之光的照耀', '感受艺术之美', '民俗风情', '文言文启蒙'],
  'chinese-grade9-bs': ['诗意的栖居', '小说之林', '戏剧天地', '文言文品读'],
  'chinese-grade10-bs': ['诗歌欣赏', '散文阅读', '文言文', '写作'],
  'chinese-grade11-bs': ['现代文阅读', '古诗文', '写作', '名著导读'],
  'chinese-grade12-bs': ['现代文阅读', '古诗文', '写作', '语言运用'],

  // ===== 英语 =====
  'english-grade7-pep': ['阅读理解', '完形填空', '语法基础', '写作', '听力'],
  'english-grade8-pep': ['阅读理解', '完形填空', '语法进阶', '写作', '词汇'],
  'english-grade9-pep': ['阅读理解', '完形填空', '语法综合', '写作', '任务型阅读'],
  'english-grade10-pep': ['阅读理解', '完形填空', '语法填空', '写作', '七选五'],
  'english-grade11-pep': ['阅读理解', '完形填空', '语法填空', '写作', '读后续写'],
  'english-grade12-pep': ['阅读理解', '完形填空', '语法填空', '写作', '读后续写'],
  'english-grade7-bs': ['听说入门', '阅读基础', '语法启蒙', '写作起步'],
  'english-grade8-bs': ['听说进阶', '阅读理解', '完形填空', '写作提升'],
  'english-grade9-bs': ['综合阅读', '完形填空', '语法综合', '写作'],
  'english-grade10-bs': ['阅读理解', '完形填空', '语法填空', '写作'],
  'english-grade11-bs': ['阅读理解', '完形填空', '读后续写', '写作'],
  'english-grade12-bs': ['阅读理解', '完形填空', '读后续写', '写作'],

  // ===== 物理 =====
  'physics-grade8-pep': ['声现象', '光现象', '透镜', '物态变化', '质量与密度'],
  'physics-grade9-pep': ['力', '运动和力', '压强', '浮力', '功和机械能', '电学基础'],
  'physics-grade10-pep': ['运动的描述', '力与运动', '牛顿运动定律', '曲线运动', '万有引力'],
  'physics-grade11-pep': ['静电场', '恒定电流', '磁场', '电磁感应', '交变电流'],
  'physics-grade12-pep': ['热学', '光学', '动量', '原子物理', '力学综合'],
  'physics-grade8-bs': ['声与光', '力学初步', '热学初步'],
  'physics-grade9-bs': ['电学', '磁学', '能量守恒'],
  'physics-grade10-bs': ['力学', '运动学', '动力学'],
  'physics-grade11-bs': ['电磁学', '交流电'],
  'physics-grade12-bs': ['综合复习', '实验专题'],

  // ===== 化学 =====
  'chemistry-grade9-pep': ['走进化学世界', '空气和氧气', '水与溶液', '碳和碳的氧化物', '金属', '酸碱盐'],
  'chemistry-grade10-pep': ['物质的分类', '离子反应', '氧化还原反应', '钠及其化合物', '铁及其化合物'],
  'chemistry-grade11-pep': ['化学反应原理', '化学平衡', '电离平衡', '电化学', '有机化学基础'],
  'chemistry-grade12-pep': ['化学实验', '物质结构', '化学计算', '有机化学进阶'],
  'chemistry-grade9-bs': ['化学入门', '空气', '水', '物质构成的奥秘'],
  'chemistry-grade10-bs': ['化学计量', '离子反应', '氧化还原'],
  'chemistry-grade11-bs': ['化学反应与能量', '化学平衡', '水溶液中的离子平衡'],
  'chemistry-grade12-bs': ['有机化学', '化学实验'],

  // ===== 生物 =====
  'biology-grade7-pep': ['生物和生物圈', '细胞', '植物', '人体营养'],
  'biology-grade8-pep': ['人体的运动', '生物的生殖', '生物的遗传', '生物的变异'],
  'biology-grade9-pep': ['生物与环境', '生物多样性', '生物技术', '健康生活'],
  'biology-grade10-pep': ['细胞的分子组成', '细胞结构', '细胞代谢', '细胞分裂', '遗传的基本规律'],
  'biology-grade11-pep': ['遗传与进化', '植物的激素调节', '神经调节', '免疫调节', '生态系统'],
  'biology-grade12-pep': ['生物技术实践', '生物科学与社会', '现代生物科技专题'],
  'biology-grade7-bs': ['生物与环境', '生物体的结构层次', '生物圈中的绿色植物'],
  'biology-grade8-bs': ['生物圈中的人', '生物的生殖发育与遗传', '生物的多样性'],
  'biology-grade9-bs': ['生物技术', '健康地生活', '科学探究'],
  'biology-grade10-bs': ['细胞', '遗传与进化', '稳态与环境'],
  'biology-grade11-bs': ['生命活动的调节', '生物与环境'],
  'biology-grade12-bs': ['现代生物科技', '实验专题'],

  // ===== 历史 =====
  'history-grade7-pep': ['中华文明的起源', '夏商周时期', '秦汉时期', '三国两晋南北朝'],
  'history-grade8-pep': ['隋唐时期', '宋元时期', '明清时期', '近代中国'],
  'history-grade9-pep': ['中国古代史', '中国近代史', '中国现代史', '世界历史'],
  'history-grade10-pep': ['古代中国政治制度', '古代中国经济', '古代中国文化', '古代中国科技'],
  'history-grade11-pep': ['近代中国', '现代中国', '古代希腊罗马', '近代西方'],
  'history-grade12-pep': ['史学理论', '历史热点专题', '中外历史比较'],
  'history-grade7-bs': ['中华文明的起源', '国家的产生和社会变革', '统一国家的建立'],
  'history-grade8-bs': ['繁荣与开放的时代', '民族关系发展和社会变化', '明清时期'],
  'history-grade9-bs': ['殖民扩张与民族解放', '工业革命', '马克思主义'],
  'history-grade10-bs': ['古代中国政治', '古代中国经济', '古代中国文化'],
  'history-grade11-bs': ['近代中国', '现代中国', '世界历史'],
  'history-grade12-bs': ['中外历史比较', '热点专题'],

  // ===== 地理 =====
  'geography-grade7-pep': ['地球与地图', '大洲与大洋', '天气与气候', '居民与聚落'],
  'geography-grade8-pep': ['中国地理概况', '中国自然资源', '中国经济发展', '中国区域地理'],
  'geography-grade9-pep': ['世界地理', '世界自然资源', '世界经济发展', '世界区域地理'],
  'geography-grade10-pep': ['自然地理', '人文地理', '区域可持续发展', '地理信息技术'],
  'geography-grade11-pep': ['自然地理', '人文地理', '区域地理', '环境保护'],
  'geography-grade12-pep': ['地理综合', '热点专题', '地理实践'],
  'geography-grade7-bs': ['地球与地图', '大洲和大洋', '天气与气候'],
  'geography-grade8-bs': ['中国地理', '中国自然资源', '中国经济地理'],
  'geography-grade9-bs': ['世界地理', '区域地理'],
  'geography-grade10-bs': ['自然地理', '人文地理'],
  'geography-grade11-bs': ['区域可持续发展', '环境保护'],
  'geography-grade12-bs': ['综合复习'],

  // ===== 政治 =====
  'politics-grade7-pep': ['成长的节拍', '认识自己', '友谊与交往', '生命的思考'],
  'politics-grade8-pep': ['社会生活', '遵守规则', '责任与角色', '国家利益'],
  'politics-grade9-pep': ['富强之路', '民主与法治', '文明与家园', '和谐与梦想'],
  'politics-grade10-pep': ['中国特色社会主义', '经济与社会', '政治与法治', '哲学与文化'],
  'politics-grade11-pep': ['当代国际政治', '经济全球化', '文化传承', '社会热点'],
  'politics-grade12-pep': ['科学社会主义', '经济学常识', '法律与生活', '逻辑与思维'],
  'politics-grade7-bs': ['认识自己', '学会交往', '学会学习'],
  'politics-grade8-bs': ['权利与义务', '法律与社会', '社会责任'],
  'politics-grade9-bs': ['国情教育', '理想与责任'],
  'politics-grade10-bs': ['经济生活', '政治生活'],
  'politics-grade11-bs': '文化生活', '生活与哲学'],
  'politics-grade12-bs': ['综合复习', '时事热点'],
}
```

> 注意：北师大版等非人教版的部分章节数据为示意性内容，后续需由教研团队校准。当前目的是建立数据结构框架。

- [ ] **Step 7: 验证 TypeScript 编译**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vue-tsc --noEmit 2>&1 | head -30`
Expected: 可能有类型错误（因为其他文件引用了旧接口），这些在后续 Task 中修复。

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: 扩展类型定义 - 教材版本/学科题型/覆盖度/追问"
```

---

### Task 2: 新增 IP 地理位置定位工具

**Files:**
- Create: `src/utils/geo.ts`

- [ ] **Step 1: 创建 IP 定位工具函数**

创建 `src/utils/geo.ts`：

```typescript
// IP 地理位置定位工具
// 使用免费公共 API 根据用户 IP 获取省份信息
// 获取失败时静默忽略，不影响主流程

interface GeoResult {
  province: string
  regionCode: string
}

// IP 定位 API 列表（按优先级排序，失败自动切换下一个）
const GEO_API_LIST = [
  {
    name: 'ip-api',
    url: 'http://ip-api.com/json/?lang=zh-CN',
    parse: (data: any): GeoResult | null => {
      if (data.status === 'success' && data.regionName) {
        return { province: data.regionName, regionCode: data.region || '' }
      }
      return null
    }
  },
  {
    name: 'ipuser',
    url: 'https://ipuser.in/api/geo',
    parse: (data: any): GeoResult | null => {
      if (data.province) {
        return { province: data.province, regionCode: data.province_code || '' }
      }
      return null
    }
  }
]

// 省份名称到 region code 的映射
const PROVINCE_TO_REGION: Record<string, string> = {
  '北京': 'beijing', '天津市': 'tianjin', '上海': 'shanghai', '重庆': 'chongqing',
  '河北': 'hebei', '山西': 'shanxi', '辽宁': 'liaoning', '吉林': 'jilin', '黑龙江': 'heilongjiang',
  '江苏': 'jiangsu', '浙江': 'zhejiang', '安徽': 'anhui', '福建': 'fujian', '江西': 'jiangxi',
  '山东': 'shandong', '河南': 'henan', '湖北': 'hubei', '湖南': 'hunan', '广东': 'guangdong',
  '海南': 'hainan', '四川': 'sichuan', '贵州': 'guizhou', '云南': 'yunnan', '陕西': 'shaanxi',
  '甘肃': 'gansu', '青海': 'qinghai', '广西': 'guangxi', '西藏': 'xizang', '内蒙古': 'neimenggu',
  '宁夏': 'ningxia', '新疆': 'xinjiang', '台湾': 'taiwan', '香港': 'hongkong', '澳门': 'macao'
}

// 缓存结果，避免重复请求
let cachedResult: GeoResult | null = null
let fetchPromise: Promise<GeoResult | null> | null = null

/**
 * 根据用户 IP 自动获取地区信息
 * @returns 地区 regionCode（如 'beijing'），获取失败返回 null
 */
export async function detectUserRegion(): Promise<string | null> {
  // 有缓存直接返回
  if (cachedResult) return cachedResult.regionCode || null

  // 避免并发重复请求
  if (fetchPromise) return fetchPromise.then(r => r?.regionCode || null)

  fetchPromise = (async () => {
    for (const api of GEO_API_LIST) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000) // 3秒超时

        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        clearTimeout(timeout)

        if (!response.ok) continue

        const data = await response.json()
        const result = api.parse(data)

        if (result) {
          // 尝试映射到 regionCode
          const regionCode = PROVINCE_TO_REGION[result.province] || result.regionCode || null
          cachedResult = { ...result, regionCode: regionCode || '' }
          console.log(`[Geo] 检测到用户地区: ${result.province} (${regionCode})`)
          return cachedResult
        }
      } catch (error) {
        // 静默失败，尝试下一个 API
        console.warn(`[Geo] ${api.name} 定位失败:`, error instanceof Error ? error.message : error)
      }
    }

    console.log('[Geo] 所有定位 API 均失败，忽略地区字段')
    return null
  })()

  const result = await fetchPromise
  fetchPromise = null
  return result?.regionCode || null
}

/**
 * 获取省份名称
 */
export async function detectUserProvince(): Promise<string | null> {
  if (cachedResult) return cachedResult.province || null
  const region = await detectUserRegion()
  return cachedResult?.province || null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/geo.ts
git commit -m "feat: 新增 IP 地理位置定位工具（多 API 降级 + 缓存）"
```

---

### Task 3: 新增 Mock 适配器 + API 层扩展

**Files:**
- Create: `src/api/adapters/mock-adapter.ts`
- Modify: `src/api/adapters/base.ts`
- Modify: `src/api/index.ts`

- [ ] **Step 1: 扩展 base.ts 接口**

在 `src/api/adapters/base.ts` 中添加组卷生成接口：

```typescript
// 组卷生成参数
export interface GenerateExamParams {
  subject: string
  grade: string
  textbookVersion?: string
  scene: string
  chapters: string[]
  questionTypes: string[]
  difficultyRatio?: { easy: number; medium: number; hard: number }
  count: number
  duration?: number
  customRequirement?: string
}

// 组卷生成响应
export interface GenerateExamResponse {
  code: number
  message: string
  data: {
    questions: Array<{
      id: string
      type: string
      difficulty: string
      content: string
      options?: Array<{ label: string; content: string }>
      answer: string
      analysis?: string
      score: number
      source: 'bank' | 'ai'
      knowledgePoints: string[]
    }>
    title: string
    totalScore: number
    duration: number
  }
}

// 追问补齐响应
export interface ClarifyResponse {
  missingFields: string[]
  message: string
  quickOptions?: Record<string, string[]>
}

// 基础适配器接口（扩展）
export interface ExamAdapter {
  generateExam(params: GenerateExamParams): Promise<GenerateExamResponse>
  clarify(input: string): Promise<ClarifyResponse>
  adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse>
}
```

- [ ] **Step 2: 创建 Mock 适配器**

创建 `src/api/adapters/mock-adapter.ts`：

```typescript
import type { ExamAdapter, GenerateExamParams, GenerateExamResponse, ClarifyResponse, AdaptQuestionParams, AdaptQuestionResponse } from './base'
import { mockQuestions } from '../../mock'

export class MockAdapter implements ExamAdapter {
  async generateExam(params: GenerateExamParams): Promise<GenerateExamResponse> {
    // 模拟网络延迟
    await new Promise(r => setTimeout(r, 500))

    const total = params.count || 15
    const bankCount = Math.min(Math.ceil(total * 0.6), mockQuestions.length)
    const aiCount = total - bankCount

    // 从 mock 数据中筛选匹配题目
    const bankQuestions = mockQuestions
      .filter(q => {
        if (params.subject && q.subject !== params.subject) return false
        if (params.grade && q.grade !== params.grade) return true
        return true
      })
      .slice(0, bankCount)
      .map(q => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        content: q.content,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        score: q.score,
        source: 'bank' as const,
        knowledgePoints: q.knowledgePoints
      }))

    // AI 补充题目
    const aiQuestions = Array.from({ length: aiCount }, (_, i) => {
      const base = mockQuestions[i % mockQuestions.length]
      return {
        id: `ai-${Date.now()}-${i}`,
        type: base.type,
        difficulty: base.difficulty,
        content: base.content,
        options: base.options,
        answer: base.answer,
        analysis: base.analysis,
        score: base.score,
        source: 'ai' as const,
        knowledgePoints: base.knowledgePoints
      }
    })

    const allQuestions = [...bankQuestions, ...aiQuestions]
    const totalScore = allQuestions.reduce((sum, q) => sum + q.score, 0)

    return {
      code: 0,
      message: 'success',
      data: {
        questions: allQuestions,
        title: `${params.scene || '练习'}`,
        totalScore,
        duration: params.duration || 60
      }
    }
  }

  async clarify(input: string): Promise<ClarifyResponse> {
    await new Promise(r => setTimeout(r, 200))

    const missing: string[] = []
    const quickOptions: Record<string, string[]> = {}

    // 简单的关键词匹配来判断缺失信息
    const hasSubject = /数学|语文|英语|物理|化学|生物|历史|地理|政治/.test(input)
    const hasGrade = /七年级|八年级|九年级|高一|高二|高三|初一|初二|初三/.test(input)
    const hasVersion = /人教版|北师大版|苏教版|浙教版|沪教版/.test(input)
    const hasScope = /第[一二三四五六七八九十]+[章节单元]|全部|所有|综合/.test(input)
    const hasScene = /课后练习|单元测验|期中|期末|专项|错题|复习|考试|测试/.test(input)

    if (!hasSubject) {
      missing.push('subject')
      quickOptions.subject = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治']
    }
    if (!hasGrade) {
      missing.push('grade')
      quickOptions.grade = ['七年级', '八年级', '九年级', '高一', '高二', '高三']
    }
    if (!hasVersion) {
      missing.push('textbookVersion')
      quickOptions.textbookVersion = ['人教版', '北师大版', '苏教版', '浙教版', '沪教版']
    }
    if (!hasScope) {
      missing.push('scope')
      quickOptions.scope = ['全部章节', '最近学的章节']
    }
    if (!hasScene) {
      missing.push('scene')
      quickOptions.scene = ['课后练习', '单元测验', '期中复习', '期末复习', '专项训练']
    }

    const fieldLabels: Record<string, string> = {
      subject: '学科',
      grade: '年级',
      textbookVersion: '教材版本',
      scope: '考试范围',
      scene: '试卷场景'
    }

    const message = missing.length > 0
      ? `好的！还需要确认以下信息：\n${missing.map(f => `${fieldLabels[f] || f}？`).join('\n')}`
      : ''

    return { missingFields: missing, message, quickOptions }
  }

  async adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse> {
    await new Promise(r => setTimeout(r, 300))
    // Mock: 返回原题的简单变体
    return {
      code: 0,
      message: 'success',
      data: {
        adapted_questions: [{
          id: `adapted-${Date.now()}`,
          content: `[Mock改编] ${params.question_text}`,
          answer: '这是改编后的答案',
          analysis: '这是改编后的解析'
        }]
      }
    }
  }
}
```

- [ ] **Step 3: 更新 API 工厂函数**

修改 `src/api/index.ts`：

```typescript
import { MockAdapter } from './adapters/mock-adapter'
import { CozeAdapter } from './adapters/coze'
import type { ExamAdapter, GenerateExamParams, GenerateExamResponse, ClarifyResponse, AdaptQuestionParams, AdaptQuestionResponse } from './adapters/base'

// 根据配置选择适配器
function createAdapter(): ExamAdapter {
  const adapterType = import.meta.env.VITE_API_ADAPTER || 'mock'

  switch (adapterType) {
    case 'coze':
      return new CozeAdapter()
    case 'mock':
      return new MockAdapter()
    default:
      return new MockAdapter()
  }
}

const adapter = createAdapter()

// 组卷生成
export async function generateExam(params: GenerateExamParams): Promise<GenerateExamResponse> {
  return adapter.generateExam(params)
}

// 追问补齐
export async function clarifyInput(input: string): Promise<ClarifyResponse> {
  return adapter.clarify(input)
}

// 题目改编
export async function adaptQuestion(params: AdaptQuestionParams): Promise<AdaptQuestionResponse> {
  return adapter.adapt(params)
}

// 导出类型
export type {
  ExamAdapter,
  GenerateExamParams,
  GenerateExamResponse,
  ClarifyResponse,
  AdaptQuestionParams,
  AdaptQuestionResponse
} from './adapters/base'
```

- [ ] **Step 4: 更新 .env 文件**

修改 `.env`：

```
VITE_API_ADAPTER=mock
VITE_API_URL=/api/sc/coze/workflow/v1
VITE_API_AUTHORIZATION=Bearer sk-NYGMrvTNAD0ZFv3Y58D0Bc24E89f4f51B4CeB737979e96C2
VITE_SERVICE_KEY=ai_math_similar_question
```

> 将 `VITE_API_ADAPTER` 从 `coze` 改为 `mock`，当前使用模拟数据。

- [ ] **Step 5: 更新 CozeAdapter 实现新接口**

修改 `src/api/adapters/coze.ts`，使其实现 `ExamAdapter` 接口：

```typescript
import type { ExamAdapter, AdaptQuestionParams, AdaptQuestionResponse, GenerateExamParams, GenerateExamResponse, ClarifyResponse } from './base'
import { generateRequestId } from './base'

export class CozeAdapter implements ExamAdapter {
  async generateExam(params: GenerateExamParams): Promise<GenerateExamResponse> {
    // TODO: 对接真实组卷 API
    // 当前降级为抛出异常，由调用方处理
    throw new Error('Coze 组卷 API 尚未对接，请使用 mock 模式')
  }

  async clarify(input: string): Promise<ClarifyResponse> {
    // TODO: 对接真实 LLM API 进行意图识别
    throw new Error('Coze 追问 API 尚未对接，请使用 mock 模式')
  }

  async adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse> {
    const requestId = generateRequestId()
    const apiUrl = import.meta.env.VITE_API_URL || 'http://platform-test.mifengjiaoyu.com/api/sc/coze/workflow/v1'
    const serviceKey = import.meta.env.VITE_SERVICE_KEY || 'ai_math_similar_question'
    const authorization = import.meta.env.VITE_API_AUTHORIZATION || ''

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify({
        service_key: serviceKey,
        is_sync: true,
        request_id: requestId,
        params: JSON.stringify(params),
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return response.json()
  }
}
```

- [ ] **Step 6: 验证编译**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vue-tsc --noEmit 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/api/ .env
git commit -m "feat: 新增 Mock 适配器 + API 层扩展支持组卷/追问接口"
```

---

### Task 4: 新增 ParamSummaryCard 组件

**Files:**
- Create: `src/components/ParamSummaryCard.vue`

- [ ] **Step 1: 创建参数摘要卡片组件**

创建 `src/components/ParamSummaryCard.vue`：

```vue
<template>
  <div class="param-summary-card" :class="{ 'param-summary-card--expanded': isExpanded }">
    <div class="summary-header" @click="toggleExpand">
      <div class="summary-header-left">
        <span class="summary-icon">📋</span>
        <span class="summary-title">试卷参数</span>
        <span class="summary-brief">{{ briefText }}</span>
      </div>
      <button class="summary-toggle" :class="{ active: isExpanded }">
        {{ isExpanded ? '收起' : '编辑' }}
      </button>
    </div>

    <transition name="summary-expand">
      <div v-if="isExpanded" class="summary-body">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { SUBJECT_LABELS, GRADE_LABELS, TEXTBOOK_VERSION_LABELS, SCENE_LABELS } from '../types'
import type { ExamCondition } from '../types'

const props = defineProps<{
  condition: ExamCondition
}>()

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

const briefText = computed(() => {
  const parts: string[] = []
  if (props.condition.subject) parts.push(SUBJECT_LABELS[props.condition.subject] || '')
  if (props.condition.grade) parts.push(GRADE_LABELS[props.condition.grade] || '')
  if (props.condition.textbookVersion) parts.push(TEXTBOOK_VERSION_LABELS[props.condition.textbookVersion] || '')
  if (props.condition.scene) parts.push(SCENE_LABELS[props.condition.scene] || '')
  if (props.condition.scope?.chapters?.length) {
    parts.push(props.condition.scope.chapters.slice(0, 2).join('、') + (props.condition.scope.chapters.length > 2 ? '...' : ''))
  }
  const count = props.condition.count || 15
  parts.push(`${count}题`)
  return parts.join(' · ')
})
</script>

<style scoped>
.param-summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  overflow: hidden;
  margin: 8px 0;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.summary-header:hover {
  background: var(--bg-tertiary);
}

.summary-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.summary-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.summary-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.summary-brief {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-toggle {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.summary-toggle:hover,
.summary-toggle.active {
  border-color: var(--accent);
  color: var(--accent);
}

.summary-body {
  padding: 0 14px 14px;
  border-top: 1px solid var(--border-secondary);
}

.summary-expand-enter-active {
  transition: all 0.2s ease-out;
  max-height: 600px;
  overflow: hidden;
}

.summary-expand-leave-active {
  transition: all 0.15s ease-in;
  max-height: 600px;
  overflow: hidden;
}

.summary-expand-enter-from,
.summary-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ParamSummaryCard.vue
git commit -m "feat: 新增 ParamSummaryCard 参数摘要卡片组件"
```

---

### Task 5: 新增 ChapterSelect 章节多选组件

**Files:**
- Create: `src/components/ChapterSelect.vue`

- [ ] **Step 1: 创建章节多选组件**

创建 `src/components/ChapterSelect.vue`：

```vue
<template>
  <div class="chapter-select">
    <div class="chapter-select-label">考试范围</div>
    <div class="chapter-options">
      <label
        v-for="chapter in chapters"
        :key="chapter"
        class="chapter-option"
        :class="{ 'chapter-option--active': modelValue.includes(chapter) }"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(chapter)"
          @change="toggleChapter(chapter)"
          class="chapter-checkbox"
        />
        <span class="chapter-name">{{ chapter }}</span>
      </label>
    </div>
    <div v-if="chapters.length === 0" class="chapter-empty">
      请先选择学科、年级和教材版本
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CHAPTER_OPTIONS } from '../types'
import type { Subject, Grade, TextbookVersion } from '../types'

const props = defineProps<{
  modelValue: string[]
  subject?: Subject
  grade?: Grade
  textbookVersion?: TextbookVersion
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const chapters = computed(() => {
  if (!props.subject || !props.grade) return []
  const version = props.textbookVersion || 'pep'
  const key = `${props.subject}-${props.grade}-${version}`
  return CHAPTER_OPTIONS[key] || []
})

function toggleChapter(chapter: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(chapter)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(chapter)
  }
  emit('update:modelValue', current)
}
</script>

<style scoped>
.chapter-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chapter-select-label {
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
}

.chapter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chapter-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
  font-size: 12px;
  color: var(--text-secondary);
}

.chapter-option:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chapter-option--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.chapter-option--active:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: #fff;
}

.chapter-checkbox {
  display: none;
}

.chapter-name {
  font-size: 12px;
}

.chapter-empty {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 8px 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChapterSelect.vue
git commit -m "feat: 新增 ChapterSelect 章节多选组件"
```

---

### Task 6: 新增 ClarifyQuestion 追问组件

**Files:**
- Create: `src/components/ClarifyQuestion.vue`

- [ ] **Step 1: 创建追问消息组件**

创建 `src/components/ClarifyQuestion.vue`：

```vue
<template>
  <div class="clarify-card">
    <div class="clarify-text" v-html="formattedMessage"></div>
    <div v-if="quickOptions" class="clarify-options">
      <div v-for="(options, field) in quickOptions" :key="field" class="clarify-field">
        <div class="clarify-field-label">{{ fieldLabels[field as string] || field }}</div>
        <div class="clarify-field-options">
          <button
            v-for="opt in options"
            :key="opt"
            class="clarify-option-btn"
            :class="{ 'clarify-option-btn--active': selectedOptions[field as string] === opt }"
            @click="selectOption(field as string, opt)"
          >
            {{ opt }}
          </button>
        </div>
      </div>
    </div>
    <div class="clarify-actions">
      <el-button size="small" type="primary" @click="handleConfirm" :disabled="!canConfirm">
        确认
      </el-button>
      <el-input
        v-model="customInput"
        size="small"
        placeholder="或直接输入补充信息..."
        @keydown.enter="handleCustomSubmit"
        class="clarify-custom-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ClarifyResponse } from '../api'

const props = defineProps<{
  clarify: ClarifyResponse
}>()

const emit = defineEmits<{
  confirm: [selections: Record<string, string>]
  customInput: [text: string]
}>()

const selectedOptions = ref<Record<string, string>>({})
const customInput = ref('')

const fieldLabels: Record<string, string> = {
  subject: '学科',
  grade: '年级',
  textbookVersion: '教材版本',
  scope: '考试范围',
  scene: '试卷场景'
}

const formattedMessage = computed(() => {
  return props.clarify.message.replace(/\n/g, '<br>')
})

const canConfirm = computed(() => {
  return props.clarify.missingFields.length === 0 ||
    props.clarify.missingFields.every(f => selectedOptions.value[f])
})

function selectOption(field: string, value: string) {
  selectedOptions.value[field] = value
}

function handleConfirm() {
  emit('confirm', { ...selectedOptions.value })
}

function handleCustomSubmit() {
  if (customInput.value.trim()) {
    emit('customInput', customInput.value.trim())
    customInput.value = ''
  }
}
</script>

<style scoped>
.clarify-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  padding: 14px;
  max-width: 400px;
}

.clarify-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.7;
  margin-bottom: 12px;
}

.clarify-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.clarify-field-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.clarify-field-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.clarify-option-btn {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clarify-option-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.clarify-option-btn--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.clarify-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clarify-custom-input {
  flex: 1;
}

.clarify-custom-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  background: var(--bg-primary);
  box-shadow: none;
  border: 1px solid var(--border-primary);
}

.clarify-custom-input :deep(.el-input__inner) {
  font-size: 12px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ClarifyQuestion.vue
git commit -m "feat: 新增 ClarifyQuestion 追问消息组件"
```

---

### Task 7: 新增 CoveragePanel 知识点覆盖度面板

**Files:**
- Create: `src/components/CoveragePanel.vue`

- [ ] **Step 1: 创建覆盖度面板组件**

创建 `src/components/CoveragePanel.vue`：

```vue
<template>
  <div class="coverage-panel">
    <div class="coverage-title">📊 知识点覆盖度</div>
    <div class="coverage-list">
      <div
        v-for="item in coverageItems"
        :key="item.knowledgePoint"
        class="coverage-item"
        :class="coverageClass(item.coverageRate)"
        @click="handleItemClick(item)"
      >
        <div class="coverage-item-header">
          <span class="coverage-name">{{ item.knowledgePoint }}</span>
          <span class="coverage-rate">{{ item.coverageRate }}%</span>
        </div>
        <div class="coverage-bar">
          <div class="coverage-fill" :style="{ width: item.coverageRate + '%' }"></div>
        </div>
        <div class="coverage-meta">
          <span>{{ item.coveredCount }}/{{ item.suggestedCount }} 题</span>
          <span v-if="item.coverageRate < 50" class="coverage-warning">⚠ 需补充</span>
        </div>
      </div>
    </div>
    <div v-if="coverageItems.length === 0" class="coverage-empty">
      生成试卷后自动展示覆盖度
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CoverageItem } from '../types'

const props = defineProps<{
  coverageItems: CoverageItem[]
}>()

const emit = defineEmits<{
  supplement: [knowledgePoint: string]
}>()

function coverageClass(rate: number): string {
  if (rate >= 80) return 'coverage-good'
  if (rate >= 50) return 'coverage-warning'
  return 'coverage-danger'
}

function handleItemClick(item: CoverageItem) {
  if (item.coverageRate < 80) {
    emit('supplement', item.knowledgePoint)
  }
}
</script>

<style scoped>
.coverage-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 12px;
  width: 200px;
  flex-shrink: 0;
}

.coverage-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.coverage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coverage-item {
  padding: 8px;
  border-radius: 6px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.coverage-item:hover {
  background: var(--bg-tertiary);
}

.coverage-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.coverage-name {
  font-size: 11px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.coverage-rate {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.coverage-bar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.coverage-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.coverage-good .coverage-fill {
  background: #52c41a;
}

.coverage-warning .coverage-fill {
  background: #faad14;
}

.coverage-danger .coverage-fill {
  background: #ff4d4f;
}

.coverage-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: var(--text-tertiary);
}

.coverage-warning-text {
  color: #ff4d4f;
}

.coverage-empty {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  padding: 20px 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CoveragePanel.vue
git commit -m "feat: 新增 CoveragePanel 知识点覆盖度面板组件"
```

---

### Task 8: 更新 Store — 新增追问逻辑、覆盖度计算、地区自动获取

**Files:**
- Modify: `src/stores/exam.ts`

- [ ] **Step 1: 新增 import 和状态**

在 `src/stores/exam.ts` 顶部，更新 import：

```typescript
import type {
  ChatMessage,
  ExamCondition,
  ExamPaper,
  Question,
  ReasoningStep,
  QuestionVersion,
  ExamSummary,
  CoverageItem,
  MissingInfo
} from '../types'
import { mockQuestions, initialMessages } from '../mock'
import { adaptQuestion as apiAdaptQuestion, clarifyInput, generateExam as apiGenerateExam, type AdaptQuestionParams, type GenerateExamParams } from '../api'
```

在 store 内部，在 `examSummary` 之后添加：

```typescript
// ==================== 地区自动获取 ====================

const userRegion = ref<string | null>(null)
const userProvince = ref<string | null>(null)
const isDetectingRegion = ref(false)

async function detectRegion() {
  isDetectingRegion.value = true
  try {
    const { detectUserRegion, detectUserProvince } = await import('../utils/geo')
    const [region, province] = await Promise.all([
      detectUserRegion(),
      detectUserProvince()
    ])
    userRegion.value = region
    userProvince.value = province
    if (region) {
      condition.value.region = region
    }
  } catch (error) {
    console.warn('[Store] 地区检测失败，忽略:', error)
  } finally {
    isDetectingRegion.value = false
  }
}

// ==================== 追问状态 ====================

const clarifyResponse = ref<any>(null)
const isClarifying = ref(false)

// ==================== 覆盖度 ====================

const coverageItems = ref<CoverageItem[]>([])
```

- [ ] **Step 2: 新增追问方法**

在 `cancelGenerate` 方法之后添加：

```typescript
// ==================== 追问补齐 ====================

async function clarifyUserInput(input: string): Promise<{ needClarify: boolean; clarifyData?: any }> {
  isClarifying.value = true
  try {
    const response = await clarifyInput(input)
    if (response.missingFields.length > 0) {
      clarifyResponse.value = response
      isClarifying.value = false
      return { needClarify: true, clarifyData: response }
    }
    clarifyResponse.value = null
    isClarifying.value = false
    return { needClarify: false }
  } catch (error) {
    console.error('追问失败:', error)
    isClarifying.value = false
    // 降级：不追问，直接继续
    return { needClarify: false }
  }
}

// 处理追问确认
function applyClarifySelections(selections: Record<string, string>) {
  const labelToValue: Record<string, Record<string, any>> = {
    subject: { '数学': 'math', '语文': 'chinese', '英语': 'english', '物理': 'physics', '化学': 'chemistry', '生物': 'biology', '历史': 'history', '地理': 'geography', '政治': 'politics' },
    grade: { '七年级': 'grade7', '八年级': 'grade8', '九年级': 'grade9', '高一': 'grade10', '高二': 'grade11', '高三': 'grade12' },
    textbookVersion: { '人教版': 'pep', '北师大版': 'bs', '苏教版': 'su', '浙教版': 'zj', '沪教版': 'hu' },
    scene: { '课后练习': 'homework', '单元测验': 'unitTest', '期中复习': 'midterm', '期末复习': 'final', '专项训练': 'special' }
  }

  for (const [field, value] of Object.entries(selections)) {
    if (field === 'subject' && labelToValue.subject[value]) {
      condition.value.subject = labelToValue.subject[value]
    } else if (field === 'grade' && labelToValue.grade[value]) {
      condition.value.grade = labelToValue.grade[value]
    } else if (field === 'textbookVersion' && labelToValue.textbookVersion[value]) {
      condition.value.textbookVersion = labelToValue.textbookVersion[value]
    } else if (field === 'scene' && labelToValue.scene[value]) {
      condition.value.scene = labelToValue.scene[value]
    }
  }

  clarifyResponse.value = null
}
```

- [ ] **Step 3: 新增覆盖度计算方法**

在 `applyClarifySelections` 之后添加：

```typescript
// ==================== 覆盖度计算 ====================

function calculateCoverage() {
  if (!currentPaper.value) {
    coverageItems.value = []
    return
  }

  const chapters = condition.value.scope?.chapters || condition.value.knowledgePoints || []
  const questions = currentPaper.value.questions

  // 基于章节和知识点计算覆盖度
  const chapterMap = new Map<string, { covered: number; suggested: number; questionIds: string[] }>()

  // 初始化所有章节
  chapters.forEach(ch => {
    chapterMap.set(ch, { covered: 0, suggested: 3, questionIds: [] })
  })

  // 统计每道题覆盖的知识点
  questions.forEach(q => {
    const matched = q.knowledgePoints?.filter(kp => chapterMap.has(kp)) || []
    matched.forEach(kp => {
      const entry = chapterMap.get(kp)!
      entry.covered++
      entry.questionIds.push(q.id)
    })
  })

  coverageItems.value = Array.from(chapterMap.entries()).map(([kp, data]) => ({
    knowledgePoint: kp,
    chapter: kp,
    coveredCount: data.covered,
    suggestedCount: data.suggested,
    coverageRate: Math.min(100, Math.round((data.covered / data.suggested) * 100)),
    questions: data.questionIds
  }))
}
```

- [ ] **Step 4: 更新 generateExam 方法**

在 `generateExam` 方法的末尾（`showPreview.value = true` 之后），添加覆盖度计算调用：

```typescript
    // 计算覆盖度
    calculateCoverage()
```

同时在 `recalcTotalScore` 方法末尾添加：

```typescript
    // 同步更新覆盖度
    calculateCoverage()
```

- [ ] **Step 5: 更新 return 导出**

在 store 的 return 对象中添加新状态和方法：

```typescript
    // 追问
    clarifyResponse,
    isClarifying,
    clarifyUserInput,
    applyClarifySelections,

    // 覆盖度
    coverageItems,
    calculateCoverage,

    // 地区
    userRegion,
    userProvince,
    isDetectingRegion,
    detectRegion,
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/exam.ts
git commit -m "feat: Store 新增追问逻辑和覆盖度计算"
```

---

### Task 9: 重构 AIExam.vue — 参数面板改为摘要卡片模式

**Files:**
- Modify: `src/views/AIExam.vue`

这是最大的改动。需要修改 AIExam.vue 的模板和脚本。

- [ ] **Step 1: 更新 import**

替换 AIExam.vue 的 import 部分：

```typescript
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useExamStore } from '../stores/exam'
import {
  LABELS, DIFFICULTY_LABELS, SUBJECT_LABELS, GRADE_LABELS,
  TEXTBOOK_VERSION_LABELS, SCENE_LABELS,
  SUBJECT_QUESTION_TYPES, SUBJECT_TYPE_LABELS,
  CHAPTER_OPTIONS
} from '../types'
import type { Question, QuestionType, Difficulty, ReferenceFile, TextbookVersion } from '../types'
import ThinkingBubble from '../components/ThinkingBubble.vue'
import SummaryCard from '../components/SummaryCard.vue'
import ParamSummaryCard from '../components/ParamSummaryCard.vue'
import ChapterSelect from '../components/ChapterSelect.vue'
import ClarifyQuestion from '../components/ClarifyQuestion.vue'
import CoveragePanel from '../components/CoveragePanel.vue'
import draggable from 'vuedraggable'
```

- [ ] **Step 2: 替换 init 阶段模板**

将 `init-container` 部分替换为更清晰的布局：

```html
<!-- 初始化状态 -->
<transition name="fade-out">
  <div v-if="step === 'init'" class="init-container">
    <div class="init-greeting">{{ greetingText }}<span v-if="!greetingDone" class="typing-cursor">▌</span></div>
    <div class="quick-scenes">
      <button
        v-for="scene in quickScenes"
        :key="scene.key"
        class="scene-chip"
        @click="selectScene(scene)"
      >{{ scene.icon }} {{ scene.label }}</button>
    </div>
  </div>
</transition>
```

> init 阶段模板保持不变，场景按钮布局已经合理。

- [ ] **Step 3: 在对话消息中添加参数摘要卡片和追问卡片**

在对话消息循环中，添加新的消息类型渲染：

```html
<!-- 对话流程 -->
<template v-if="step !== 'init'">
  <div
    v-for="msg in messages"
    :key="msg.id"
    class="message"
    :class="msg.role"
  >
    <div v-if="msg.role === 'assistant'" class="message-avatar">AI</div>
    <div class="message-body">
      <div v-if="msg.type === 'text'" class="message-content" v-html="formatMessage(msg.content)"></div>
      <div v-if="msg.type === 'thinking'" class="message-content thinking-card">
        <ThinkingBubble ... />
      </div>
      <div v-if="msg.type === 'summary-card' && examStore.examSummary" class="message-content summary-card-wrapper">
        <SummaryCard :summary="examStore.examSummary" @view-paper="handleViewPaper" />
      </div>
      <!-- 新增：参数摘要卡片 -->
      <div v-if="msg.type === 'param-summary'" class="message-content param-summary-wrapper">
        <ParamSummaryCard :condition="examStore.condition" @expand="showParamsPanel = true">
          <div class="params-embedded">
            <!-- 嵌入式参数编辑（展开时显示） -->
            <div class="params-row">
              <div class="param-chip">
                <span class="param-chip-label">学科</span>
                <el-select v-model="examStore.condition.subject" size="small" placeholder="选择" @change="onSubjectChange">
                  <el-option v-for="(label, key) in SUBJECT_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
              </div>
              <div class="param-chip">
                <span class="param-chip-label">年级</span>
                <el-select v-model="examStore.condition.grade" size="small" placeholder="选择">
                  <el-option v-for="(label, key) in GRADE_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
              </div>
              <div class="param-chip">
                <span class="param-chip-label">教材版本</span>
                <el-select v-model="examStore.condition.textbookVersion" size="small" placeholder="选择">
                  <el-option v-for="(label, key) in TEXTBOOK_VERSION_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
              </div>
              <div class="param-chip">
                <span class="param-chip-label">地区</span>
                <el-select v-model="examStore.condition.region" size="small" placeholder="自动检测" clearable>
                  <el-option v-for="(label, key) in REGION_LABELS" :key="key" :label="label" :value="key" />
                </el-select>
                <span v-if="examStore.isDetectingRegion" class="region-detecting">检测中...</span>
              </div>
            </div>
            <div class="params-row" style="margin-top: 8px;">
              <ChapterSelect
                :modelValue="selectedChapters"
                :subject="examStore.condition.subject"
                :grade="examStore.condition.grade"
                :textbookVersion="examStore.condition.textbookVersion"
                @update:modelValue="selectedChapters = $event"
              />
            </div>
            <div class="params-row" style="margin-top: 8px;">
              <div class="param-chip param-chip--full">
                <span class="param-chip-label">题型</span>
                <div class="question-type-tags">
                  <span
                    v-for="qt in currentQuestionTypes"
                    :key="qt"
                    class="type-tag"
                    :class="{ 'type-tag--active': (examStore.condition.questionTypes || []).includes(qt) }"
                    @click="toggleQuestionType(qt)"
                  >{{ currentTypeLabels[qt] || LABELS[qt] }}</span>
                </div>
              </div>
            </div>
            <div class="params-row params-row--compact" style="margin-top: 8px;">
              <div class="param-chip param-chip--grow">
                <span class="param-chip-label">难度分配</span>
                <div class="difficulty-inline">
                  <div v-for="key in (['easy', 'medium', 'hard'] as const)" :key="key" class="difficulty-inline-item">
                    <span class="difficulty-name">{{ DIFFICULTY_LABELS[key] }}</span>
                    <el-slider
                      :model-value="examStore.condition.difficultyRatio?.[key] ?? 33"
                      :min="0" :max="100" :step="5"
                      @input="(val: number) => updateDifficultyRatio(key, val)"
                      :show-tooltip="false"
                      size="small"
                    />
                    <span class="difficulty-value">{{ examStore.condition.difficultyRatio?.[key] ?? 33 }}%</span>
                  </div>
                </div>
              </div>
              <div class="param-chip param-chip--count">
                <span class="param-chip-label">数量</span>
                <el-input-number v-model="examStore.condition.count" :min="1" :max="50" size="small" controls-position="right" />
              </div>
            </div>
          </div>
        </ParamSummaryCard>
        <div class="param-confirm-actions">
          <el-button size="small" type="primary" @click="confirmParams" :loading="examStore.isGenerating">确认生成</el-button>
        </div>
      </div>
      <!-- 新增：追问卡片 -->
      <div v-if="msg.type === 'clarify' && msg.data" class="message-content clarify-wrapper">
        <ClarifyQuestion :clarify="msg.data" @confirm="handleClarifyConfirm" @custom-input="handleClarifyCustom" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 更新输入框区域**

将输入框区域简化（移除旧的参数面板嵌入逻辑）：

```html
<!-- 输入框（始终显示） -->
<div class="chat-input-wrapper">
  <div class="unified-input-box">
    <div class="input-text-section">
      <el-input
        v-model="inputText"
        type="textarea"
        :placeholder="inputPlaceholder"
        @keydown.enter.exact.prevent="handleSend"
        :disabled="examStore.isGenerating || step === 'generating'"
        :autosize="{ minRows: 1, maxRows: 4 }"
        resize="none"
      />
    </div>
    <div class="input-toolbar">
      <div class="input-toolbar-left"></div>
      <div class="input-toolbar-right">
        <el-button
          class="chat-send-btn"
          type="primary"
          @click="handleSend"
          :disabled="examStore.isGenerating || (!inputText.trim() && step === 'init')"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </el-button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 5: 在卷面预览区添加覆盖度面板**

在 `preview-content` 内部，`a4-paper` 之前添加覆盖度面板：

```html
<div class="preview-content" ref="previewRef">
  <!-- 知识点覆盖度面板 -->
  <CoveragePanel
    v-if="step === 'done'"
    :coverageItems="examStore.coverageItems"
    @supplement="handleSupplement"
    class="coverage-sidebar"
  />
  <div class="a4-paper" :style="{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }">
    <!-- 试卷内容保持不变 -->
  </div>
</div>
```

- [ ] **Step 6: 更新 script 逻辑**

在 `<script setup>` 中：

1. 移除 `showParamsPanel`、`selectedChapter`、`showMoreParams`、`originalDefaults` 相关逻辑
2. 新增 `selectedChapters` ref（多选）
3. 新增学科相关题型计算属性
4. 更新 `selectScene` 方法（添加参数摘要卡片到对话流）
5. 更新 `handleSend` 方法（添加追问逻辑）
6. 新增追问处理方法
7. 新增覆盖度补充方法
8. 更新 `chapterOptions` 计算属性（使用教材版本）

```typescript
// 移除
// const showParamsPanel = ref(false)
// const selectedChapter = ref('')
// const showMoreParams = ref(false)
// const originalDefaults = ref<Record<string, any> | null>(null)

// 新增
const selectedChapters = ref<string[]>([])

// 学科相关题型
const currentQuestionTypes = computed(() => {
  const subject = examStore.condition.subject
  if (!subject) return ['choice', 'fillBlank', 'shortAnswer', 'judgment'] as QuestionType[]
  return SUBJECT_QUESTION_TYPES[subject] || ['choice', 'fillBlank', 'shortAnswer']
})

// 学科相关题型标签
const currentTypeLabels = computed(() => {
  const subject = examStore.condition.subject
  if (!subject) return LABELS
  return SUBJECT_TYPE_LABELS[subject] || LABELS
})

// 章节选项（使用教材版本）
const chapterOptions = computed(() => {
  const subject = examStore.condition.subject
  const grade = examStore.condition.grade
  const version = examStore.condition.textbookVersion || 'pep'
  if (!subject || !grade) return []
  const key = `${subject}-${grade}-${version}`
  return CHAPTER_OPTIONS[key] || []
})

// 学科变化时重置章节和题型
function onSubjectChange() {
  selectedChapters.value = []
  // 更新题型为学科默认
  const types = SUBJECT_QUESTION_TYPES[examStore.condition.subject || 'math']
  if (types) {
    examStore.condition.questionTypes = [...types]
  }
}

// 选择场景 → 添加参数摘要卡片到对话流
function selectScene(scene: typeof quickScenes[0]) {
  step.value = 'confirm'
  const d = scene.defaults
  examStore.condition.scene = d.scene
  if (d.difficultyRatio) examStore.condition.difficultyRatio = { ...d.difficultyRatio }
  examStore.condition.count = d.count
  examStore.condition.questionTypes = [...d.questionTypes]
  addMsg('user', `我选择了「${scene.label}」`)
  addMsg('assistant', `好的，已为您准备「${scene.label}」试卷参数，请确认或编辑。`, 'param-summary')
  scrollToBottom()
}

// 确认参数
function confirmParams() {
  // 同步章节到 condition
  if (selectedChapters.value.length > 0) {
    examStore.condition.scope = {
      chapters: selectedChapters.value,
      textbookVersion: examStore.condition.textbookVersion || 'pep'
    }
    examStore.condition.knowledgePoints = [...selectedChapters.value]
  }
  startGenerate()
}

// 自然语言输入（带追问）
async function handleSend() {
  if (examStore.isGenerating) return
  if (step.value === 'init' && !inputText.value.trim()) return

  const text = inputText.value.trim()
  inputText.value = ''

  if (step.value === 'init') {
    addMsg('user', text)
    // 调用追问 API
    const { needClarify, clarifyData } = await examStore.clarifyUserInput(text)
    if (needClarify && clarifyData) {
      addMsg('assistant', '', 'clarify', clarifyData)
      step.value = 'confirm'
      scrollToBottom()
    } else {
      addMsg('assistant', `好的，正在为您生成试卷...`)
      await new Promise(r => setTimeout(r, 300))
      startGenerate()
    }
  } else if (step.value === 'confirm') {
    addMsg('user', text)
    // 再次检查是否补齐了信息
    const { needClarify, clarifyData } = await examStore.clarifyUserInput(text)
    if (needClarify && clarifyData) {
      addMsg('assistant', '', 'clarify', clarifyData)
      scrollToBottom()
    } else {
      addMsg('assistant', '好的，正在为您生成试卷...')
      await new Promise(r => setTimeout(r, 300))
      confirmParams()
    }
  } else {
    addMsg('user', text)
    await new Promise(r => setTimeout(r, 300))
    addMsg('assistant', '好的，正在为您生成试卷...')
    startGenerate()
  }
}

// 追问确认
function handleClarifyConfirm(selections: Record<string, string>) {
  examStore.applyClarifySelections(selections)
  addMsg('user', `已确认：${Object.values(selections).join('、')}`)
  // 检查是否还有缺失
  const remaining = examStore.clarifyResponse
  if (!remaining) {
    addMsg('assistant', '参数已确认', 'param-summary')
  }
  scrollToBottom()
}

// 追问自定义输入
async function handleClarifyCustom(text: string) {
  addMsg('user', text)
  const { needClarify, clarifyData } = await examStore.clarifyUserInput(text)
  if (needClarify && clarifyData) {
    addMsg('assistant', '', 'clarify', clarifyData)
  } else {
    addMsg('assistant', '参数已确认', 'param-summary')
  }
  scrollToBottom()
}

// 覆盖度补充
function handleSupplement(knowledgePoint: string) {
  ElMessage.info(`补充「${knowledgePoint}」相关题目（原型演示）`)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // 自动检测用户地区
  examStore.detectRegion()
})
```

- [ ] **Step 7: 更新 addMsg 方法签名**

```typescript
function addMsg(role: 'user' | 'assistant', content: string, type = 'text', data?: any) {
  messages.value.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    role, content, type, data
  })
  scrollToBottom()
}
```

- [ ] **Step 8: 添加新样式**

在 `<style scoped>` 中添加：

```css
/* 参数摘要卡片包装 */
.param-summary-wrapper {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

.param-confirm-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

/* 追问卡片包装 */
.clarify-wrapper {
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* 嵌入式参数编辑 */
.params-embedded {
  padding-top: 10px;
}

/* 覆盖度面板侧边栏 */
.coverage-sidebar {
  flex-shrink: 0;
  margin-right: 16px;
}

.preview-content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

/* 地区检测 */
.region-detecting { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; }
```

- [ ] **Step 9: 移除旧代码**

删除以下不再需要的代码：
- `showParamsPanel` 相关的所有 ref 和逻辑
- `selectedChapter` 相关的所有 ref 和 watch
- `originalDefaults` 相关的所有 ref 和逻辑
- `resetParamsToDefault` 函数
- `paramSummaryTags` 计算属性
- 旧的 `input-params-section` 模板块
- 旧的 `params-expand` transition

- [ ] **Step 10: 验证编译和运行**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vite build 2>&1 | tail -20`
Expected: 构建成功，无错误

- [ ] **Step 11: Commit**

```bash
git add src/views/AIExam.vue
git commit -m "feat: 重构 AIExam - 参数摘要卡片/追问/覆盖度面板/教材版本/学科题型"
```

---

### Task 10: 更新 Mock 数据

**Files:**
- Modify: `src/mock/index.ts`

- [ ] **Step 1: 更新场景模板**

更新 `sceneTemplates` 数组，添加教材版本到默认条件中：

```typescript
export const sceneTemplates: SceneTemplate[] = [
  {
    id: 'tpl-homework',
    name: '课后练习',
    icon: '📖',
    description: '15道题，基础难度，覆盖当天知识点',
    defaultCondition: {
      scene: 'homework',
      difficulty: 'easy',
      count: 15,
      questionTypes: ['choice', 'fillBlank'],
      textbookVersion: 'pep'
    }
  },
  {
    id: 'tpl-unit',
    name: '单元测验',
    icon: '📋',
    description: '20道题，中等难度，覆盖整个单元',
    defaultCondition: {
      scene: 'unitTest',
      difficulty: 'medium',
      count: 20,
      questionTypes: ['choice', 'fillBlank', 'shortAnswer'],
      textbookVersion: 'pep'
    }
  },
  {
    id: 'tpl-midterm',
    name: '期中复习',
    icon: '📊',
    description: '25道题，混合难度，覆盖多个章节',
    defaultCondition: {
      scene: 'midterm',
      count: 25,
      questionTypes: ['choice', 'fillBlank', 'shortAnswer'],
      textbookVersion: 'pep'
    }
  },
  {
    id: 'tpl-final',
    name: '期末复习',
    icon: '📝',
    description: '30道题，混合难度，全面覆盖',
    defaultCondition: {
      scene: 'final',
      count: 30,
      questionTypes: ['choice', 'fillBlank', 'shortAnswer'],
      textbookVersion: 'pep'
    }
  },
  {
    id: 'tpl-special',
    name: '专项训练',
    icon: '🎯',
    description: '10-15道题，针对特定题型或知识点',
    defaultCondition: {
      scene: 'special',
      difficulty: 'medium',
      count: 12,
      questionTypes: ['choice', 'fillBlank'],
      textbookVersion: 'pep'
    }
  },
  {
    id: 'tpl-error',
    name: '错题巩固',
    icon: '❌',
    description: '基于错题本生成变体题',
    defaultCondition: {
      scene: 'errorReview',
      count: 10,
      questionTypes: ['choice', 'fillBlank'],
      textbookVersion: 'pep'
    }
  },
  {
    id: 'tpl-extension',
    name: '举一反三',
    icon: '🔄',
    description: '输入一道题，生成相似变体',
    defaultCondition: {
      scene: 'extension',
      count: 5,
      questionTypes: ['choice'],
      textbookVersion: 'pep'
    }
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add src/mock/index.ts
git commit -m "feat: 更新 mock 场景模板添加教材版本"
```

---

### Task 11: 最终验证

- [ ] **Step 1: 完整构建验证**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vite build 2>&1 | tail -20`
Expected: 构建成功

- [ ] **Step 2: 启动开发服务器验证**

Run: `cd /sessions/69d8c85bfc9012d6ae86cbb4/workspace/ai-question-generator && npx vite --host 0.0.0.0 --port 5173`

验证以下功能：
1. 打开页面，init 阶段显示场景卡片和输入框
2. 点击场景卡片 → 对话流中出现参数摘要卡片（默认收起）
3. 点击"编辑" → 展开参数编辑（学科/年级/教材版本/章节多选/学科相关题型/难度/数量）
4. 点击"确认生成" → 生成试卷，显示思考气泡和摘要卡片
5. 生成完成后 → 右侧显示卷面预览 + 知识点覆盖度面板
6. 自然语言输入 → 触发追问卡片 → 选择后确认 → 生成试卷
7. 单题操作 → 换题/删除/改编功能正常

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: AI组卷交互设计优化完成 - v2.0"
```
