import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { WordDetailModal } from './WordDetailModal';
import { getIntervalText, filterWords, getAllTags } from '../utils';
import type { Word } from '../types';

export function WordList() {
  const { words, deleteWord, getStats } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const stats = getStats();
  const allTags = useMemo(() => getAllTags(words), [words]);
  const filteredWords = useMemo(
    () => filterWords(words, searchQuery, selectedTag),
    [words, searchQuery, selectedTag]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">My Vocabulary</h2>
        <p className="text-gray-600 dark:text-gray-400">{stats.total} words in total</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Words</div>
        </div>
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Due Today</div>
        </div>
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.learning}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Learning</div>
        </div>
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{stats.mastered}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Mastered</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search words..."
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedTag === null
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/30'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {searchQuery || selectedTag ? 'No words found' : 'No words yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || selectedTag
                ? 'Try a different search or tag'
                : 'Start by adding some words to your vocabulary'}
            </p>
          </div>
        ) : (
          filteredWords.map((word) => (
            <div
              key={word.id}
              className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedWord(word)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{word.word}</h3>
                    {word.phonetic && (
                      <span className="text-gray-500 dark:text-gray-400">{word.phonetic}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {word.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {word.meanings[0]?.definitions[0]?.definition}
                    {word.meanings[0]?.definitions[0]?.chineseDefinition && (
                      <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                        {word.meanings[0]?.definitions[0]?.chineseDefinition}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-gray-800 dark:text-white">
                    {getIntervalText(word.interval)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {word.reviewCount} reviews
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
