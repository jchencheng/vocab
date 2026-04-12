'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { fetchWordBookDetail, fetchWordBookWords } from '../../services/wordbookAPI';
import type { WordBook, Word } from '../../types';

const WORDS_PER_PAGE = 20;

export default function WordBookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookId = params.id as string;

  const [book, setBook] = useState<WordBook | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBookDetail = useCallback(async () => {
    if (!user || !bookId) return;
    try {
      setIsLoading(true);
      const data = await fetchWordBookDetail(bookId, user.id);
      setBook(data);
    } catch (err) {
      console.error('Error loading book detail:', err);
      setError('加载单词书详情失败');
    }
  }, [user, bookId]);

  const loadWords = useCallback(async () => {
    if (!user || !bookId) return;
    try {
      const data = await fetchWordBookWords(bookId, user.id, currentPage, WORDS_PER_PAGE);
      setWords(data.words);
      setTotalPages(Math.ceil(data.total / WORDS_PER_PAGE));
    } catch (err) {
      console.error('Error loading words:', err);
      setError('加载单词列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [user, bookId, currentPage]);

  useEffect(() => {
    loadBookDetail();
  }, [loadBookDetail]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error || '单词书不存在'}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700"
          >
            ← 返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 flex items-center gap-1"
          >
            ← 返回单词书列表
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{book.name}</h1>
          {book.description && (
            <p className="text-slate-500 dark:text-slate-400 mt-2">{book.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
            <span>共 {book.wordCount || 0} 个单词</span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
              {book.sourceType === 'system' ? '系统单词书' : '自定义'}
            </span>
          </div>
        </div>

        {/* 单词列表 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {words.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              暂无单词
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {words.map((word, index) => (
                  <div
                    key={word.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-sm text-slate-400 w-8">
                        {(currentPage - 1) * WORDS_PER_PAGE + index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {word.word}
                          </h3>
                          {word.phonetic && (
                            <span className="text-slate-500 dark:text-slate-400 text-sm">
                              {word.phonetic}
                            </span>
                          )}
                        </div>
                        {word.meanings && word.meanings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {word.meanings.slice(0, 2).map((meaning, mIndex) => (
                              <div key={mIndex} className="text-sm">
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {meaning.partOfSpeech}
                                </span>
                                {meaning.definitions.slice(0, 2).map((def, dIndex) => (
                                  <span key={dIndex} className="text-slate-600 dark:text-slate-300 ml-2">
                                    {def.definition}
                                    {def.chineseDefinition && (
                                      <span className="text-slate-400 dark:text-slate-500 ml-1">
                                        ({def.chineseDefinition})
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                    >
                      上一页
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                    >
                      下一页
                    </button>
                  </div>
                  
                  <div className="text-center mt-2 text-sm text-slate-400">
                    第 {currentPage} / {totalPages} 页
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
