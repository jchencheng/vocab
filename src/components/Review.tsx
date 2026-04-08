import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateNextReview, getTodayReviewQueue, postponeWithPriority, getChineseDefinition, getExampleSentence, playAudio, hasAudio } from '../utils';
import { DEFAULT_MAX_DAILY_REVIEWS } from '../constants';
import type { ReviewMode } from '../types';

export function Review() {
  const { words, updateWord, settings } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('en2zh');
  const [isComplete, setIsComplete] = useState(false);
  const [isPostponing, setIsPostponing] = useState(false);

  const maxDailyReviews = settings.maxDailyReviews || DEFAULT_MAX_DAILY_REVIEWS;

  // 获取今日复习队列和需要推迟的单词
  const { todayQueue, postponedWords } = useMemo(() => {
    return getTodayReviewQueue(words, maxDailyReviews);
  }, [words, maxDailyReviews]);

  // 当今日队列变化时，重置当前索引
  useEffect(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
  }, [todayQueue.length]);

  // 组件加载时，自动推迟超出限制的单词（使用优先级分散策略）
  useEffect(() => {
    async function postponeExtraWords() {
      if (postponedWords.length > 0 && !isPostponing) {
        setIsPostponing(true);
        // 将超出限制的单词按优先级分散推迟
        const postponedWithTime = postponeWithPriority(postponedWords);
        for (const word of postponedWithTime) {
          await updateWord(word);
        }
        setIsPostponing(false);
      }
    }
    postponeExtraWords();
  }, [postponedWords, updateWord, isPostponing]);

  const currentWord = todayQueue[currentIndex];

  const handlePlayAudio = useCallback(() => {
    if (currentWord) {
      playAudio(currentWord.phonetics);
    }
  }, [currentWord]);

  const handleQuality = useCallback(async (quality: number) => {
    if (!currentWord) return;

    const updatedWord = calculateNextReview(currentWord, quality);
    await updateWord(updatedWord);

    if (currentIndex + 1 >= todayQueue.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  }, [currentWord, currentIndex, todayQueue.length, updateWord]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
  }, []);

  if (todayQueue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Great Job!</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            You have no words to review right now.
          </p>
          {postponedWords.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {postponedWords.length} words scheduled for future days
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="text-center py-16">
          <div className="text-8xl mb-6">✅</div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Review Complete!</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            You reviewed {todayQueue.length} words!
          </p>
          {postponedWords.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
              {postponedWords.length} words scheduled for future days
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Review Again
          </button>
        </div>
      </div>
    );
  }

  // 如果 currentWord 不存在，可能是正在推迟单词或数据加载中
  if (!currentWord) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🔄</div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Loading...</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            {isPostponing ? 'Scheduling words for future days...' : 'Preparing your review session'}
          </p>
        </div>
      </div>
    );
  }

  // 获取例句
  const exampleSentence = getExampleSentence(currentWord);

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6 animate-fade-in">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">Review</h2>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
          {currentIndex + 1} of {todayQueue.length}
          {postponedWords.length > 0 && (
            <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-500 sm:ml-2">
              (+{postponedWords.length} scheduled)
            </span>
          )}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mt-4">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / todayQueue.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-2 mb-6 sm:mb-8">
        <button
          onClick={() => setReviewMode('en2zh')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reviewMode === 'en2zh'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          English → Chinese
        </button>
        <button
          onClick={() => setReviewMode('zh2en')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            reviewMode === 'zh2en'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Chinese → English
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-8 mb-4 sm:mb-6">
        <div className="text-center">
          <div className="mb-4">
            {reviewMode === 'en2zh' ? (
              <div>
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                  <h3 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-white">{currentWord.word}</h3>
                  {hasAudio(currentWord.phonetics) && (
                    <button
                      onClick={handlePlayAudio}
                      className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                    >
                      🔊
                    </button>
                  )}
                </div>
                {currentWord.phonetic && (
                  <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400">{currentWord.phonetic}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-lg sm:text-2xl text-gray-800 dark:text-white">{getChineseDefinition(currentWord)}</p>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-base sm:text-lg"
            >
              Show Answer
            </button>
          ) : (
            <div className="animate-slide-up">
              <div className="mb-6">
                {reviewMode === 'en2zh' ? (
                  <div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Meaning</h4>
                    <p className="text-lg sm:text-xl text-gray-800 dark:text-white">{getChineseDefinition(currentWord)}</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-white">{currentWord.word}</h3>
                      {hasAudio(currentWord.phonetics) && (
                        <button
                          onClick={handlePlayAudio}
                          className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                    {currentWord.phonetic && (
                      <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400">{currentWord.phonetic}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 显示例句 */}
              {exampleSentence && (
                <div className="mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Example</h4>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 italic">"{exampleSentence}"</p>
                </div>
              )}

              <div className="mb-4 sm:mb-6">
                <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">How well did you remember?</h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuality(q)}
                      className={`py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all ${
                        q < 3
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/30'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/30'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 gap-1">
                  <span>Complete blackout</span>
                  <span>Perfect recall</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
