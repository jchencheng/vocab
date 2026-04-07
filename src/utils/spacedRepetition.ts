import type { Word } from '../types';
import { 
  DEFAULT_EASE_FACTOR, 
  MIN_EASE_FACTOR, 
  FIRST_INTERVAL, 
  SECOND_INTERVAL 
} from '../constants';

export function createNewWord(
  wordData: Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>,
  tags: string[] = []
): Word {
  const now = Date.now();
  return {
    ...wordData,
    id: crypto.randomUUID(),
    tags,
    createdAt: now,
    nextReviewAt: now,
    reviewCount: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    quality: 0,
  };
}

export function calculateNextReview(word: Word, quality: number): Word {
  let { easeFactor, interval, reviewCount } = word;

  if (quality < 3) {
    reviewCount = 0;
    interval = 0;
  } else {
    if (reviewCount === 0) {
      interval = FIRST_INTERVAL;
    } else if (reviewCount === 1) {
      interval = SECOND_INTERVAL;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    reviewCount++;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) {
    easeFactor = MIN_EASE_FACTOR;
  }

  const now = Date.now();
  const nextReviewAt = now + interval * 24 * 60 * 60 * 1000;

  return {
    ...word,
    easeFactor,
    interval,
    reviewCount,
    quality,
    nextReviewAt,
  };
}

export function getDueWords(words: Word[]): Word[] {
  const now = Date.now();
  return words.filter(w => w.nextReviewAt <= now);
}

export function shuffleWords(words: Word[]): Word[] {
  return [...words].sort(() => Math.random() - 0.5);
}

export function limitWords(words: Word[], limit: number): Word[] {
  return words.slice(0, limit);
}
