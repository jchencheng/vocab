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
