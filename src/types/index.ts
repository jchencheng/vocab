export interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
  chineseDefinition?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface Phonetic {
  text?: string;
  audio?: string;
}

export interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  quality: number;
  customNote?: string;
}

export interface AppSettings {
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  darkMode?: boolean;
  maxDailyReviews?: number;
}

// Alias for backward compatibility
export type UserSettings = AppSettings;

export interface AIContext {
  id: string;
  wordIds: string[];
  content: string;
  createdAt: number;
}

export interface ReviewStats {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
}

export type ReviewMode = 'en2zh' | 'zh2en';

export interface TabItem {
  id: string;
  label: string;
  icon: string;
}

// ============================================
// 独立用户系统类型定义
// ============================================

export interface AppUser {
  id: string;
  email: string;
  passwordHash: string; // 存储 bcrypt 哈希值
  createdAt: number;
  updatedAt: number;
}

export interface UserSession {
  user: AppUser;
  token: string;
  expiresAt: number;
}
