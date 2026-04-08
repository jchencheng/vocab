import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../services';
import { formatDate } from '../utils';
import type { AIContext } from '../types';

export function AIMemory() {
  const { words } = useApp();
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [contexts, setContexts] = useState<AIContext[]>([]);
  const [showContexts, setShowContexts] = useState(false);
  const [editingContext, setEditingContext] = useState<AIContext | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewingContext, setViewingContext] = useState<AIContext | null>(null);

  const loadContexts = useCallback(async () => {
    const allContexts = await db.getAllContexts();
    setContexts(allContexts.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const generateContext = useCallback(async () => {
    if (selectedWordIds.length === 0) {
      setError('Please select at least one word');
      return;
    }

    setIsGenerating(true);
    setError('');

    const selectedWords = words.filter(w => selectedWordIds.includes(w.id));
    const wordList = selectedWords.map(w => w.word).join(', ');

    try {
      const prompt = `将我提供的单词列表生成一篇雅思阅读难度的文章，目的是帮我记忆所提供的单词，确保不遗漏。高亮Word  List里的单词并在该单词后标注中文释义，逐段提供中英对照。如果融入一篇文章有难度，可拆分为不同的主题，但每个单词都需要出现，以下是单词列表：${wordList}`;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, wordList }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const newContext: AIContext = {
        id: crypto.randomUUID(),
        wordIds: selectedWordIds,
        content: data.content,
        createdAt: Date.now(),
      };

      await db.addContext(newContext);
      await loadContexts();
      setShowContexts(true);
      setSelectedWordIds([]);
    } catch (err: any) {
      console.error('Error generating context:', err);
      setError(`Failed to generate context: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedWordIds, words, loadContexts]);

  const toggleWord = useCallback((wordId: string) => {
    setSelectedWordIds(prev =>
      prev.includes(wordId)
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  }, []);

  const handleDeleteContext = useCallback(async (contextId: string) => {
    await db.deleteContext(contextId);
    await loadContexts();
  }, [loadContexts]);

  const handleEdit = useCallback((context: AIContext) => {
    setEditingContext(context);
    setEditContent(context.content);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingContext) return;

    const updatedContext: AIContext = {
      ...editingContext,
      content: editContent,
    };

    await db.updateContext(updatedContext);
    await loadContexts();
    setEditingContext(null);
    setEditContent('');
  }, [editingContext, editContent, loadContexts]);

  const handleCancelEdit = useCallback(() => {
    setEditingContext(null);
    setEditContent('');
  }, []);

  const handleView = useCallback((context: AIContext) => {
    setViewingContext(context);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewingContext(null);
  }, []);

  const formatContent = useMemo(() => {
    return (content: string) => {
      return content
        .split('\n')
        .filter(line => line.trim() !== '')
        .map((paragraph, paraIdx) => {
          const isTranslationPair = paragraph.includes('英文：') || paragraph.includes('中文：');

          if (isTranslationPair) {
            const parts = paragraph.split(/(英文：|中文：)/g);
            return (
              <div key={paraIdx} className="mb-4">
                {parts.map((part, partIdx) => {
                  if (part === '英文：') {
                    return <span key={partIdx} className="font-semibold text-blue-600 dark:text-blue-400">英文：</span>;
                  } else if (part === '中文：') {
                    return <span key={partIdx} className="font-semibold text-green-600 dark:text-green-400">中文：</span>;
                  } else {
                    return part.split(/(\*\*[^*]+\*\*)/g).map((subPart, subIdx) => {
                      if (subPart.startsWith('**') && subPart.endsWith('**')) {
                        const innerContent = subPart.slice(2, -2);
                        const [word, definition] = innerContent.split('（');
                        return (
                          <span key={subIdx} className="inline-block">
                            <span className="bg-yellow-200 px-1 font-semibold text-gray-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                              {word}
                            </span>
                            {definition && (
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                （{definition}
                              </span>
                            )}
                          </span>
                        );
                      }
                      return subPart;
                    });
                  }
                })}
              </div>
            );
          } else {
            return (
              <div key={paraIdx} className="mb-4 leading-relaxed">
                {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    const innerContent = part.slice(2, -2);
                    const [word, definition] = innerContent.split('（');
                    return (
                      <span key={partIdx} className="inline-block">
                        <span className="bg-yellow-200 px-1 font-semibold text-gray-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                          {word}
                        </span>
                        {definition && (
                          <span className="text-green-600 dark:text-green-400 ml-1">
                            （{definition}
                          </span>
                        )}
                      </span>
                    );
                  }
                  return part;
                })}
              </div>
            );
          }
        });
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">AI Memory Assistant</h2>
        <p className="text-gray-600 dark:text-gray-400">Select words to generate context-rich stories</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Select Words ({selectedWordIds.length} selected)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
          {words.map((word) => (
            <button
              key={word.id}
              onClick={() => toggleWord(word.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedWordIds.includes(word.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-gray-800 dark:text-white">{word.word}</div>
              {word.phonetic && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{word.phonetic}</div>
              )}
            </button>
          ))}
        </div>
        {words.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No words in your vocabulary yet. Add some words first!
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <button
          onClick={generateContext}
          disabled={isGenerating || selectedWordIds.length === 0}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isGenerating ? 'Generating...' : 'Generate Story'}
        </button>
        <button
          onClick={loadContexts}
          className="ml-3 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          View History
        </button>
      </div>

      {showContexts && (
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Generated Stories</h3>
            <button
              onClick={() => setShowContexts(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          {contexts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No stories generated yet.
            </div>
          ) : (
            <div className="space-y-4">
              {contexts.map((context) => (
                <div key={context.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(context.createdAt)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(context)}
                        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(context)}
                        className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/30 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContext(context.id)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                    {formatContent(context.content)}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {context.wordIds.map((wordId) => {
                      const word = words.find(w => w.id === wordId);
                      return word ? (
                        <span
                          key={wordId}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full"
                        >
                          {word.word}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {viewingContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">View Story</h3>
                <button
                  onClick={handleCloseView}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {formatDate(viewingContext.createdAt)}
              </div>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {formatContent(viewingContext.content)}
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {viewingContext.wordIds.map((wordId) => {
                  const word = words.find(w => w.id === wordId);
                  return word ? (
                    <span
                      key={wordId}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full"
                    >
                      {word.word}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Edit Story</h3>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {formatDate(editingContext.createdAt)}
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="mt-4 flex gap-2 flex-wrap">
                {editingContext.wordIds.map((wordId) => {
                  const word = words.find(w => w.id === wordId);
                  return word ? (
                    <span
                      key={wordId}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full"
                    >
                      {word.word}
                    </span>
                  ) : null;
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
