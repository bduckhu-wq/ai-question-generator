// 题目类型
export type QuestionType = 'choice' | 'fillBlank' | 'shortAnswer' | 'judgment'

// 难度级别
export type Difficulty = 'easy' | 'medium' | 'hard'

// 出题场景
export type ExamScene = 'homework' | 'unitTest' | 'midterm' | 'final' | 'special' | 'errorReview' | 'extension'

// 学科
export type Subject = 'math' | 'chinese' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics'

// 年级
export type Grade = 'grade7' | 'grade8' | 'grade9' | 'grade10' | 'grade11' | 'grade12'

// 教材版本
export type TextbookVersion = 'pep' | 'bs' | 'su' | 'zj' | 'hu' | 'jb' | 'fltrp' | string

// 地区
export type Region = string

// 选项
export interface Option {
  label: string
  content: string
}

// 题目
export interface Question {
  id: string
  type: QuestionType
  difficulty: Difficulty
  subject: Subject
  grade: Grade
  knowledgePoints: string[]
  content: string
  options?: Option[]
  answer: string
  analysis?: string
  score: number
  source?: 'bank' | 'ai' | 'import'
}

// 试卷
export interface ExamPaper {
  id: string
  title: string
  subject: Subject
  grade: Grade
  scene: ExamScene
  questions: Question[]
  totalScore: number
  duration: number // 分钟
  schoolName?: string
  createdAt: string
}

// 对话消息
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type?: 'text' | 'condition-card' | 'progress-card' | 'question-card' | 'suggestion-card' | 'template-card' | 'param-summary' | 'clarify'
  data?: any
  timestamp: string
}

// 难度比例
export interface DifficultyRatio {
  easy: number   // 0-100
  medium: number // 0-100
  hard: number   // 0-100
}

// 参考素材文件
export interface ReferenceFile {
  id: string
  name: string
  size: number
  type: string
  file: File
}

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
  textbookVersion: TextbookVersion
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

// 场景模板
export interface SceneTemplate {
  id: string
  name: string
  icon: string
  description: string
  defaultCondition: Partial<ExamCondition>
}

// 推理步骤状态
export type ReasoningStepStatus = 'pending' | 'running' | 'completed' | 'error'

// 推理步骤
export interface ReasoningStep {
  id: string
  title: string
  description?: string
  status: ReasoningStepStatus
  detail?: string          // 展开后显示的详情内容
  detailItems?: string[]   // 展开后显示的详情列表
  duration?: number        // 步骤耗时（ms）
  startedAt?: string
  completedAt?: string
}

// 推理流程
export interface ReasoningPipeline {
  title: string
  steps: ReasoningStep[]
  isRunning: boolean
  isCompleted: boolean
}

// 菜单项
export interface MenuItem {
  id: string
  name: string
  icon: string
  route: string
}

// 题库筛选条件
export interface BankFilter {
  subject?: Subject
  grade?: Grade
  questionType?: QuestionType
  difficulty?: Difficulty
  keyword?: string
  tags?: string[]
}

// 知识点覆盖度
export interface CoverageItem {
  knowledgePoint: string
  chapter: string
  coveredCount: number
  suggestedCount: number
  coverageRate: number
  questions: Question[]  // 已覆盖的题目列表
}

// 追问缺失信息
export interface MissingInfo {
  subject?: boolean
  grade?: boolean
  textbookVersion?: boolean
  scope?: boolean
  scene?: boolean
}

// ========== 标签常量 ==========

export const LABELS: Record<QuestionType, string> = {
  choice: '选择题',
  fillBlank: '填空题',
  shortAnswer: '解答题',
  judgment: '判断题'
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  history: '历史',
  geography: '地理',
  politics: '政治'
}

export const GRADE_LABELS: Record<Grade, string> = {
  grade7: '七年级',
  grade8: '八年级',
  grade9: '九年级',
  grade10: '高一',
  grade11: '高二',
  grade12: '高三'
}

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

export const SCENE_LABELS: Record<ExamScene, string> = {
  homework: '课后练习',
  unitTest: '单元测验',
  midterm: '期中复习',
  final: '期末复习',
  special: '专项训练',
  errorReview: '错题巩固',
  extension: '举一反三'
}

// 学科相关题型映射
export const SUBJECT_QUESTION_TYPES: Record<Subject, QuestionType[]> = {
  math: ['choice', 'fillBlank', 'shortAnswer'],
  chinese: ['choice', 'fillBlank', 'shortAnswer'],
  english: ['choice', 'fillBlank', 'shortAnswer'],
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

// ========== 章节数据（按学科+年级+教材版本分组）==========

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
  'politics-grade11-bs': ['文化生活', '生活与哲学'],
  'politics-grade12-bs': ['综合复习', '时事热点'],
}

// ========== AI 组卷流程优化 — 新增类型 ==========

// 题目版本快照（用于版本回撤）
export interface QuestionVersion {
  question: Question
  action: string        // 操作描述："换难度"、"自定义改编"、"手动编辑"等
  timestamp: string     // ISO 时间戳
}

// SSE 事件协议（为后端对接准备）
export type SSEEvent =
  | { type: 'thinking_start' }
  | { type: 'thinking_delta'; content: string }
  | { type: 'thinking_end'; duration: number }
  | { type: 'result_start' }
  | { type: 'result_delta'; content: string }
  | { type: 'result_end' }
  | { type: 'paper_ready'; paper: ExamPaper }
  | { type: 'error'; message: string }

// 试卷摘要（用于 SummaryCard）
export interface ExamSummary {
  totalQuestions: number
  bankQuestions: number
  aiQuestions: number
  difficultyDistribution: { easy: number; medium: number; hard: number }
  totalScore: number
  duration: number
}
