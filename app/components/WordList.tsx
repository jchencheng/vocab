'use client';

import { useApp } from '../context/AppContext';

export function WordList() {
  const { words, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          My Vocabulary ({words.length} words)
        </h2>
      </div>

      {words.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
            No words yet. Start building your vocabulary!
          </p>
          <p className="text-gray-400 dark:text-gray-500">
            Click "Add" to add your first word.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {words.map((word) => (
            <div
              key={word.id}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {word.word}
                  </h3>
                  {word.phonetic && (
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      {word.phonetic}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {word.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Reviews: {word.reviewCount}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Interval: {word.interval} days
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
