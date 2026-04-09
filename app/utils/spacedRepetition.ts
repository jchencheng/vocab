import type { Word } from '../types';
import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  FIRST_INTERVAL,
  SECOND_INTERVAL,
} from '../constants';

export function createNewWord(
  wordData: Omit<Word, 'id' | 'tags' | 'createdAt' | 'updatedAt' | 'nextReviewAt' | 'reviewCount' | 'easeFactor' | 'interval' | 'quality'>,
  tags: string[] = []
): Word {
  const now = Date.now();
  return {
    ...wordData,
    id: crypto.randomUUID(),
    tags,
    createdAt: now,
    updatedAt: now,
    nextReviewAt: now, // 新单词立即可复习
    reviewCount: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0, // 初始间隔为0，第一次复习后变为 FIRST_INTERVAL (1天)
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

  easeFactor = Math.max(
    MIN_EASE_FACTOR,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReviewAt = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    ...word,
    easeFactor,
    interval,
    reviewCount,
    quality, // 保存评分质量
    nextReviewAt,
    updatedAt: Date.now(),
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

/**
 * 按间隔排序（间隔长的优先）
 * 间隔相同的情况下，按复习次数排序（复习次数多的优先）
 */
export function sortByPriority(words: Word[]): Word[] {
  return [...words].sort((a, b) => {
    // 优先按间隔排序（间隔大的优先）
    if (b.interval !== a.interval) {
      return b.interval - a.interval;
    }
    // 间隔相同，按复习次数排序（复习次数多的优先）
    if (b.reviewCount !== a.reviewCount) {
      return b.reviewCount - a.reviewCount;
    }
    // 都相同，随机排序
    return Math.random() - 0.5;
  });
}

/**
 * 获取今日复习队列（按优先级排序），并将超出限制的单词分散推迟
 * @param words 所有单词
 * @param maxDailyReviews 每日最大复习数量
 * @returns 今日复习队列和需要推迟的单词
 */
export function getTodayReviewQueue(words: Word[], maxDailyReviews: number): { todayQueue: Word[]; postponedWords: Word[] } {
  const dueWords = getDueWords(words);
  const shuffled = shuffleWords(dueWords);

  const todayQueue = limitWords(shuffled, maxDailyReviews);
  const postponedWords = shuffled.slice(maxDailyReviews);

  return { todayQueue, postponedWords };
}

/**
 * 将单词按优先级分散推迟到未来几天
 * 高优先级（间隔长）的单词会安排在较近的时间
 * @param words 要推迟的单词
 * @returns 更新后的单词数组
 */
export function postponeWithPriority(words: Word[]): Word[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // 按优先级排序
  const sortedWords = sortByPriority(words);

  return sortedWords.map((word, index) => {
    // 根据优先级分配不同的推迟时间
    const totalWords = sortedWords.length;
    const position = index / totalWords; // 0 到 1 之间的值

    let minDays: number;
    let maxDays: number;

    if (position < 0.33) {
      // 高优先级（间隔长）：1-2天
      minDays = 1;
      maxDays = 2;
    } else if (position < 0.67) {
      // 中优先级：2-4天
      minDays = 2;
      maxDays = 4;
    } else {
      // 低优先级（间隔短或新单词）：4-7天
      minDays = 4;
      maxDays = 7;
    }

    // 在范围内随机选择天数，增加一些随机性避免堆积
    const days = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
    const nextReviewAt = now + days * oneDay;

    return {
      ...word,
      nextReviewAt,
      updatedAt: now,
    };
  });
}

/**
 * 将单词推迟到明天复习（保持原有间隔不变）
 * 用于单个单词的推迟
 * @param word 要推迟的单词
 * @returns 更新后的单词
 */
export function postponeToTomorrow(word: Word): Word {
  const now = Date.now();
  const tomorrow = now + 24 * 60 * 60 * 1000;

  return {
    ...word,
    nextReviewAt: tomorrow,
    updatedAt: now,
  };
}
