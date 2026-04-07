import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { calculateNextReview, getDueWords, shuffleWords, limitWords, getChineseDefinition, playAudio, hasAudio } from '../utils';
import { DEFAULT_MAX_DAILY_REVIEWS } from '../constants';
import type { ReviewMode } from '../types';

export function Review() {
  const { words, updateWord, settings } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('en2zh');
  const [isComplete, setIsComplete] = useState(false);

  const reviewQueue = useMemo(() => {
    const due = getDueWords(words);
    const shuffled = shuffleWords(due);
    const maxDailyReviews = settings.maxDailyReviews || DEFAULT_MAX_DAILY_REVIEWS;
    return limitWords(shuffled, maxDailyReviews);
  }, [words, settings.maxDailyReviews]);

  const currentWord = reviewQueue[currentIndex];

  const handlePlayAudio = useCallback(() => {
    if (currentWord) {
      playAudio(currentWord.phonetics);
    }
  }, [currentWord]);

  const handleQuality = useCallback(async (quality: number) => {
    if (!currentWord) return;

    const updatedWord = calculateNextReview(currentWord, quality);
    await updateWord(updatedWord);

    if (currentIndex + 1 >= reviewQueue.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  }, [currentWord, currentIndex, reviewQueue.length, updateWord]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
  }, []);

  if (reviewQueue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Great Job!</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            You have no words to review right now.
          </p>
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
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            You reviewed {reviewQueue.length} words!
          </p>
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

  if (!currentWord) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🔄</div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Loading...</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Preparing your review session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Review</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {currentIndex + 1} of {reviewQueue.length}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mt-4">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        <button
          onClick={() => setReviewMode('en2zh')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            reviewMode === 'en2zh'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          English → Chinese
        </button>
        <button
          onClick={() => setReviewMode('zh2en')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            reviewMode === 'zh2en'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Chinese → English
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-8 mb-6">
        <div className="text-center">
          <div className="mb-4">
            {reviewMode === 'en2zh' ? (
              <div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h3 className="text-4xl font-bold text-gray-800 dark:text-white">{currentWord.word}</h3>
                  {hasAudio(currentWord.phonetics) && (
                    <button
                      onClick={handlePlayAudio}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                    >
                      🔊
                    </button>
                  )}
                </div>
                {currentWord.phonetic && (
                  <p className="text-xl text-gray-600 dark:text-gray-400">{currentWord.phonetic}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-2xl text-gray-800 dark:text-white">{getChineseDefinition(currentWord)}</p>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-lg"
            >
              Show Answer
            </button>
          ) : (
            <div className="animate-slide-up">
              <div className="mb-6">
                {reviewMode === 'en2zh' ? (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Meaning</h4>
                    <p className="text-xl text-gray-800 dark:text-white">{getChineseDefinition(currentWord)}</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <h3 className="text-4xl font-bold text-gray-800 dark:text-white">{currentWord.word}</h3>
                      {hasAudio(currentWord.phonetics) && (
                        <button
                          onClick={handlePlayAudio}
                          className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                        >
                          🔊
                        </button>
                      )}
                    </div>
                    {currentWord.phonetic && (
                      <p className="text-xl text-gray-600 dark:text-gray-400">{currentWord.phonetic}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">How well did you remember?</h4>
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuality(q)}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        q < 3
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/30'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/30'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
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
