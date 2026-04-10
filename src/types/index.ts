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
  type?: 'text' | 'condition-card' | 'progress-card' | 'question-card' | 'suggestion-card' | 'template-card'
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

// 出题条件
export interface ExamCondition {
  subject?: Subject
  grade?: Grade
  questionTypes?: QuestionType[]
  difficulty?: Difficulty
  difficultyRatio?: DifficultyRatio
  knowledgePoints?: string[]
  scene?: ExamScene
  count?: number
  duration?: number
  referenceFiles?: ReferenceFile[]
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

// 标签
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

export const SCENE_LABELS: Record<ExamScene, string> = {
  homework: '课后练习',
  unitTest: '单元测验',
  midterm: '期中复习',
  final: '期末复习',
  special: '专项训练',
  errorReview: '错题巩固',
  extension: '举一反三'
}

// 章节数据（按学科+年级分组）
export const CHAPTER_OPTIONS: Record<string, string[]> = {
  'math-grade7': ['有理数', '整式的加减', '一元一次方程', '几何图形初步'],
  'math-grade8': ['三角形', '全等三角形', '轴对称', '整式的乘法与因式分解', '分式'],
  'math-grade9': ['一元二次方程', '二次函数', '旋转', '圆', '概率初步'],
  'math-grade10': ['集合与函数', '基本初等函数', '函数的应用', '空间几何体', '点线面关系'],
  'math-grade11': ['三角函数', '数列', '不等式', '立体几何', '解析几何', '导数及其应用'],
  'math-grade12': ['集合与逻辑', '函数与导数', '三角函数', '数列', '解析几何', '概率统计'],
  'chinese-grade7': ['现代文阅读', '古诗文', '写作基础', '语言运用'],
  'chinese-grade8': ['现代文阅读', '文言文', '写作进阶', '名著阅读'],
  'chinese-grade9': ['现代文阅读', '古诗文', '综合性学习', '写作'],
  'chinese-grade10': ['现代文阅读', '文言文', '诗词鉴赏', '写作', '语言文字运用'],
  'chinese-grade11': ['现代文阅读', '文言文', '诗词鉴赏', '写作', '名著导读'],
  'chinese-grade12': ['现代文阅读', '文言文', '诗词鉴赏', '写作', '语言文字运用'],
  'english-grade7': ['阅读理解', '完形填空', '语法基础', '写作', '听力'],
  'english-grade8': ['阅读理解', '完形填空', '语法进阶', '写作', '词汇'],
  'english-grade9': ['阅读理解', '完形填空', '语法综合', '写作', '任务型阅读'],
  'english-grade10': ['阅读理解', '完形填空', '语法填空', '写作', '七选五'],
  'english-grade11': ['阅读理解', '完形填空', '语法填空', '写作', '读后续写'],
  'english-grade12': ['阅读理解', '完形填空', '语法填空', '写作', '读后续写'],
  'physics-grade8': ['声现象', '光现象', '透镜', '物态变化', '质量与密度'],
  'physics-grade9': ['力', '运动和力', '压强', '浮力', '功和机械能', '电学基础'],
  'physics-grade10': ['运动的描述', '力与运动', '牛顿运动定律', '曲线运动', '万有引力'],
  'physics-grade11': ['静电场', '恒定电流', '磁场', '电磁感应', '交变电流'],
  'physics-grade12': ['热学', '光学', '动量', '原子物理', '力学综合'],
  'chemistry-grade9': ['走进化学世界', '空气和氧气', '水与溶液', '碳和碳的氧化物', '金属', '酸碱盐'],
  'chemistry-grade10': ['物质的分类', '离子反应', '氧化还原反应', '钠及其化合物', '铁及其化合物'],
  'chemistry-grade11': ['化学反应原理', '化学平衡', '电离平衡', '电化学', '有机化学基础'],
  'chemistry-grade12': ['化学实验', '物质结构', '化学计算', '有机化学进阶'],
  'biology-grade7': ['生物和生物圈', '细胞', '植物', '人体营养'],
  'biology-grade8': ['人体的运动', '生物的生殖', '生物的遗传', '生物的变异'],
  'biology-grade9': ['生物与环境', '生物多样性', '生物技术', '健康生活'],
  'biology-grade10': ['细胞的分子组成', '细胞结构', '细胞代谢', '细胞分裂', '遗传的基本规律'],
  'biology-grade11': ['遗传与进化', '植物的激素调节', '神经调节', '免疫调节', '生态系统'],
  'biology-grade12': ['生物技术实践', '生物科学与社会', '现代生物科技专题'],
  'history-grade7': ['中华文明的起源', '夏商周时期', '秦汉时期', '三国两晋南北朝'],
  'history-grade8': ['隋唐时期', '宋元时期', '明清时期', '近代中国'],
  'history-grade9': ['中国古代史', '中国近代史', '中国现代史', '世界历史'],
  'history-grade10': ['古代中国政治制度', '古代中国经济', '古代中国文化', '古代中国科技'],
  'history-grade11': ['近代中国', '现代中国', '古代希腊罗马', '近代西方'],
  'history-grade12': ['史学理论', '历史热点专题', '中外历史比较'],
  'geography-grade7': ['地球与地图', '大洲与大洋', '天气与气候', '居民与聚落'],
  'geography-grade8': ['中国地理概况', '中国自然资源', '中国经济发展', '中国区域地理'],
  'geography-grade9': ['世界地理', '世界自然资源', '世界经济发展', '世界区域地理'],
  'geography-grade10': ['自然地理', '人文地理', '区域可持续发展', '地理信息技术'],
  'geography-grade11': ['自然地理', '人文地理', '区域地理', '环境保护'],
  'geography-grade12': ['地理综合', '热点专题', '地理实践'],
  'politics-grade7': ['成长的节拍', '认识自己', '友谊与交往', '生命的思考'],
  'politics-grade8': ['社会生活', '遵守规则', '责任与角色', '国家利益'],
  'politics-grade9': ['富强之路', '民主与法治', '文明与家园', '和谐与梦想'],
  'politics-grade10': ['中国特色社会主义', '经济与社会', '政治与法治', '哲学与文化'],
  'politics-grade11': ['当代国际政治', '经济全球化', '文化传承', '社会热点'],
  'politics-grade12': ['科学社会主义', '经济学常识', '法律与生活', '逻辑与思维']
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
