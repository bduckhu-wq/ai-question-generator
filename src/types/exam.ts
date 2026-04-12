import type { QuestionType, Difficulty, TextbookVersion } from './index'

export interface ExamCondition {
  subject?: string
  grade?: string
  textbookVersion?: TextbookVersion
  region?: string
  questionTypes?: QuestionType[]
  difficultyRatio?: {
    easy: number
    medium: number
    hard: number
  }
  count?: number
  scene?: 'homework' | 'unitTest' | 'midterm' | 'special'
  scope?: {
    chapters: string[]
    textbookVersion: TextbookVersion
  }
  knowledgePoints?: string[]
}

export interface Question {
  id: string
  type: QuestionType
  content: string
  options?: Array<{
    label: string
    content: string
  }>
  answer: string
  analysis?: string
  difficulty: Difficulty
  score: number
  knowledgePoints?: string[]
  source: 'bank' | 'ai'
}

export interface ExamSummary {
  title: string
  totalScore: number
  duration: number
  questionCount: number
  coverageRate: number
}

export interface ExamPaper {
  id: string
  title: string
  questions: Question[]
  totalScore: number
  duration: number
  created_at: string
}

export interface ReferenceFile {
  id: string
  name: string
  size: number
  type: string
  file?: File
}

export interface CoverageItem {
  knowledgePoint: string
  coverageRate: number
  coveredCount: number
  suggestedCount: number
}
