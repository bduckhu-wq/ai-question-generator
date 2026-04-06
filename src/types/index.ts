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
