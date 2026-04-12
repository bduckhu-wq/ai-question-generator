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
