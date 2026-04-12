import type { Word, WordCheckResult, AddWordRequest, Meaning } from '../types';

const API_BASE = '/api';

// 检查单词是否存在
export async function checkWordExists(
  word: string,
  userId: string
): Promise<WordCheckResult> {
  const response = await fetch(
    `${API_BASE}/words/check?word=${encodeURIComponent(word)}&userId=${userId}`
  );
  if (!response.ok) throw new Error('Failed to check word');
  return response.json();
}

// 添加单词（带检查）
export async function addWordWithCheck(
  data: AddWordRequest
): Promise<Word> {
  const response = await fetch(`${API_BASE}/words`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.error === 'WORD_EXISTS') {
      throw new Error('WORD_EXISTS');
    }
    throw new Error(error.error || 'Failed to add word');
  }
  
  return response.json();
}

// 从词典获取单词信息
export async function fetchWordFromDictionary(word: string): Promise<{
  meanings: Meaning[];
  phonetic?: string;
  phonetics: any[];
}> {
  // 这里可以调用现有的词典 API
  // 暂时返回空结构
  return {
    meanings: [],
    phonetics: [],
  };
}
