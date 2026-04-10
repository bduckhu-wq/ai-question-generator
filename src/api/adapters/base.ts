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

// 生成随机请求 ID
export function generateRequestId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 15);
}
