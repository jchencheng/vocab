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
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
  streak: number;
  lastStudyDate: string | null;
}
