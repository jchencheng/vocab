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
 * @returns 今日复习队列和需要推迟的单词（已设置好分散的复习时间）
 */
export function getTodayReviewQueue(
  words: Word[],
  maxDailyReviews: number
): { todayQueue: Word[]; postponedWords: Word[] } {
  const now = Date.now();
  const dueWords = words.filter(w => w.nextReviewAt <= now);
  
  // 按优先级排序（间隔长的优先）
  const sortedWords = sortByPriority(dueWords);
  
  const todayQueue = sortedWords.slice(0, maxDailyReviews);
  const postponedWords = sortedWords.slice(maxDailyReviews);
  
  return { todayQueue, postponedWords };
}

/**
 * 将单词分散推迟到未来几天
 * 策略：超出限制的单词按优先级分散到未来3-7天
 * 间隔长的单词优先安排到较早的时间
 * @param words 要推迟的单词列表
 * @returns 已设置好分散复习时间的单词列表
 */
export function postponeWithPriority(words: Word[]): Word[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // 按优先级排序（间隔长的优先，这样间隔长的会先被安排）
  const sortedWords = sortByPriority(words);
  
  return sortedWords.map((word, index) => {
    // 计算推迟天数：
    // - 前1/3优先级的单词推迟1-2天
    // - 中间1/3推迟2-4天
    // - 后1/3推迟4-7天
    const totalWords = sortedWords.length;
    const priorityLevel = index / totalWords; // 0 到 1
    
    let minDays: number;
    let maxDays: number;
    
    if (priorityLevel < 0.33) {
      // 高优先级（间隔长）：1-2天
      minDays = 1;
      maxDays = 2;
    } else if (priorityLevel < 0.66) {
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
  };
}
