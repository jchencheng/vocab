'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { WordDetailModal } from './WordDetailModal';
import { Pagination } from './Pagination';
import { calculateStats, filterWords, getAllTags, getIntervalText, getChineseDefinition } from '../utils/wordUtils';
import { fetchDueTodayCount } from '../services/apiClient';
import type { Word } from '../types';

const ITEMS_PER_PAGE = 10;

export function WordList() {
  const { words, isLoading, deleteWord } = useApp();
  const { user } = useAuth();
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dueTodayCount, setDueTodayCount] = useState<number>(0);

  // 从服务器获取准确的 Due Today 数量（受 maxDailyReviews 限制）
  useEffect(() => {
    if (!user?.id) return;
    
    const loadDueTodayCount = async () => {
      try {
        // 从 settings 中获取 maxDailyReviews，默认为 50
        const maxDailyReviews = 50; // 可以从全局设置获取
        const count = await fetchDueTodayCount(user.id, maxDailyReviews);
        setDueTodayCount(count);
      } catch (error) {
        console.error('Error loading due today count:', error);
      }
    };
    
    loadDueTodayCount();
  }, [user?.id, words]); // 当用户或单词列表变化时重新获取

  const stats = useMemo(() => {
    const baseStats = calculateStats(words);
    // 使用服务器返回的准确 Due Today 数量
    return {
      ...baseStats,
      dueToday: dueTodayCount,
    };
  }, [words, dueTodayCount]);
  const allTags = useMemo(() => getAllTags(words), [words]);
  const filteredWords = useMemo(
    () => filterWords(words, searchQuery, selectedTag),
    [words, searchQuery, selectedTag]
  );

  // 分页逻辑
  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const paginatedWords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredWords, currentPage]);

  // 当搜索或标签改变时，重置到第一页
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTagChange = (value: string | null) => {
    setSelectedTag(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  const statItems = [
    { value: stats.total, label: 'Total Words', color: 'primary' },
    { value: stats.dueToday, label: 'Due Today', color: 'amber' },
    { value: stats.mastered, label: 'Mastered', color: 'accent' },
    { value: stats.learning, label: 'Learning', color: 'rose' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((stat, idx) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-soft hover:shadow-medium transition-all animate-slide-up"
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <div className={`text-3xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400 mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 mb-8 border border-slate-200/50 dark:border-slate-700/50 shadow-soft">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="w-full md:w-auto">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🏷️</span>
              <select
                value={selectedTag || ''}
                onChange={(e) => handleTagChange(e.target.value || null)}
                className="w-full md:w-48 pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</span>
            </div>
          </div>
        </div>
      </div>

      {filteredWords.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-soft">
          <div className="text-6xl mb-4 animate-float">📚</div>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-2 font-medium">
            {words.length === 0 ? 'No words yet' : 'No words match your search'}
          </p>
          <p className="text-slate-500 dark:text-slate-500">
            {words.length === 0 ? 'Start building your vocabulary!' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-soft">
          <div className="space-y-4">
            {paginatedWords.map((word) => (
              <div
                key={word.id}
                onClick={() => setSelectedWord(word)}
                className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-medium hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {word.word}
                      </h3>
                      {word.phonetic && (
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-mono">
                          {word.phonetic}
                        </span>
                      )}
                      {word.sourceType === 'dictionary' && (
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">
                          词典
                        </span>
                      )}
                    </div>

                    <p className="text-accent-600 dark:text-accent-400 text-base mb-2 line-clamp-2">
                      {getChineseDefinition(word)}
                    </p>

                    {word.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {word.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium border border-primary-100 dark:border-primary-800/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-6 flex flex-col gap-1">
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {getIntervalText(word.interval)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">
                      {word.reviewCount} reviews
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredWords.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
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
