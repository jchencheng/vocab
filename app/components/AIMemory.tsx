'use client';

import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateContent } from '../services/apiClient';
import { formatWithBionicReading, formatShortDate } from '../utils/formatters';
import type { Word, AIContext } from '../types';

export function AIMemory() {
  const { words, contexts, addContext, updateContext, deleteContext, isLoading } = useApp();
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingContext, setEditingContext] = useState<AIContext | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [showBionic, setShowBionic] = useState(false);

  const toggleWordSelection = useCallback((wordId: string) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  }, []);

  const selectedWordsList = useMemo(() => {
    return words.filter(w => selectedWords.has(w.id));
  }, [words, selectedWords]);

  const handleGenerate = useCallback(async () => {
    if (selectedWords.size === 0) return;

    setIsGenerating(true);
    try {
      const wordList = selectedWordsList.map(w => w.word);
      const prompt = `Create a short, engaging story (2-3 paragraphs) that naturally incorporates these vocabulary words: ${wordList.join(', ')}. 

Requirements:
- The story should be interesting and coherent
- Each vocabulary word should be used naturally in context
- Highlight each vocabulary word by wrapping it in **double asterisks** like **this**
- After each highlighted word, add its definition in parentheses like **word** (definition)
- Make the story memorable to help with vocabulary retention

Format your response as a JSON object with this structure:
{
  "story": "Your story here with **highlighted words** (definitions)"
}`;

      const content = await generateContent(prompt, wordList);
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setGeneratedContent(parsed.story || content);
      } else {
        setGeneratedContent(content);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setGeneratedContent('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedWords, selectedWordsList]);

  const handleSaveContext = useCallback(async () => {
    if (!generatedContent.trim()) return;

    const newContext: AIContext = {
      id: crypto.randomUUID(),
      content: generatedContent,
      wordIds: Array.from(selectedWords),
      createdAt: Date.now(),
    };

    await addContext(newContext);
    setGeneratedContent('');
    setSelectedWords(new Set());
    setActiveTab('history');
  }, [generatedContent, selectedWords, addContext]);

  const handleEditContext = useCallback((context: AIContext) => {
    setEditingContext(context);
    setEditContent(context.content);
  }, []);

  const handleUpdateContext = useCallback(async () => {
    if (!editingContext || !editContent.trim()) return;

    const updatedContext: AIContext = {
      ...editingContext,
      content: editContent,
    };

    await updateContext(updatedContext);
    setEditingContext(null);
    setEditContent('');
  }, [editingContext, editContent, updateContext]);

  const handleDeleteContext = useCallback(async (id: string) => {
    if (confirm('Are you sure you want to delete this story?')) {
      await deleteContext(id);
    }
  }, [deleteContext]);

  const renderContent = (content: string) => {
    if (!showBionic) {
      return content.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          const wordMatch = inner.match(/^([^（\(]+)([（\(].*)$/);
          if (wordMatch) {
            const [, word, def] = wordMatch;
            return (
              <span key={idx} className="inline-flex flex-wrap items-baseline gap-1">
                <span className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg font-semibold text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/30">
                  {word.trim()}
                </span>
                <span className="text-accent-600 dark:text-accent-400 text-sm">{def}</span>
              </span>
            );
          }
          return <span key={idx} className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg font-semibold text-amber-900 dark:text-amber-200">{inner}</span>;
        }
        return <span key={idx}>{part}</span>;
      });
    }

    const parts = formatWithBionicReading(content);
    return parts.map((part, idx) => {
      if (part.type === 'bionic') {
        return (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: part.content }}
            className="bionic-text"
          />
        );
      }
      return <span key={idx}>{part.content}</span>;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center mb-4">
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
            <span className="text-3xl">🤖</span>
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2">AI Memory Assistant</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">Create memorable stories to help you remember vocabulary</p>
      </div>

      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-4 text-center font-semibold transition-all relative ${
              activeTab === 'generate'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'generate' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500" />
            )}
            <span className="flex items-center justify-center gap-2">
              <span>✨</span>
              Generate Story
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 text-center font-semibold transition-all relative ${
              activeTab === 'history'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500" />
            )}
            <span className="flex items-center justify-center gap-2">
              <span>📚</span>
              History
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs">
                {contexts.length}
              </span>
            </span>
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'generate' ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📝</span>
                  Select Words
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({selectedWords.size} selected)
                  </span>
                </h3>
                {words.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600/50">
                    <div className="text-4xl mb-4">📖</div>
                    <p className="text-lg font-medium mb-2">No words available</p>
                    <p>Add some words first to create stories!</p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600/50">
                    <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto">
                      {words.map(word => (
                        <button
                          key={word.id}
                          onClick={() => toggleWordSelection(word.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            selectedWords.has(word.id)
                              ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-soft scale-105'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-soft'
                          }`}
                        >
                          {word.word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={selectedWords.size === 0 || isGenerating || words.length === 0}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>✨</span>
                    Generate Story
                  </span>
                )}
              </button>

              {generatedContent && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-600/50 animate-slide-up">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>📖</span>
                      Generated Story
                    </h3>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={showBionic}
                          onChange={(e) => setShowBionic(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                        />
                        Bionic Reading
                      </label>
                    </div>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
                    {renderContent(generatedContent)}
                  </div>
                  <button
                    onClick={handleSaveContext}
                    className="mt-6 w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    Save to History
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {contexts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 animate-float">📚</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No stories yet</h3>
                  <p className="text-slate-600 dark:text-slate-400">Create your first story to get started!</p>
                </div>
              ) : (
                contexts.map((context, idx) => (
                  <div key={context.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-600/50 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    {editingContext?.id === context.id ? (
                      <div className="space-y-4">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                          rows={6}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => setEditingContext(null)}
                            className="flex-1 px-5 py-2.5 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateContext}
                            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-soft active:scale-[0.98]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-600">
                          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <span>📅</span>
                              {formatShortDate(context.createdAt)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="flex items-center gap-1">
                              <span>📝</span>
                              {context.wordIds.length} words
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditContext(context)}
                              className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteContext(context.id)}
                              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                          {renderContent(context.content)}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
