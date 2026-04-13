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

/**
 * 根据学习模式获取待复习单词
 * @param words 所有单词
 * @param studyMode 学习模式
 * @param primaryWordBookId 主学单词书ID
 * @param wordBookItems 单词书条目（用于判断单词属于哪些书）
 */
export function getDueWordsByStudyMode(
  words: Word[],
  studyMode: 'book-only' | 'book-priority' | 'mixed',
  primaryWordBookId?: string | null,
  wordBookItems?: { word_id: string; word_book_id: string }[]
): Word[] {
  const dueWords = getDueWords(words);

  if (studyMode === 'mixed' || !primaryWordBookId) {
    return dueWords;
  }

  // 获取主学单词书中的单词ID集合
  const primaryBookWordIds = new Set(
    wordBookItems
      ?.filter(item => item.word_book_id === primaryWordBookId)
      .map(item => item.word_id) || []
  );

  if (studyMode === 'book-only') {
    // 只从主学单词书中抽取
    return dueWords.filter(w => primaryBookWordIds.has(w.id));
  }

  if (studyMode === 'book-priority') {
    // 优先主学单词书，但保留其他单词在后面
    const primaryWords = dueWords.filter(w => primaryBookWordIds.has(w.id));
    const otherWords = dueWords.filter(w => !primaryBookWordIds.has(w.id));
    return [...primaryWords, ...otherWords];
  }

  return dueWords;
}

/**
 * 简单的 seeded random 函数
 * 相同的种子会产生相同的随机数序列
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
}

/**
 * 将字符串转换为数字种子
 */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 使用种子打乱数组顺序
 * 相同的种子和数组会产生相同的顺序
 */
export function shuffleWordsWithSeed(words: Word[], seed: string | number): Word[] {
  const numSeed = typeof seed === 'string' ? stringToSeed(seed) : seed;
  const random = seededRandom(numSeed);
  const result = [...words];
  
  // Fisher-Yates shuffle with seeded random
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

export function shuffleWords(words: Word[]): Word[] {
  return [...words].sort(() => Math.random() - 0.5);
}

export function limitWords(words: Word[], limit: number): Word[] {
  return words.slice(0, limit);
}

/**
 * 计算单词的记忆难度评分 (0-100，分数越高越困难)
 * 基于 quality, easeFactor, interval, reviewCount 综合评估
 */
export function calculateMemoryDifficulty(word: Word): number {
  let difficulty = 0;
  
  // 1. 质量评分影响 (quality: 0-5，越低越困难)
  if (word.quality <= 2) {
    difficulty += 40;
  } else if (word.quality === 3) {
    difficulty += 20;
  }
  
  // 2. 易度因子影响 (easeFactor: 默认 2.5，越低越困难)
  if (word.easeFactor < 2.0) {
    difficulty += 25;
  } else if (word.easeFactor < 2.3) {
    difficulty += 15;
  }
  
  // 3. 复习次数影响 (复习次数多但 interval 短 = 记不住)
  if (word.reviewCount >= 3 && word.interval < 7) {
    difficulty += 20;
  }
  
  // 4. 间隔天数影响 (长期没复习的单词)
  const daysSinceReview = Math.floor((Date.now() - word.nextReviewAt) / (24 * 60 * 60 * 1000));
  if (daysSinceReview > 0) {
    difficulty += Math.min(daysSinceReview * 2, 15);
  }
  
  return Math.min(difficulty, 100);
}

/**
 * 按记忆难度排序，优先选择最困难的单词
 * @param words 单词列表
 * @param count 选择数量
 * @param minDifficulty 最小难度阈值 (默认30)
 */
export function selectDifficultWords(
  words: Word[], 
  count: number = 10, 
  minDifficulty: number = 30
): Word[] {
  return words
    .map(w => ({ word: w, difficulty: calculateMemoryDifficulty(w) }))
    .filter(w => w.difficulty >= minDifficulty)
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, count)
    .map(w => w.word);
}

/**
 * 混合模式：70% 困难单词 + 30% 随机单词
 * @param words 单词列表
 * @param count 选择数量
 */
export function selectMixedWords(words: Word[], count: number = 10): Word[] {
  const difficultCount = Math.floor(count * 0.7);
  const randomCount = count - difficultCount;
  
  // 获取困难单词（多选一些用于备选）
  const difficultWords = selectDifficultWords(words, difficultCount * 2, 20);
  
  // 获取随机单词（排除已选的困难单词）
  const difficultIds = new Set(difficultWords.map(w => w.id));
  const remainingWords = words.filter(w => !difficultIds.has(w.id));
  const randomWords = shuffleWords(remainingWords).slice(0, randomCount);
  
  // 合并后再次随机排序
  return shuffleWords([
    ...difficultWords.slice(0, difficultCount), 
    ...randomWords
  ]);
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
