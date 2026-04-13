import type { Word, AIContext, AppSettings, UserDailyProgress } from '../types';

const API_BASE_URL = '/api';

// 通用请求函数
async function fetchAPI(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ========== Words API ==========

export async function fetchWords(userId: string): Promise<Word[]> {
  return fetchAPI(`${API_BASE_URL}/words?userId=${userId}`);
}

export async function addWordAPI(word: Word, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/words`, {
    method: 'POST',
    body: JSON.stringify({ word, userId }),
  });
}

export async function updateWordAPI(word: Word, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/words`, {
    method: 'PUT',
    body: JSON.stringify({ word, userId }),
  });
}

export async function deleteWordAPI(wordId: string, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/words?wordId=${wordId}&userId=${userId}`, {
    method: 'DELETE',
  });
}

// ========== Contexts API ==========

export async function fetchContexts(userId: string): Promise<AIContext[]> {
  return fetchAPI(`${API_BASE_URL}/contexts?userId=${userId}`);
}

export async function addContextAPI(context: AIContext, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/contexts`, {
    method: 'POST',
    body: JSON.stringify({ context, userId }),
  });
}

export async function updateContextAPI(context: AIContext, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/contexts`, {
    method: 'PUT',
    body: JSON.stringify({ context, userId }),
  });
}

export async function deleteContextAPI(contextId: string, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/contexts?contextId=${contextId}&userId=${userId}`, {
    method: 'DELETE',
  });
}

// ========== Settings API ==========

export async function fetchSettings(userId: string): Promise<AppSettings | null> {
  return fetchAPI(`${API_BASE_URL}/settings?userId=${userId}`);
}

export async function saveSettingsAPI(settings: AppSettings, userId: string): Promise<void> {
  return fetchAPI(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings, userId }),
  });
}

// ========== Generate API ==========

export async function generateContent(prompt: string, wordList?: string[], model?: string): Promise<{ content: string; model?: string }> {
  const response = await fetchAPI(`${API_BASE_URL}/generate`, {
    method: 'POST',
    body: JSON.stringify({ prompt, wordList, model }),
  });
  return response;
}

// ========== Review API (Optimized) ==========

// 轻量级单词类型（用于复习）
export interface WordForReview {
  id: string;
  word: string;
  phonetic?: string;
  chineseDefinition: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  nextReviewAt: number;
  quality: number;
}

/**
 * 获取复习单词（优化版）
 * 使用单查询 JOIN，只返回轻量级数据
 */
export async function fetchWordsForReview(userId: string, limit: number = 100): Promise<WordForReview[]> {
  return fetchAPI(`${API_BASE_URL}/words/review?userId=${userId}&limit=${limit}`);
}

/**
 * 获取今天需要复习的单词数量
 */
export async function fetchDueTodayCount(userId: string): Promise<number> {
  const response = await fetchAPI(`${API_BASE_URL}/words/review/count?userId=${userId}`);
  return response.count || 0;
}

// ========== Daily Progress API ==========

/**
 * 获取用户指定日期的复习进度
 */
export async function fetchDailyProgress(userId: string, date?: string): Promise<UserDailyProgress | null> {
  const dateParam = date ? `&date=${date}` : '';
  return fetchAPI(`${API_BASE_URL}/daily-progress?userId=${userId}${dateParam}`);
}

/**
 * 创建或更新每日复习进度
 */
export async function saveDailyProgress(progress: Partial<UserDailyProgress>): Promise<UserDailyProgress> {
  return fetchAPI(`${API_BASE_URL}/daily-progress`, {
    method: 'POST',
    body: JSON.stringify(progress),
  });
}

/**
 * 更新每日复习进度（部分更新）
 */
export async function updateDailyProgress(
  userId: string,
  updates: Partial<Omit<UserDailyProgress, 'id' | 'userId' | 'reviewDate'>>,
  date?: string
): Promise<UserDailyProgress> {
  return fetchAPI(`${API_BASE_URL}/daily-progress`, {
    method: 'PUT',
    body: JSON.stringify({ userId, reviewDate: date, ...updates }),
  });
}
