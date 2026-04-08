'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { calculateNextReview, getDueWords, shuffleWords, limitWords, postponeWithPriority, getTodayReviewQueue, postponeToTomorrow } from '../utils/spacedRepetition';
import { getIntervalText, getChineseDefinition, getExampleSentence, playAudio, hasAudio } from '../utils/wordUtils';
import { QUALITY_LABELS } from '../constants';
import type { Word } from '../types';

type ReviewMode = 'en-to-cn' | 'cn-to-en';

export function Review() {
  const { words, settings, updateWord, refreshWords } = useApp();
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<ReviewMode>('en-to-cn');
  const [isComplete, setIsComplete] = useState(false);
  const [postponedCount, setPostponedCount] = useState(0);

  const maxDailyReviews = settings.maxDailyReviews || 50;

  // Initialize review queue
  useEffect(() => {
    const dueWords = getDueWords(words);
    const shuffled = shuffleWords(dueWords);
    const limited = limitWords(shuffled, maxDailyReviews);
    setQueue(limited);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
    setPostponedCount(0);
  }, [words, maxDailyReviews]);

  const currentWord = queue[currentIndex];
  const progress = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;

  const handleShowAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleRate = useCallback(async (quality: number) => {
    if (!currentWord) return;

    const updatedWord = calculateNextReview(currentWord, quality);
    await updateWord(updatedWord);

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setIsComplete(true);
    }
  }, [currentWord, currentIndex, queue.length, updateWord]);

  const handlePostpone = useCallback(async () => {
    if (!currentWord) return;

    const updatedWord = postponeToTomorrow(currentWord);
    await updateWord(updatedWord);
    setPostponedCount(prev => prev + 1);

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setIsComplete(true);
    }
  }, [currentWord, currentIndex, queue.length, updateWord]);

  const handleRestart = useCallback(() => {
    const dueWords = getDueWords(words);
    const shuffled = shuffleWords(dueWords);
    const limited = limitWords(shuffled, maxDailyReviews);
    setQueue(limited);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsComplete(false);
    setPostponedCount(0);
  }, [words, maxDailyReviews]);

  if (queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            No words to review!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You&apos;ve completed all your reviews for today. Great job!
          </p>
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Review Anyway
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Review Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You reviewed {queue.length} words today.
          </p>
          {postponedCount > 0 && (
            <p className="text-orange-600 dark:text-orange-400 mb-6">
              {postponedCount} word{postponedCount > 1 ? 's' : ''} postponed to tomorrow
            </p>
          )}
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
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
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentIndex + 1} / {queue.length}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('en-to-cn')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            mode === 'en-to-cn'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          English → Chinese
        </button>
        <button
          onClick={() => setMode('cn-to-en')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            mode === 'cn-to-en'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Chinese → English
        </button>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 mb-6">
        {/* Question */}
        <div className="text-center mb-8">
          {mode === 'en-to-cn' ? (
            <>
              <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                {currentWord.word}
              </h2>
              {currentWord.phonetic && (
                <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">
                  {currentWord.phonetic}
                </p>
              )}
              {hasAudio(currentWord.phonetics) && (
                <button
                  onClick={() => playAudio(currentWord.phonetics)}
                  className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                >
                  🔊
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
                {chineseDef}
              </h2>
              {exampleSentence && (
                <p className="text-lg text-gray-600 dark:text-gray-400 italic">
                  &quot;{exampleSentence}&quot;
                </p>
              )}
            </>
          )}
        </div>

        {/* Answer */}
        {showAnswer && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6 animate-fade-in">
            {mode === 'en-to-cn' ? (
              <div className="text-center">
                <p className="text-2xl text-green-600 dark:text-green-400 mb-4">
                  {chineseDef}
                </p>
                {exampleSentence && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 italic">
                    &quot;{exampleSentence}&quot;
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                  {currentWord.word}
                </h3>
                {currentWord.phonetic && (
                  <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">
                    {currentWord.phonetic}
                  </p>
                )}
                {hasAudio(currentWord.phonetics) && (
                  <button
                    onClick={() => playAudio(currentWord.phonetics)}
                    className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                  >
                    🔊
                  </button>
                )}
              </div>
            )}

            {/* Word Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-600">{getIntervalText(currentWord.interval)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Interval</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">{currentWord.reviewCount}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Reviews</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">{currentWord.easeFactor.toFixed(2)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Ease</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!showAnswer ? (
        <div className="flex gap-3">
          <button
            onClick={handlePostpone}
            className="flex-1 px-6 py-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Postpone
          </button>
          <button
            onClick={handleShowAnswer}
            className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Show Answer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                How well did you remember?
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((quality) => (
              <button
                key={quality}
                onClick={() => handleRate(quality)}
                className={`py-3 rounded-xl font-medium transition-colors ${
                  quality <= 2
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/30'
                    : quality === 3
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/30'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/30'
                }`}
              >
                {quality}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
            <span>Complete blackout</span>
            <span>Perfect recall</span>
          </div>
        </div>
      )}
    </div>
  );
}
