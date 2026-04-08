import type { Word, AIContext, AppSettings } from '../types';

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

export async function generateContent(prompt: string, wordList?: string[]): Promise<string> {
  const response = await fetchAPI(`${API_BASE_URL}/generate`, {
    method: 'POST',
    body: JSON.stringify({ prompt, wordList }),
  });
  return response.content;
}
