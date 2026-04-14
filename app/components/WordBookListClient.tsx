'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { WordBookCard } from './WordBookCard';
import { StudyModeSelector } from './StudyModeSelector';
import type { WordBook, StudyMode, WordBookStats } from '../types';
import {
  fetchWordBooks,
  addToLearningSequence,
  removeFromLearningSequence,
  setPrimaryWordBook,
  createWordBook
} from '../services/wordbookAPI';
import { useApp } from '../context/AppContext';

interface WordBookListClientProps {
  initialData: {
    systemBooks: WordBook[];
    learningSequence: any[];
    customBooks: WordBook[];
    stats: Record<string, WordBookStats>;
  };
  userId: string;
}

// SWR fetcher
const wordbooksFetcher = async (userId: string) => {
  return fetchWordBooks(userId);
};

export function WordBookListClient({ initialData, userId }: WordBookListClientProps) {
  const router = useRouter();
  const { settings, saveSettings } = useApp();
  
  // SWR 客户端缓存
  const { data, mutate, isValidating } = useSWR(
    userId ? ['wordbooks', userId] : null,
    () => wordbooksFetcher(userId),
    {
      fallbackData: {
        systemBooks: initialData.systemBooks,
        learningSequence: initialData.learningSequence,
        customBooks: initialData.customBooks,
        stats: initialData.stats
      },
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5秒内重复请求去重
    }
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDescription, setNewBookDescription] = useState('');
  const [bookStats, setBookStats] = useState<Record<string, WordBookStats>>(initialData.stats);
  const [isMutating, setIsMutating] = useState(false);

  const systemBooks = data?.systemBooks || initialData.systemBooks;
  const learningSequence = data?.learningSequence || initialData.learningSequence;
  const customBooks = data?.customBooks || initialData.customBooks;

  const handleModeChange = useCallback(async (mode: StudyMode) => {
    await saveSettings({ ...settings, studyMode: mode });
  }, [settings, saveSettings]);

  const handleAddToSequence = async (bookId: string) => {
    try {
      setIsMutating(true);
      const isFirstBook = learningSequence.length === 0;
      await addToLearningSequence(userId, bookId, isFirstBook);
      await mutate(); // 触发 SWR 重新验证
      if (isFirstBook) {
        await saveSettings({ ...settings, primaryWordBookId: bookId });
      }
    } catch (error: any) {
      console.error('Error adding to sequence:', error);
      if (error.message?.includes('already in learning sequence')) {
        alert('该单词书已经在学习序列中');
      } else if (error.message?.includes('User ID and WordBook ID are required')) {
        alert('用户信息错误，请重新登录');
      } else {
        alert('添加到学习序列失败: ' + (error.message || '未知错误'));
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemoveFromSequence = async (bookId: string) => {
    if (!confirm('确定要从学习序列中移除此单词书吗？')) return;
    try {
      setIsMutating(true);
      await removeFromLearningSequence(userId, bookId);
      await mutate(); // 触发 SWR 重新验证
      if (settings.primaryWordBookId === bookId) {
        await saveSettings({ ...settings, primaryWordBookId: null });
      }
    } catch (error) {
      console.error('Error removing from sequence:', error);
      alert('移除失败');
    } finally {
      setIsMutating(false);
    }
  };

  const handleSetPrimary = async (bookId: string) => {
    try {
      setIsMutating(true);
      await setPrimaryWordBook(userId, bookId);
      await saveSettings({ ...settings, primaryWordBookId: bookId });
      await mutate(); // 触发 SWR 重新验证
    } catch (error) {
      console.error('Error setting primary:', error);
      alert('设置主学单词书失败');
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateBook = async () => {
    if (!newBookName.trim()) return;
    try {
      setIsMutating(true);
      await createWordBook(userId, {
        name: newBookName.trim(),
        description: newBookDescription.trim() || undefined
      });
      setNewBookName('');
      setNewBookDescription('');
      setShowCreateModal(false);
      await mutate(); // 触发 SWR 重新验证
    } catch (error) {
      console.error('Error creating book:', error);
      alert('创建单词书失败');
    } finally {
      setIsMutating(false);
    }
  };

  // 获取学习序列中的单词书 ID 集合
  const sequenceBookIds = new Set(learningSequence.map((item: any) => 
    item.word_book_id || item.wordBookId
  ));

  // 过滤出未添加的系统单词书
  const availableSystemBooks = systemBooks.filter(book => !sequenceBookIds.has(book.id));

  // 合并学习序列中的单词书（系统 + 自定义）
  const sequenceBooks = learningSequence.map((item: any) => {
    // Supabase 返回下划线命名，转换为驼峰
    const wordBook = item.word_book || item.wordBook;
    return {
      ...wordBook,
      sequenceId: item.id,
      isPrimary: item.is_primary || item.isPrimary
    };
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">单词书</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理你的学习单词书</p>
        </div>
        <div className="flex items-center gap-3">
          <StudyModeSelector
            currentMode={settings.studyMode || 'book-priority'}
            onChange={handleModeChange}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={isMutating}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
          >
            + 添加单词书
          </button>
        </div>
      </div>

      {/* 加载状态指示器 */}
      {isValidating && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin" />
          同步中...
        </div>
      )}

      {/* 学习序列 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          我的学习序列
        </h2>
        {sequenceBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sequenceBooks.map((book) => (
              <WordBookCard
                key={book.id}
                book={book}
                stats={bookStats[book.id]}
                inSequence={true}
                isPrimary={book.isPrimary}
                onRemoveFromSequence={() => handleRemoveFromSequence(book.id)}
                onSetPrimary={() => handleSetPrimary(book.id)}
                onViewDetail={() => router.push(`/wordbooks/${book.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            暂无学习中的单词书，点击下方系统单词书添加
          </div>
        )}
      </section>

      {/* 系统单词书 */}
      {availableSystemBooks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            系统单词书
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSystemBooks.map((book) => (
              <WordBookCard
                key={book.id}
                book={book}
                inSequence={false}
                onAddToSequence={() => handleAddToSequence(book.id)}
                onViewDetail={() => router.push(`/wordbooks/${book.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 创建单词书弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              创建自定义单词书
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  名称 *
                </label>
                <input
                  type="text"
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入单词书名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  描述
                </label>
                <textarea
                  value={newBookDescription}
                  onChange={(e) => setNewBookDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入描述（可选）"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isMutating}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateBook}
                disabled={!newBookName.trim() || isMutating}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
              >
                {isMutating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
