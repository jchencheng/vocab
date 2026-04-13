'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { calculateNextReview, shuffleWords, limitWords, postponeToTomorrow, postponeWithPriority, getDueWords, getDueWordsByStudyMode } from '../utils/spacedRepetition';
import { getIntervalText, getExampleSentence, getChineseDefinition, playAudio, hasAudio } from '../utils/wordUtils';
import { fetchWordsForReview, WordForReview } from '../services/apiClient';
import { QUALITY_LABELS } from '../constants';
import type { Word } from '../types';

type ReviewMode = 'en-to-cn' | 'cn-to-en';

const STUDY_MODE_LABELS: Record<string, string> = {
  'book-only': '只学当前书',
  'book-priority': '优先当前书',
  'mixed': '全部混合'
};

export function Review() {
  const { words, settings, updateWord, refreshWords, learningSequence, wordBooks } = useApp();
  const { user } = useAuth();
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<ReviewMode>('en-to-cn');
  const [isComplete, setIsComplete] = useState(false);
  const [postponedCount, setPostponedCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [primaryBookWordIds, setPrimaryBookWordIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const maxDailyReviews = settings.maxDailyReviews || 50;
  const studyMode = settings.studyMode || 'mixed';
  const primaryWordBookId = settings.primaryWordBookId;

  // 获取主学单词书中的单词ID
  useEffect(() => {
    if (!primaryWordBookId || studyMode === 'mixed') {
      setPrimaryBookWordIds(new Set());
      return;
    }

    // 获取该单词书的所有单词ID
    const fetchPrimaryBookWords = async () => {
      try {
        const response = await fetch(`/api/wordbooks/${primaryWordBookId}/words?pageSize=10000`);
        if (response.ok) {
          const data = await response.json();
          const wordIds = new Set<string>(data.items?.map((item: any) => item.word_id as string) || []);
          setPrimaryBookWordIds(wordIds);
        }
      } catch (error) {
        console.error('Error fetching primary book words:', error);
      }
    };

    fetchPrimaryBookWords();
    // 只依赖 primaryWordBookId 和 studyMode，避免 wordBooks 变化导致循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryWordBookId, studyMode]);

  // 初始化复习队列（使用优化后的 API）
  // 只在组件挂载时执行一次
  useEffect(() => {
    if (isInitialized || !user?.id) {
      console.log('Review useEffect skipped - already initialized or no user');
      return;
    }

    const initReviewQueue = async () => {
      console.log('Review initReviewQueue START (optimized)');
      setIsLoading(true);

      try {
        // 使用优化后的 API 获取复习单词
        // 这个 API 使用单查询 JOIN，只返回轻量级数据
        const reviewWords = await fetchWordsForReview(user.id, maxDailyReviews * 2); // 获取双倍数量，用于筛选

        console.log('Fetched review words (optimized):', reviewWords.length);

        // 转换为 Word 类型（兼容现有代码）
        const convertedWords: Word[] = reviewWords.map((rw: WordForReview) => ({
          id: rw.id,
          word: rw.word,
          phonetic: rw.phonetic,
          phonetics: [], // 轻量级数据不包含 phonetics
          meanings: [{ // 构造一个最小化的 meaning 结构
            partOfSpeech: '',
            definitions: [{
              definition: '',
              chineseDefinition: rw.chineseDefinition,
              synonyms: [],
              antonyms: []
            }],
            synonyms: [],
            antonyms: []
          }],
          tags: [],
          interval: rw.interval,
          easeFactor: rw.easeFactor,
          reviewCount: rw.reviewCount,
          nextReviewAt: rw.nextReviewAt,
          quality: rw.quality,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));

        // 根据学习模式筛选（如果需要）
        let filteredWords = convertedWords;
        if (studyMode !== 'mixed' && primaryWordBookId && primaryBookWordIds.size > 0) {
          const primaryIds = primaryBookWordIds;
          if (studyMode === 'book-only') {
            filteredWords = convertedWords.filter(w => primaryIds.has(w.id));
          } else if (studyMode === 'book-priority') {
            const primary = convertedWords.filter(w => primaryIds.has(w.id));
            const other = convertedWords.filter(w => !primaryIds.has(w.id));
            filteredWords = [...primary, ...other];
          }
        }

        // 打乱顺序并限制数量
        const shuffled = shuffleWords(filteredWords);
        const limited = limitWords(shuffled, maxDailyReviews);

        // 获取需要推迟的单词（这些单词已经由 API 筛选过，都是到期的）
        const postponedWords = shuffled.slice(maxDailyReviews);

        setQueue(limited);
        setCurrentIndex(0);
        setShowAnswer(false);
        setIsComplete(false);
        setPostponedCount(postponedWords.length);
        setIsInitialized(true);
        console.log('Review initReviewQueue END - queue:', limited.length, 'postponed:', postponedWords.length);
      } catch (error) {
        console.error('Error initializing review queue:', error);
        // 出错时回退到旧方法
        fallbackInitReviewQueue();
      } finally {
        setIsLoading(false);
      }
    };

    // 备用方案：使用旧的 words 数据
    const fallbackInitReviewQueue = () => {
      console.log('Using fallback init method');
      const dueWords = words.filter(w => w.nextReviewAt <= Date.now());
      const shuffled = shuffleWords(dueWords);
      const limited = limitWords(shuffled, maxDailyReviews);
      setQueue(limited);
      setIsInitialized(true);
      setIsLoading(false);
    };

    initReviewQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, user?.id]); // 只在 isInitialized 或 user 变化时执行

  const currentWord = queue[currentIndex];
  // 进度从0%开始，完成所有单词后达到100%
  const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;

  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleRate = useCallback(async (quality: number) => {
    if (!currentWord) return;

    const updatedWord = calculateNextReview(currentWord, quality);
    
    // 立即切换到下一个单词，不等待 API 响应
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setIsComplete(true);
    }
    
    // 异步保存更新，不阻塞 UI
    updateWord(updatedWord).catch(console.error);
  }, [currentWord, currentIndex, queue.length, updateWord]);

  const handlePostpone = useCallback(async () => {
    if (!currentWord) return;

    const updatedWord = postponeToTomorrow(currentWord);
    setPostponedCount(prev => prev + 1);

    // 立即切换到下一个单词，不等待 API 响应
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setIsComplete(true);
    }
    
    // 异步保存更新，不阻塞 UI
    updateWord(updatedWord).catch(console.error);
  }, [currentWord, currentIndex, queue.length, updateWord]);

  const handleRestart = useCallback(async () => {
    // 重置初始化状态，强制重新加载队列
    setIsInitialized(false);
    
    // 根据学习模式获取待复习单词
    let dueWords: Word[];
    
    if (studyMode === 'mixed' || !primaryWordBookId || primaryBookWordIds.size === 0) {
      // 混合模式或没有主学单词书，使用所有单词
      dueWords = getDueWords(words);
    } else {
      // 根据学习模式筛选
      dueWords = getDueWordsByStudyMode(words, studyMode, primaryWordBookId, 
        Array.from(primaryBookWordIds).map(id => ({ word_id: id, word_book_id: primaryWordBookId }))
      );
    }
    
    // 打乱顺序并限制数量
    const shuffled = shuffleWords(dueWords);
    const limited = limitWords(shuffled, maxDailyReviews);
    
    // 获取需要推迟的单词
    const postponedWords = shuffled.slice(maxDailyReviews);
    
    // 如果有需要推迟的单词，自动推迟它们
    if (postponedWords.length > 0) {
      const postponed = postponeWithPriority(postponedWords);
      // 批量更新推迟的单词
      for (const word of postponed) {
        await updateWord(word);
      }
    }
    
    setQueue(limited);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
    setPostponedCount(postponedWords.length);
    setIsInitialized(true);
  }, [words, maxDailyReviews, updateWord, studyMode, primaryWordBookId, primaryBookWordIds]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-10">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600 mx-auto mb-6"></div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Loading review queue...
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Preparing your words for today
          </p>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-10">
          <div className="text-7xl mb-6 animate-float">🎉</div>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-4">
            No words to review!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-lg">
            You&apos;ve completed all your reviews for today. Great job!
          </p>
          {settings.studyMode && settings.studyMode !== 'mixed' && (
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
              当前学习模式: {STUDY_MODE_LABELS[settings.studyMode]}
              {settings.primaryWordBookId && learningSequence.find((s: any) => s.wordBook?.id === settings.primaryWordBookId)?.wordBook?.name && (
                <span> ({learningSequence.find((s: any) => s.wordBook?.id === settings.primaryWordBookId)?.wordBook?.name})</span>
              )}
            </p>
          )}
          <button
            onClick={handleRestart}
            className="px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
          >
            Review Anyway
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 animate-fade-in">
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-10">
          <div className="text-7xl mb-6 animate-float">✨</div>
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Review Complete!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2 text-lg">
            You reviewed {queue.length} words today.
          </p>
          {postponedCount > 0 && (
            <p className="text-amber-600 dark:text-amber-400 mb-8 text-lg font-medium">
              {postponedCount} word{postponedCount > 1 ? 's' : ''} postponed to tomorrow
            </p>
          )}
          <button
            onClick={handleRestart}
            className="px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
          >
            Continue Reviewing
          </button>
        </div>
      </div>
    );
  }

  const chineseDef = getChineseDefinition(currentWord);
  const exampleSentence = getExampleSentence(currentWord);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {currentIndex + 1} / {queue.length}
          </span>
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setMode('en-to-cn')}
          className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
            mode === 'en-to-cn'
              ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-soft'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          English → Chinese
        </button>
        <button
          onClick={() => setMode('cn-to-en')}
          className={`flex-1 py-3 rounded-2xl font-semibold transition-all ${
            mode === 'cn-to-en'
              ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-soft'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Chinese → English
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-10 mb-8">
        <div className="text-center mb-8">
          {mode === 'en-to-cn' ? (
            <>
              <h2 className="font-display text-5xl font-bold text-slate-900 dark:text-white mb-4">
                {currentWord.word}
              </h2>
              {currentWord.phonetic && (
                <p className="text-xl text-slate-500 dark:text-slate-400 mb-6 font-mono">
                  {currentWord.phonetic}
                </p>
              )}
              {hasAudio(currentWord.phonetics) && (
                <button
                  onClick={() => playAudio(currentWord.phonetics)}
                  className="p-4 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-colors shadow-soft"
                >
                  🔊
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display text-4xl font-bold text-accent-600 dark:text-accent-400 mb-6">
                {chineseDef}
              </h2>
              {exampleSentence && (
                <p className="text-lg text-slate-600 dark:text-slate-400 italic">
                  &quot;{exampleSentence}&quot;
                </p>
              )}
            </>
          )}
        </div>

        {showAnswer && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-8 animate-fade-in">
            {mode === 'en-to-cn' ? (
              <div className="text-center">
                <p className="text-3xl text-accent-600 dark:text-accent-400 mb-6 font-medium">
                  {chineseDef}
                </p>
                {exampleSentence && (
                  <p className="text-lg text-slate-600 dark:text-slate-400 italic">
                    &quot;{exampleSentence}&quot;
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h3 className="font-display text-5xl font-bold text-slate-900 dark:text-white mb-4">
                  {currentWord.word}
                </h3>
                {currentWord.phonetic && (
                  <p className="text-xl text-slate-500 dark:text-slate-400 mb-6 font-mono">
                    {currentWord.phonetic}
                  </p>
                )}
                {hasAudio(currentWord.phonetics) && (
                  <button
                    onClick={() => playAudio(currentWord.phonetics)}
                    className="p-4 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-colors shadow-soft"
                  >
                    🔊
                  </button>
                )}
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {getIntervalText(currentWord.interval)}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Interval</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="text-2xl font-bold text-accent-600 dark:text-accent-400 mb-1">
                    {currentWord.reviewCount}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Reviews</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mb-1">
                    {(currentWord.easeFactor || 2.5).toFixed(2)}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Ease</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!showAnswer ? (
        <div className="flex gap-4">
          <button
            onClick={handlePostpone}
            className="flex-1 px-6 py-5 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-soft"
          >
            Postpone
          </button>
          <button
            onClick={handleShowAnswer}
            className="flex-[2] px-6 py-5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
          >
            Show Answer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
            How well did you remember?
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((quality) => (
              <button
                key={quality}
                onClick={() => handleRate(quality)}
                className={`py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 ${
                  quality <= 2
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-800/30 border border-rose-200 dark:border-rose-800/30'
                    : quality === 3
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/30 border border-amber-200 dark:border-amber-800/30'
                    : 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 hover:bg-accent-200 dark:hover:bg-accent-800/30 border border-accent-200 dark:border-accent-800/30'
                }`}
              >
                {quality}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
            <span className="font-medium">Complete blackout</span>
            <span className="font-medium">Perfect recall</span>
          </div>
        </div>
      )}
    </div>
  );
}
