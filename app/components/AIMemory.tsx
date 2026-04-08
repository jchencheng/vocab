'use client';

import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateContent } from '../services/apiClient';
import { formatWithBionicReading, formatShortDate } from '../utils/formatters';
import type { Word, AIContext } from '../types';

interface AIMemoryProps {
  onClose: () => void;
}

export function AIMemory({ onClose }: AIMemoryProps) {
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
      
      // Try to extract JSON from response
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
      // Simple rendering with highlighted words
      return content.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          const [word, ...defParts] = inner.split('（');
          return (
            <span key={idx}>
              <span className="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded font-semibold">{word}</span>
              {defParts.length > 0 && <span className="text-green-600 dark:text-green-400">（{defParts.join('（')}</span>}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      });
    }

    // Bionic Reading mode
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Memory Assistant</h2>
          <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'generate'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Generate Story
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            History ({contexts.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'generate' ? (
            <div className="space-y-6">
              {/* Word Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                  Select Words ({selectedWords.size} selected)
                </h3>
                {words.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    No words available. Add some words first!
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {words.map(word => (
                      <button
                        key={word.id}
                        onClick={() => toggleWordSelection(word.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedWords.has(word.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {word.word}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={selectedWords.size === 0 || isGenerating || words.length === 0}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isGenerating ? 'Generating...' : 'Generate Story'}
              </button>

              {/* Generated Content */}
              {generatedContent && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 dark:text-white">Generated Story</h3>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showBionic}
                          onChange={(e) => setShowBionic(e.target.checked)}
                          className="rounded"
                        />
                        Bionic Reading
                      </label>
                    </div>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {renderContent(generatedContent)}
                  </div>
                  <button
                    onClick={handleSaveContext}
                    className="mt-4 w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Save to History
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {contexts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No stories generated yet. Create your first story!
                </div>
              ) : (
                contexts.map(context => (
                  <div key={context.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    {editingContext?.id === context.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg"
                          rows={6}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingContext(null)}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateContext}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatShortDate(context.createdAt)} • {context.wordIds.length} words
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditContext(context)}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteContext(context.id)}
                              className="text-red-600 dark:text-red-400 hover:underline text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
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
