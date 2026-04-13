'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
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

export function WordBookList() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, saveSettings } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDescription, setNewBookDescription] = useState('');
  const [systemBooks, setSystemBooks] = useState<WordBook[]>([]);
  const [learningSequence, setLearningSequence] = useState<any[]>([]);
  const [customBooks, setCustomBooks] = useState<WordBook[]>([]);
  const [bookStats, setBookStats] = useState<Record<string, WordBookStats>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadWordBooks = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const data = await fetchWordBooks(user.id);
      setSystemBooks(data.systemBooks);
      setLearningSequence(data.learningSequence);
      setCustomBooks(data.customBooks);

      // 获取每本书的统计
      const stats: Record<string, WordBookStats> = {};
      for (const item of data.learningSequence) {
        if (item.wordBook) {
          const book = item.wordBook;
          // 这里简化处理，实际应该从 API 获取统计
          stats[book.id] = {
            total: book.wordCount || 0,
            learning: 0,
            mastered: 0,
            ignored: 0,
            progress: 0
          };
        }
      }
      setBookStats(stats);
    } catch (error) {
      console.error('Error loading wordbooks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('WordBookList useEffect triggered, user?.id:', user?.id);
    if (user?.id) {
      loadWordBooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // 只依赖 user?.id，避免 loadWordBooks 引用变化导致循环

  const handleModeChange = useCallback(async (mode: StudyMode) => {
    await saveSettings({ ...settings, studyMode: mode });
  }, [settings, saveSettings]);

  const handleAddToSequence = async (bookId: string) => {
    if (!user) {
      alert('请先登录');
      return;
    }
    try {
      const isFirstBook = learningSequence.length === 0;
      await addToLearningSequence(user.id, bookId, isFirstBook);
      await loadWordBooks();
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
    }
  };

  const handleRemoveFromSequence = async (bookId: string) => {
    if (!user) return;
    if (!confirm('确定要从学习序列中移除此单词书吗？')) return;
    try {
      await removeFromLearningSequence(user.id, bookId);
      await loadWordBooks();
      if (settings.primaryWordBookId === bookId) {
        await saveSettings({ ...settings, primaryWordBookId: null });
      }
    } catch (error) {
      console.error('Error removing from sequence:', error);
      alert('移除失败');
    }
  };

  const handleSetPrimary = async (bookId: string) => {
    if (!user) return;
    try {
      await setPrimaryWordBook(user.id, bookId);
      await saveSettings({ ...settings, primaryWordBookId: bookId });
      await loadWordBooks();
    } catch (error) {
      console.error('Error setting primary:', error);
      alert('设置主学单词书失败');
    }
  };

  const handleCreateBook = async () => {
    if (!user || !newBookName.trim()) return;
    try {
      await createWordBook(user.id, {
        name: newBookName.trim(),
        description: newBookDescription.trim() || undefined
      });
      setNewBookName('');
      setNewBookDescription('');
      setShowCreateModal(false);
      await loadWordBooks();
    } catch (error) {
      console.error('Error creating book:', error);
      alert('创建单词书失败');
    }
  };

  // 获取学习序列中的单词书 ID 集合
  const sequenceBookIds = new Set(learningSequence.map(item => item.word_book_id || item.wordBookId));

  // 过滤出未添加的系统单词书
  const availableSystemBooks = systemBooks.filter(book => !sequenceBookIds.has(book.id));

  // 合并学习序列中的单词书（系统 + 自定义）
  const sequenceBooks = learningSequence.map(item => {
    // Supabase 返回下划线命名，转换为驼峰
    const wordBook = item.word_book || item.wordBook;
    return {
      ...wordBook,
      sequenceId: item.id,
      isPrimary: item.is_primary || item.isPrimary
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

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
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
          >
            + 添加单词书
          </button>
        </div>
      </div>

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
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateBook}
                disabled={!newBookName.trim()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
