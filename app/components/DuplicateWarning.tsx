'use client';

import type { Word } from '../types';

interface DuplicateWarningProps {
  word?: Word;
  onViewDetail?: () => void;
  onCancel: () => void;
  onForceAdd: () => void;
}

export function DuplicateWarning({
  word,
  onViewDetail,
  onCancel,
  onForceAdd,
}: DuplicateWarningProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  const getProgressText = () => {
    if (!word) return '';
    if (word.quality >= 4) return '已掌握';
    if (word.quality >= 2) return '学习中';
    return '刚开始';
  };

  if (!word) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
            该单词已在你的词库中
          </h3>
          
          <div className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            <p><span className="font-medium">单词:</span> {word.word}</p>
            <p><span className="font-medium">添加时间:</span> {formatDate(word.createdAt)}</p>
            <p><span className="font-medium">学习进度:</span> {getProgressText()}</p>
          </div>
          
          <div className="flex gap-2">
            {onViewDetail && (
              <button
                onClick={onViewDetail}
                className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
              >
                查看详情
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={onForceAdd}
              className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
            >
              强制添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
