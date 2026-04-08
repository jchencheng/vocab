export interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics: any[];
  meanings: any[];
  tags: string[];
  customNote?: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReviewAt: number;
  createdAt: number;
  updatedAt: number;
  quality: number;
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
