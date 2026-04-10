import type { AdaptQuestionAdapter, AdaptQuestionParams, AdaptQuestionResponse } from './base';
import { generateRequestId } from './base';

export class CozeAdapter implements AdaptQuestionAdapter {
  async adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse> {
    const requestId = generateRequestId();
    
    // 使用配置的 API URL 和服务密钥
    const apiUrl = import.meta.env.VITE_API_URL || 'http://platform-test.mifengjiaoyu.com/api/sc/coze/workflow/v1';
    const serviceKey = import.meta.env.VITE_SERVICE_KEY || 'ai_math_similar_question';
    const authorization = import.meta.env.VITE_API_AUTHORIZATION || '';
    
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
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}
