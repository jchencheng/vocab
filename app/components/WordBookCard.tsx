'use client';

import type { WordBook, WordBookStats } from '../types';

interface WordBookCardProps {
  book: WordBook;
  stats?: WordBookStats;
  inSequence?: boolean;
  isPrimary?: boolean;
  onAddToSequence?: () => void;
  onRemoveFromSequence?: () => void;
  onSetPrimary?: () => void;
  onViewDetail?: () => void;
}

export function WordBookCard({
  book,
  stats,
  inSequence,
  isPrimary,
  onAddToSequence,
  onRemoveFromSequence,
  onSetPrimary,
  onViewDetail
}: WordBookCardProps) {
  const isSystem = book.sourceType === 'system';
  const progress = stats?.progress || 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isSystem ? '📘' : '📗'}</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{book.name}</h3>
            {book.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{book.description}</p>
            )}
          </div>
        </div>
        {isPrimary && (
          <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
            主学中
          </span>
        )}
      </div>

      {stats && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-600 dark:text-slate-400">学习进度</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>学习中 {stats.learning}</span>
            <span>已掌握 {stats.mastered}</span>
            {stats.ignored > 0 && <span>已忽略 {stats.ignored}</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!inSequence ? (
          <button
            onClick={onAddToSequence}
            className="flex-1 px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            添加到学习
          </button>
        ) : (
          <>
            {!isPrimary && (
              <button
                onClick={onSetPrimary}
                className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                设为主学
              </button>
            )}
            <button
              onClick={onViewDetail}
              className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              查看详情
            </button>
            <button
              onClick={onRemoveFromSequence}
              className="px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
            >
              移除
            </button>
          </>
        )}
      </div>
    </div>
  );
}
