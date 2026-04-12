// 单词书
export interface WordBook {
  id: string;
  userId: string | null;
  name: string;
  description?: string;
  wordCount: number;
  sourceType: 'system' | 'custom';
  category?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// 单词书条目
export interface WordBookItem {
  id: string;
  wordBookId: string;
  wordId: string;
  status: 'learning' | 'mastered' | 'ignored';
  addedAt: number;
  masteredAt?: number;
}

// 学习序列项
export interface LearningSequenceItem {
  id: string;
  userId: string;
  wordBookId: string;
  wordBook?: WordBook;
  isPrimary: boolean;
  priority: number;
  addedAt: number;
}

// 单词书统计
export interface WordBookStats {
  total: number;
  learning: number;
  mastered: number;
  ignored: number;
  progress: number;
}

// 创建单词书请求
export interface CreateWordBookRequest {
  name: string;
  description?: string;
  category?: string;
}

// 学习模式
export type StudyMode = 'book-only' | 'book-priority' | 'mixed';
