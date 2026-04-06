interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
    }>;
    synonyms: string[];
    antonyms: string[];
  }>;
  tags: string[];
  createdAt: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  quality: number;
  customNote?: string;
}

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const FIRST_INTERVAL = 1;
const SECOND_INTERVAL = 6;

export function createNewWord(wordData: Omit<Word, 'id' | 'tags' | 'createdAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>, tags: string[] = []): Word {
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

export function getIntervalText(interval: number): string {
  if (interval === 0) return 'New';
  if (interval === 1) return '1 day';
  if (interval < 30) return `${interval} days`;
  if (interval < 365) return `${Math.round(interval / 30)} months`;
  return `${Math.round(interval / 365)} years`;
}
