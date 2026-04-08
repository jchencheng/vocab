'use client';

import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { WordDetailModal } from './WordDetailModal';
import { calculateStats, filterWords, getAllTags, getIntervalText, getChineseDefinition } from '../utils/wordUtils';
import type { Word } from '../types';

export function WordList() {
  const { words, isLoading, deleteWord } = useApp();
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const stats = useMemo(() => calculateStats(words), [words]);
  const allTags = useMemo(() => getAllTags(words), [words]);
  const filteredWords = useMemo(
    () => filterWords(words, searchQuery, selectedTag),
    [words, searchQuery, selectedTag]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Words</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Due Today</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.mastered}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Mastered</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.learning}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Learning</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Word List */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
            {words.length === 0 ? 'No words yet. Start building your vocabulary!' : 'No words match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredWords.map((word) => (
            <div
              key={word.id}
              onClick={() => setSelectedWord(word)}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{word.word}</h3>
                    {word.phonetic && (
                      <span className="text-gray-500 dark:text-gray-400">{word.phonetic}</span>
                    )}
                  </div>
                  
                  {/* Chinese Definition */}
                  <p className="text-green-600 dark:text-green-400 mb-2 line-clamp-2">
                    {getChineseDefinition(word)}
                  </p>

                  {/* Tags */}
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
                <div className="text-right ml-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getIntervalText(word.interval)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {word.reviewCount} reviews
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onDelete={deleteWord}
        />
      )}
    </div>
  );
}
