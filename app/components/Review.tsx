'use client';

import { useApp } from '../context/AppContext';

export function Review() {
  const { words, getStats } = useApp();
  const stats = getStats();

  const dueWords = words.filter(w => w.nextReviewAt <= Date.now());

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Review Session
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.dueWords}
            </p>
            <p className="text-gray-600 dark:text-gray-400">Words Due</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.masteredWords}
            </p>
            <p className="text-gray-600 dark:text-gray-400">Mastered</p>
          </div>
        </div>

        {dueWords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No words due for review!
            </p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              Great job! Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You have {dueWords.length} words to review.
            </p>
            {/* Review functionality would go here */}
          </div>
        )}
      </div>
    </div>
  );
}
