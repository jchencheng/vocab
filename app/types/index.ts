export interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics: any[];
  
  // 内置释义（来自系统预置单词书，只读）
  builtInMeanings?: Meaning[];
  
  // 用户释义（可编辑）- 等同于 meanings
  userMeanings?: Meaning[];
  meanings: Meaning[];
  
  tags: string[];
  customNote?: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReviewAt: number;
  createdAt: number;
  updatedAt: number;
  quality: number;
  
  // 来源标记
  source?: 'builtin' | 'user' | 'hybrid';
  
  // 如果是从系统单词创建的，记录原始单词ID
  originalWordId?: string;
}

export interface AIContext {
  id: string;
  content: string;
  wordIds: string[];
  createdAt: number;
}

export interface AppSettings {
  maxDailyReviews?: number;
  darkMode?: boolean;
  studyMode?: 'book-only' | 'book-priority' | 'mixed';
  primaryWordBookId?: string | null;
}

export interface ReviewStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface Definition {
  definition: string;
  example?: string;
  chineseDefinition?: string;
  synonyms: string[];
  antonyms: string[];
}

// 从 wordbook.ts 重新导出
export * from './wordbook';

// 单词检查结果
export interface WordCheckResult {
  userWord?: Word;      // 用户已添加的单词
  builtinWord?: Word;   // 系统预置单词
  existsInUserLibrary: boolean;
  existsInBuiltin: boolean;
}

// 添加单词请求
export interface AddWordRequest {
  word: string;
  userId: string;
  phonetic?: string;
  meanings?: Meaning[];
  tags?: string[];
  useBuiltinMeanings?: boolean;
  originalWordId?: string;
  force?: boolean;
}
