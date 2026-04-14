'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { calculateNextReview, shuffleWordsWithSeed, limitWords, postponeToTomorrow, postponeWithPriority, getDueWords, getDueWordsByStudyMode } from '../utils/spacedRepetition';
import { getIntervalText, getExampleSentence, getChineseDefinition, playAudio, hasAudio } from '../utils/wordUtils';
import { fetchWordsForReview, WordForReview, fetchDailyProgress, saveDailyProgress, updateDailyProgress } from '../services/apiClient';
import { getReviewQueue, saveReviewQueue, updateReviewProgress } from '../services/reviewQueueCache';
import type { Word } from '../types';

type ReviewMode = 'en-to-cn' | 'cn-to-en';

const STUDY_MODE_LABELS: Record<string, string> = {
  'book-only': '只学当前书',
  'book-priority': '优先当前书',
  'mixed': '全部混合'
};

// 获取今天的日期字符串 YYYY-MM-DD
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function Review() {
  const { words, settings, updateWord, learningSequence } = useApp();
  const { user } = useAuth();
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<ReviewMode>('en-to-cn');
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [primaryBookWordIds, setPrimaryBookWordIds] = useState<Set<string>>(new Set());
  const [isPrimaryBookLoaded, setIsPrimaryBookLoaded] = useState(false);
  
  // 使用 ref 来跟踪是否已经初始化
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);

  const maxDailyReviews = settings.maxDailyReviews || 50;
  const studyMode = settings.studyMode || 'mixed';
  const primaryWordBookId = settings.primaryWordBookId;

  // 获取主学单词书中的单词ID
  useEffect(() => {
    if (!primaryWordBookId || studyMode === 'mixed') {
      setPrimaryBookWordIds(new Set());
      setIsPrimaryBookLoaded(true); // 不需要加载，直接标记为完成
      return;
    }

    const fetchPrimaryBookWords = async () => {
      try {
        const response = await fetch(`/api/wordbooks/${primaryWordBookId}/words?pageSize=10000`);
        if (response.ok) {
          const data = await response.json();
          // API 返回的是 data.words，每个单词的 id 字段就是 word_id
          const wordIds = new Set<string>(data.words?.map((word: any) => word.id as string) || []);
          setPrimaryBookWordIds(wordIds);
        }
      } catch (error) {
        console.error('Error fetching primary book words:', error);
      } finally {
        setIsPrimaryBookLoaded(true);
      }
    };

    fetchPrimaryBookWords();
  }, [primaryWordBookId, studyMode]);

  // 初始化复习队列（使用确定性随机 + 缓存）
  useEffect(() => {
    // 等待用户加载完成，且主单词书加载完成（如果需要的话）
    if (isInitializedRef.current || !user?.id || !isPrimaryBookLoaded) {
      return;
    }

    const initReviewQueue = async () => {
      console.log('Review initReviewQueue START');
      setIsLoading(true);
      isInitializedRef.current = true;

      try {
        const today = getTodayString();
        const seed = `${user.id}-${today}`; // 使用用户ID+日期作为种子
        
        // 1. 尝试从缓存获取复习队列（支持跨设备同步）
        const cachedQueue = await getReviewQueue(
          user.id,
          today,
          maxDailyReviews,
          studyMode,
          primaryWordBookId
        );
        
        if (cachedQueue) {
          console.log('Using cached review queue:', cachedQueue.queue.length, 'paramsChanged:', cachedQueue.paramsChanged);
          
          let finalQueue = cachedQueue.queue;
          let startIndex = Math.min(cachedQueue.currentIndex, cachedQueue.queue.length);
          
          // 如果参数变化（学习模式切换），根据新模式重新筛选/排序队列
          if (cachedQueue.paramsChanged && primaryBookWordIds.size > 0) {
            console.log('Reordering queue based on new study mode:', studyMode);
            
            // 分离已复习和未复习的单词
            const reviewedWords = finalQueue.slice(0, startIndex);
            const unreviewedWords = finalQueue.slice(startIndex);
            
            // 根据新的学习模式重新排序未复习的单词
            const reorderedUnreviewed = selectWordsByStudyMode(
              unreviewedWords,
              studyMode,
              primaryBookWordIds
            );
            
            // 合并：已复习的单词 + 重新排序的未复习单词
            finalQueue = [...reviewedWords, ...reorderedUnreviewed];
            
            // 保存新的队列到缓存
            await saveReviewQueue(finalQueue, startIndex, user.id, today, maxDailyReviews, studyMode, primaryWordBookId);
          }
          
          const isCompletedToday = startIndex >= finalQueue.length;
          
          if (isCompletedToday) {
            setQueue([]);
            setCurrentIndex(0);
            setIsComplete(true);
            console.log('Review already completed today (from cache)');
          } else {
            setQueue(finalQueue);
            setCurrentIndex(startIndex);
            setIsComplete(false);
          }
          
          setIsLoading(false);
          return;
        }
        
        // 2. 缓存未命中，生成新的复习队列
        console.log('No cache found, generating new review queue');
        
        // 获取今天的复习进度
        const progress = await fetchDailyProgress(user.id, today);
        const savedIndex = progress?.currentIndex || 0;
        console.log('Saved progress index:', savedIndex);

        // 获取待复习单词列表
        const reviewWords = await fetchWordsForReview(user.id, maxDailyReviews);
        console.log('Fetched review words:', reviewWords.length);

        // 转换为 Word 类型，并按 ID 排序确保顺序一致
        const convertedWords: Word[] = reviewWords
          .map((rw: WordForReview) => ({
            id: rw.id,
            word: rw.word,
            phonetic: rw.phonetic,
            phonetics: [],
            meanings: [{
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
          }))
          .sort((a, b) => a.id.localeCompare(b.id));

        // 根据学习模式筛选
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

        // 使用确定性随机打乱
        const shuffled = shuffleWordsWithSeed(filteredWords, seed);
        const limited = limitWords(shuffled, maxDailyReviews);

        // 推迟超出限制的单词（避免单词堆积）
        if (shuffled.length > maxDailyReviews) {
          const postponedWords = shuffled.slice(maxDailyReviews);
          console.log('Postponing', postponedWords.length, 'words beyond daily limit');
          
          const postponed = postponeWithPriority(postponedWords);
          for (const word of postponed) {
            await updateWord(word);
          }
        }

        // 恢复进度或从头开始
        const startIndex = Math.min(savedIndex, limited.length);
        const isCompletedToday = startIndex >= limited.length;
        
        if (isCompletedToday) {
          setQueue([]);
          setCurrentIndex(0);
          setIsComplete(true);
          console.log('Review already completed today');
        } else {
          setQueue(limited);
          setCurrentIndex(startIndex);
          setIsComplete(false);
        }
        
        // 保存到缓存（本地 + 服务端）
        await saveReviewQueue(
          limited,
          startIndex,
          user.id,
          today,
          maxDailyReviews,
          studyMode,
          primaryWordBookId
        );
        
        // 如果没有进度记录，创建一个
        if (!progress) {
          await saveDailyProgress({
            userId: user.id,
            reviewDate: today,
            currentIndex: 0,
            maxDailyReviews,
          });
        }
        
        console.log('Queue initialized - total:', limited.length, 'startIndex:', startIndex, 'completed:', isCompletedToday);
      } catch (error) {
        console.error('Error initializing review queue:', error);
        fallbackInitReviewQueue();
      } finally {
        setIsLoading(false);
      }
    };

    const fallbackInitReviewQueue = () => {
      console.log('Using fallback init method');
      const dueWords = words.filter(w => w.nextReviewAt <= Date.now());
      const seed = `${user?.id || 'guest'}-${getTodayString()}`;
      const shuffled = shuffleWordsWithSeed(dueWords, seed);
      const limited = limitWords(shuffled, maxDailyReviews);
      setQueue(limited);
      setIsLoading(false);
    };

    initReviewQueue();
  }, [user?.id, isPrimaryBookLoaded]);

  // 保存当前索引到数据库和缓存（使用 upsert 确保记录存在）
  const saveProgress = useCallback(async (newIndex: number) => {
    if (!user?.id || isSavingRef.current) return;
    
    isSavingRef.current = true;
    try {
      const today = getTodayString();
      
      // 保存到每日进度表
      await saveDailyProgress({
        userId: user.id,
        reviewDate: today,
        currentIndex: newIndex,
        maxDailyReviews,
      });
      
      // 更新缓存进度（支持跨设备同步）
      await updateReviewProgress(user.id, today, newIndex);
      
      console.log('Progress saved, index:', newIndex);
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [user?.id, maxDailyReviews]);

  const currentWord = queue[currentIndex];
  const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;
  const remainingCount = queue.length - currentIndex;

  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleRate = useCallback(async (quality: number) => {
    if (!currentWord || !user?.id) return;

    const updatedWord = calculateNextReview(currentWord, quality);
    const isLastWord = currentIndex >= queue.length - 1;
    
    // 计算新的索引：如果是最后一个单词，保存 queue.length 表示已完成
    const newIndex = isLastWord ? queue.length : currentIndex + 1;
    
    // 立即切换 UI
    if (isLastWord) {
      setIsComplete(true);
    } else {
      setCurrentIndex(newIndex);
      setShowAnswer(false);
    }
    
    // 异步保存进度和单词更新
    Promise.all([
      saveProgress(newIndex),
      updateWord(updatedWord),
    ]).catch(console.error);
  }, [currentWord, currentIndex, queue.length, saveProgress, updateWord]);

  const handlePostpone = useCallback(async () => {
    if (!currentWord || !user?.id) return;

    const updatedWord = postponeToTomorrow(currentWord);
    const isLastWord = currentIndex >= queue.length - 1;
    
    // 计算新的索引：如果是最后一个单词，保存 queue.length 表示已完成
    const newIndex = isLastWord ? queue.length : currentIndex + 1;

    // 立即切换 UI
    if (isLastWord) {
      setIsComplete(true);
    } else {
      setCurrentIndex(newIndex);
      setShowAnswer(false);
    }
    
    // 异步保存进度和单词更新
    Promise.all([
      saveProgress(newIndex),
      updateWord(updatedWord),
    ]).catch(console.error);
  }, [currentWord, currentIndex, queue.length, saveProgress, updateWord]);

  const handleDelete = useCallback(async () => {
    if (!currentWord || !user?.id) return;

    // 确认删除
    if (!confirm('确定要从复习队列中删除这个单词吗？')) {
      return;
    }

    const isLastWord = currentIndex >= queue.length - 1;
    
    // 计算新的索引：如果是最后一个单词，保存 queue.length 表示已完成
    const newIndex = isLastWord ? queue.length : currentIndex + 1;

    // 立即从队列中移除
    setQueue(prev => prev.filter((_, idx) => idx !== currentIndex));

    // 立即切换 UI
    if (isLastWord || queue.length <= 1) {
      setIsComplete(true);
    } else {
      // 不增加 currentIndex，因为当前单词被删除了，后面的单词会自动前移
      setShowAnswer(false);
    }
    
    // 异步保存进度（删除也算完成一个单词）
    saveProgress(newIndex).catch(console.error);
    
    // 异步删除单词
    try {
      const response = await fetch('/api/words/delete-from-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          wordId: currentWord.id,
        }),
      });

      if (!response.ok) {
        console.error('Failed to delete word from review');
      }
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }, [currentWord, currentIndex, queue.length, user?.id, saveProgress]);

  const handleRestart = useCallback(async () => {
    if (!user?.id) return;
    
    const today = getTodayString();
    const seed = `${user.id}-${today}`;
    
    // 获取待复习单词
    let dueWords: Word[];
    
    if (studyMode === 'mixed' || !primaryWordBookId || primaryBookWordIds.size === 0) {
      dueWords = getDueWords(words);
    } else {
      dueWords = getDueWordsByStudyMode(words, studyMode, primaryWordBookId, 
        Array.from(primaryBookWordIds).map(id => ({ word_id: id, word_book_id: primaryWordBookId }))
      );
    }
    
    const shuffled = shuffleWordsWithSeed(dueWords, seed);
    const limited = limitWords(shuffled, maxDailyReviews);
    const postponedWords = shuffled.slice(maxDailyReviews);
    
    // 推迟多余的单词
    if (postponedWords.length > 0) {
      const postponed = postponeWithPriority(postponedWords);
      for (const word of postponed) {
        await updateWord(word);
      }
    }
    
    // 重置进度
    await saveDailyProgress({
      userId: user.id,
      reviewDate: today,
      currentIndex: 0,
      maxDailyReviews,
    });
    
    setQueue(limited);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
    
    console.log('Review restarted - queue:', limited.length);
  }, [user?.id, words, maxDailyReviews, studyMode, primaryWordBookId, primaryBookWordIds, updateWord]);

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
            You reviewed {currentIndex} of {queue.length} words today.
          </p>
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
            {currentIndex + 1} / {queue.length} ({remainingCount} remaining)
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
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="px-4 py-5 border-2 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 rounded-2xl font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all shadow-soft"
            title="从复习队列删除"
          >
            🗑️
          </button>
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
          {/* 显示答案后也显示删除按钮 */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleDelete}
              className="w-full px-4 py-3 border-2 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 rounded-2xl font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all shadow-soft flex items-center justify-center gap-2"
            >
              <span>🗑️</span>
              <span>从复习队列删除</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
