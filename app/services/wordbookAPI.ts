import type { WordBook, CreateWordBookRequest, LearningSequenceItem, StudyMode, Word } from '../types';

const API_BASE = '/api';

// 获取所有单词书
export async function fetchWordBooks(userId: string): Promise<{
  systemBooks: WordBook[];
  learningSequence: LearningSequenceItem[];
  customBooks: WordBook[];
}> {
  const response = await fetch(`${API_BASE}/wordbooks?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch wordbooks');
  return response.json();
}

// 创建自定义单词书
export async function createWordBook(
  userId: string,
  data: CreateWordBookRequest
): Promise<WordBook> {
  const response = await fetch(`${API_BASE}/wordbooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, userId })
  });
  if (!response.ok) throw new Error('Failed to create wordbook');
  return response.json();
}

// 获取单词书详情
export async function fetchWordBookDetail(
  id: string,
  userId: string
): Promise<WordBook & { stats: any; inSequence: boolean; isPrimary: boolean }> {
  const response = await fetch(`${API_BASE}/wordbooks/${id}?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch wordbook detail');
  return response.json();
}

// 删除自定义单词书
export async function deleteWordBook(id: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/wordbooks/${id}?userId=${userId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete wordbook');
}

// 获取学习序列
export async function fetchLearningSequence(userId: string): Promise<LearningSequenceItem[]> {
  const response = await fetch(`${API_BASE}/learning-sequence?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch learning sequence');
  return response.json();
}

// 添加单词书到学习序列
export async function addToLearningSequence(
  userId: string,
  wordBookId: string,
  isPrimary: boolean = false
): Promise<LearningSequenceItem> {
  const response = await fetch(`${API_BASE}/learning-sequence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, wordBookId, isPrimary })
  });
  if (!response.ok) throw new Error('Failed to add to learning sequence');
  return response.json();
}

// 从学习序列移除
export async function removeFromLearningSequence(
  userId: string,
  wordBookId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/learning-sequence?userId=${userId}&wordBookId=${wordBookId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Failed to remove from learning sequence');
}

// 设置主学单词书
export async function setPrimaryWordBook(
  userId: string,
  wordBookId: string
): Promise<LearningSequenceItem> {
  const response = await fetch(`${API_BASE}/learning-sequence/primary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, wordBookId })
  });
  if (!response.ok) throw new Error('Failed to set primary wordbook');
  return response.json();
}

// 重新学习（重置进度）
export async function resetWordBook(id: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/wordbooks/${id}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) throw new Error('Failed to reset wordbook');
}

// 获取单词书单词列表（分页）
export async function fetchWordBookWords(
  id: string,
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ words: Word[]; total: number }> {
  const response = await fetch(
    `${API_BASE}/wordbooks/${id}/words?userId=${userId}&page=${page}&pageSize=${pageSize}`
  );
  if (!response.ok) throw new Error('Failed to fetch wordbook words');
  return response.json();
}
