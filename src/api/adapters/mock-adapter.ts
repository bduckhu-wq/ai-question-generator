import type { ExamAdapter, GenerateExamParams, GenerateExamResponse, ClarifyResponse, AdaptQuestionParams, AdaptQuestionResponse } from './base'
import { mockQuestions } from '../../mock'

export class MockAdapter implements ExamAdapter {
  async generateExam(params: GenerateExamParams): Promise<GenerateExamResponse> {
    // 模拟网络延迟
    await new Promise(r => setTimeout(r, 500))

    const total = params.count || 15
    const bankCount = Math.min(Math.ceil(total * 0.6), mockQuestions.length)
    const aiCount = total - bankCount

    // 从 mock 数据中筛选匹配题目
    const bankQuestions = mockQuestions
      .filter(q => {
        if (params.subject && q.subject !== params.subject) return false
        return true
      })
      .slice(0, bankCount)
      .map(q => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        content: q.content,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        score: q.score,
        source: 'bank' as const,
        knowledgePoints: q.knowledgePoints
      }))

    // AI 补充题目
    const aiQuestions = Array.from({ length: aiCount }, (_, i) => {
      const base = mockQuestions[i % mockQuestions.length]
      return {
        id: `ai-${Date.now()}-${i}`,
        type: base.type,
        difficulty: base.difficulty,
        content: base.content,
        options: base.options,
        answer: base.answer,
        analysis: base.analysis,
        score: base.score,
        source: 'ai' as const,
        knowledgePoints: base.knowledgePoints
      }
    })

    const allQuestions = [...bankQuestions, ...aiQuestions]
    const totalScore = allQuestions.reduce((sum, q) => sum + q.score, 0)

    return {
      code: 0,
      message: 'success',
      data: {
        questions: allQuestions,
        title: `${params.scene || '练习'}`,
        totalScore,
        duration: params.duration || 60
      }
    }
  }

  async clarify(input: string): Promise<ClarifyResponse> {
    await new Promise(r => setTimeout(r, 200))

    const missing: string[] = []
    const quickOptions: Record<string, string[]> = {}

    // 简单的关键词匹配来判断缺失信息
    const hasSubject = /数学|语文|英语|物理|化学|生物|历史|地理|政治/.test(input)
    const hasGrade = /七年级|八年级|九年级|高一|高二|高三|初一|初二|初三/.test(input)
    const hasVersion = /人教版|北师大版|苏教版|浙教版|沪教版/.test(input)
    const hasScope = /第[一二三四五六七八九十]+[章节单元]|全部|所有|综合/.test(input)
    const hasScene = /课后练习|单元测验|期中|期末|专项|错题|复习|考试|测试/.test(input)

    if (!hasSubject) {
      missing.push('subject')
      quickOptions.subject = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治']
    }
    if (!hasGrade) {
      missing.push('grade')
      quickOptions.grade = ['七年级', '八年级', '九年级', '高一', '高二', '高三']
    }
    if (!hasVersion) {
      missing.push('textbookVersion')
      quickOptions.textbookVersion = ['人教版', '北师大版', '苏教版', '浙教版', '沪教版']
    }
    if (!hasScope) {
      missing.push('scope')
      quickOptions.scope = ['全部章节', '最近学的章节']
    }
    if (!hasScene) {
      missing.push('scene')
      quickOptions.scene = ['课后练习', '单元测验', '期中复习', '期末复习', '专项训练']
    }

    const fieldLabels: Record<string, string> = {
      subject: '学科',
      grade: '年级',
      textbookVersion: '教材版本',
      scope: '考试范围',
      scene: '试卷场景'
    }

    const message = missing.length > 0
      ? `好的！还需要确认以下信息：\n${missing.map(f => `${fieldLabels[f] || f}？`).join('\n')}`
      : ''

    return { missingFields: missing, message, quickOptions }
  }

  async adapt(params: AdaptQuestionParams): Promise<AdaptQuestionResponse> {
    await new Promise(r => setTimeout(r, 300))
    // Mock: 返回原题的简单变体
    return {
      code: 0,
      message: 'success',
      data: {
        adapted_questions: [{
          id: `adapted-${Date.now()}`,
          content: `[Mock改编] ${params.question_text}`,
          answer: '这是改编后的答案',
          analysis: '这是改编后的解析'
        }]
      }
    }
  }
}
