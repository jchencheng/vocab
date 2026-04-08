'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Word } from '../types';

export function AddWord() {
  const { addWord } = useApp();
  const [word, setWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setIsSubmitting(true);
    try {
      const newWord: Word = {
        id: crypto.randomUUID(),
        word: word.trim(),
        phonetics: [],
        meanings: [],
        tags: [],
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        nextReviewAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        quality: 0,
      };

      await addWord(newWord);
      setSuccess(true);
      setWord('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error adding word:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Add New Word
        </h2>

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400">
            Word added successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Word
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Enter a word..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !word.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? 'Adding...' : 'Add Word'}
          </button>
        </form>
      </div>
    </div>
  );
}
