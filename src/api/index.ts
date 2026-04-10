import { CozeAdapter } from './adapters/coze';
import type { AdaptQuestionAdapter, AdaptQuestionParams, AdaptQuestionResponse } from './adapters/base';

// 根据配置选择适配器
function createAdapter(): AdaptQuestionAdapter {
  const adapterType = import.meta.env.VITE_API_ADAPTER || 'coze';
  
  switch (adapterType) {
    case 'coze':
      return new CozeAdapter();
    // 可以添加其他适配器
    // case 'openai':
    //   return new OpenAIAdapter();
    default:
      return new CozeAdapter();
  }
}

// 创建适配器实例
const adapter = createAdapter();

// 导出统一的 API 服务
export async function adaptQuestion(params: AdaptQuestionParams): Promise<AdaptQuestionResponse> {
  return adapter.adapt(params);
}

// 导出类型
export type {
  AdaptQuestionParams,
  AdaptQuestionResponse
} from './adapters/base';
