import type { Question, SceneTemplate, ChatMessage } from '../types'

// Mock 题目数据
export const mockQuestions: Question[] = [
  {
    id: 'q1',
    type: 'choice',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '导数'],
    content: '已知函数 f(x) = x³ - 3x + 1，则 f\'(x) = （  ）',
    options: [
      { label: 'A', content: '3x² - 3' },
      { label: 'B', content: 'x² - 3' },
      { label: 'C', content: '3x² + 1' },
      { label: 'D', content: '3x - 3' }
    ],
    answer: 'A',
    analysis: '对 f(x) = x³ - 3x + 1 求导，得 f\'(x) = 3x² - 3。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q2',
    type: 'choice',
    difficulty: 'easy',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '定义域'],
    content: '函数 f(x) = ln(x - 1) 的定义域为（  ）',
    options: [
      { label: 'A', content: '(1, +∞)' },
      { label: 'B', content: '[1, +∞)' },
      { label: 'C', content: '(0, +∞)' },
      { label: 'D', content: '(-∞, 1)' }
    ],
    answer: 'A',
    analysis: '要使 ln(x - 1) 有意义，需要 x - 1 > 0，即 x > 1。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q3',
    type: 'choice',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '单调性'],
    content: '函数 f(x) = x² - 2x + 3 在区间（-∞, 1）上是（  ）',
    options: [
      { label: 'A', content: '单调递增' },
      { label: 'B', content: '单调递减' },
      { label: 'C', content: '先增后减' },
      { label: 'D', content: '先减后增' }
    ],
    answer: 'B',
    analysis: 'f(x) = (x-1)² + 2，对称轴 x=1，在(-∞,1)上单调递减。',
    score: 5,
    source: 'ai'
  },
  {
    id: 'q4',
    type: 'choice',
    difficulty: 'hard',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['导数', '极值'],
    content: '函数 f(x) = x³ - 3x² + 4 在 x = 1 处（  ）',
    options: [
      { label: 'A', content: '有极大值' },
      { label: 'B', content: '有极小值' },
      { label: 'C', content: '无极值' },
      { label: 'D', content: '无法确定' }
    ],
    answer: 'A',
    analysis: 'f\'(x) = 3x² - 6x = 3x(x-2)，f\'(1) = -3 < 0，f\'(0) = 0 > 0，故 x=1 处有极大值。',
    score: 5,
    source: 'ai'
  },
  {
    id: 'q5',
    type: 'choice',
    difficulty: 'easy',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '奇偶性'],
    content: '下列函数中，是偶函数的是（  ）',
    options: [
      { label: 'A', content: 'f(x) = x³' },
      { label: 'B', content: 'f(x) = x²' },
      { label: 'C', content: 'f(x) = 2x + 1' },
      { label: 'D', content: 'f(x) = 1/x' }
    ],
    answer: 'B',
    analysis: 'f(-x) = (-x)² = x² = f(x)，满足偶函数定义。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q6',
    type: 'fillBlank',
    difficulty: 'easy',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '求值'],
    content: '若 f(x) = 2x + 1，则 f(3) = ______。',
    answer: '7',
    analysis: 'f(3) = 2×3 + 1 = 7。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q7',
    type: 'fillBlank',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['导数', '切线'],
    content: '曲线 y = x² 在点 (1, 1) 处的切线方程为 ______。',
    answer: 'y = 2x - 1',
    analysis: 'y\' = 2x，在 x=1 处斜率 k=2，切线方程 y - 1 = 2(x - 1)，即 y = 2x - 1。',
    score: 5,
    source: 'ai'
  },
  {
    id: 'q8',
    type: 'fillBlank',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '零点'],
    content: '函数 f(x) = x² - 4x + 3 的零点为 ______。',
    answer: 'x = 1 或 x = 3',
    analysis: 'x² - 4x + 3 = (x-1)(x-3) = 0，解得 x=1 或 x=3。',
    score: 5,
    source: 'ai'
  },
  {
    id: 'q9',
    type: 'shortAnswer',
    difficulty: 'hard',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['导数', '应用'],
    content: '已知函数 f(x) = x³ - 3x，求 f(x) 的单调递增区间和单调递减区间。',
    answer: '单调递增区间为 (-∞, -1) 和 (1, +∞)，单调递减区间为 (-1, 1)。',
    analysis: 'f\'(x) = 3x² - 3 = 3(x+1)(x-1)。令 f\'(x) > 0，得 x < -1 或 x > 1；令 f\'(x) < 0，得 -1 < x < 1。',
    score: 10,
    source: 'ai'
  },
  {
    id: 'q10',
    type: 'shortAnswer',
    difficulty: 'hard',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '导数', '最值'],
    content: '用一段长为 20m 的铁丝围成一个矩形，怎样围才能使矩形的面积最大？最大面积是多少？',
    answer: '围成正方形时面积最大，最大面积为 25m²。',
    analysis: '设长为 x，则宽为 (20-2x)/2 = 10-x，面积 S = x(10-x) = -x² + 10x。当 x = 5 时取最大值 S = 25。',
    score: 10,
    source: 'ai'
  },
  {
    id: 'q11',
    type: 'choice',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '图像'],
    content: '函数 y = |x| 的图像关于（  ）对称',
    options: [
      { label: 'A', content: 'x 轴' },
      { label: 'B', content: 'y 轴' },
      { label: 'C', content: '原点' },
      { label: 'D', content: '直线 y = x' }
    ],
    answer: 'B',
    analysis: 'y = |x| 是偶函数，图像关于 y 轴对称。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q12',
    type: 'choice',
    difficulty: 'easy',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '基本性质'],
    content: '下列函数中，定义域为 R 的是（  ）',
    options: [
      { label: 'A', content: 'f(x) = 1/x' },
      { label: 'B', content: 'f(x) = √x' },
      { label: 'C', content: 'f(x) = x² + 1' },
      { label: 'D', content: 'f(x) = ln x' }
    ],
    answer: 'C',
    analysis: 'x² + 1 对任意实数 x 都有意义。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q13',
    type: 'fillBlank',
    difficulty: 'easy',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['导数', '基本公式'],
    content: '函数 f(x) = e^x 的导数为 f\'(x) = ______。',
    answer: 'e^x',
    analysis: '(e^x)\' = e^x 是导数基本公式。',
    score: 5,
    source: 'bank'
  },
  {
    id: 'q14',
    type: 'choice',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['函数', '复合函数'],
    content: '若 f(x) = 2x + 1，g(x) = x²，则 f(g(2)) = （  ）',
    options: [
      { label: 'A', content: '9' },
      { label: 'B', content: '25' },
      { label: 'C', content: '5' },
      { label: 'D', content: '7' }
    ],
    answer: 'A',
    analysis: 'g(2) = 4，f(4) = 2×4 + 1 = 9。',
    score: 5,
    source: 'ai'
  },
  {
    id: 'q15',
    type: 'shortAnswer',
    difficulty: 'medium',
    subject: 'math',
    grade: 'grade10',
    knowledgePoints: ['导数', '证明'],
    content: '证明：函数 f(x) = x³ 在 R 上是单调递增函数。',
    answer: '证明：f\'(x) = 3x² ≥ 0，且仅在 x=0 时 f\'(x)=0，故 f(x) 在 R 上单调递增。',
    analysis: '利用导数判断单调性：f\'(x) ≥ 0 恒成立，且不恒为 0，故单调递增。',
    score: 10,
    source: 'ai'
  }
]

// 场景模板
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
      questionTypes: ['choice', 'fillBlank']
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
      questionTypes: ['choice', 'fillBlank', 'shortAnswer']
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
      questionTypes: ['choice', 'fillBlank', 'shortAnswer']
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
      questionTypes: ['choice', 'fillBlank', 'shortAnswer']
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
      questionTypes: ['choice', 'fillBlank']
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
      questionTypes: ['choice', 'fillBlank']
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
      questionTypes: ['choice']
    }
  }
]

// Mock 对话消息
export const initialMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    content: '您好！我是 AI 出题助手 👋\n\n请告诉我您的出题需求，或使用下方的快捷条件快速开始。也可以选择一个预设场景模板，一键生成试卷。',
    type: 'text',
    timestamp: new Date().toISOString()
  }
]

// Mock 最近编辑
export const recentEdits = [
  { id: 'r1', name: '高一数学函数测试', icon: '📄', updatedAt: '10分钟前' },
  { id: 'r2', name: '初二物理期中复习', icon: '📄', updatedAt: '2小时前' },
  { id: 'r3', name: '英语阅读理解专项', icon: '📄', updatedAt: '昨天' }
]

// 题库 Mock 数据
export const bankQuestions = mockQuestions.map(q => ({
  ...q,
  tags: [q.difficulty === 'easy' ? '基础' : q.difficulty === 'medium' ? '提高' : '挑战'],
  usageCount: Math.floor(Math.random() * 10),
  createdAt: '2026-03-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0'),
  isFavorite: Math.random() > 0.7
}))
