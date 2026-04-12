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
