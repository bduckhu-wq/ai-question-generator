// 基础适配器接口
export interface AdaptQuestionAdapter {
  adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse>;
}

// 基础参数类型
export interface AdaptQuestionParams {
  grade: string;
  id: string;
  question_image: string;
  question_query: string;
  question_text: string;
  single_model: boolean;
  subject: string;
  term: string;
  textbook: string;
  unit: string;
}

// 基础响应类型
export interface AdaptQuestionResponse {
  code: number;
  message: string;
  data: {
    adapted_questions: Array<{
      id: string;
      content: string;
      options?: Array<{ label: string; content: string }>;
      answer: string;
      analysis: string;
    }>;
  };
}

// ========== 组卷生成接口（新增） ==========

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

// 统一适配器接口（扩展）
export interface ExamAdapter {
  generateExam(params: GenerateExamParams): Promise<GenerateExamResponse>
  clarify(input: string): Promise<ClarifyResponse>
  adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse>
}

// 生成随机请求 ID
export function generateRequestId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 15);
}
