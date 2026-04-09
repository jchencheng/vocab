'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { generateContent } from '../services/apiClient';
import { parseTags } from '../utils/formatters';
import type { Word } from '../types';

export function AddWord() {
  const { addWord } = useApp();
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [tags, setTags] = useState('');
  const [meanings, setMeanings] = useState<Word['meanings']>([
    {
      partOfSpeech: 'noun',
      definitions: [
        {
          definition: '',
          example: '',
          chineseDefinition: '',
          synonyms: [],
          antonyms: [],
        },
      ],
      synonyms: [],
      antonyms: [],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('siliconflow');
  const [modelMessage, setModelMessage] = useState('');

  const handleAddMeaning = useCallback(() => {
    setMeanings([
      ...meanings,
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: '',
            example: '',
            chineseDefinition: '',
            synonyms: [],
            antonyms: [],
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ]);
  }, [meanings]);

  const handleRemoveMeaning = useCallback((index: number) => {
    if (meanings.length > 1) {
      setMeanings(meanings.filter((_, i) => i !== index));
    }
  }, [meanings]);

  const handleAddDefinition = useCallback((meaningIndex: number) => {
    setMeanings(
      meanings.map((meaning, index) => {
        if (index === meaningIndex) {
          return {
            ...meaning,
            definitions: [
              ...meaning.definitions,
              {
                definition: '',
                example: '',
                chineseDefinition: '',
                synonyms: [],
                antonyms: [],
              },
            ],
          };
        }
        return meaning;
      })
    );
  }, [meanings]);

  const handleRemoveDefinition = useCallback(
    (meaningIndex: number, definitionIndex: number) => {
      setMeanings(
        meanings.map((meaning, index) => {
          if (index === meaningIndex) {
            return {
              ...meaning,
              definitions: meaning.definitions.filter(
                (_: any, i: number) => i !== definitionIndex
              ),
            };
          }
          return meaning;
        })
      );
    },
    [meanings]
  );

  const handleGetDefinitions = useCallback(async () => {
    if (!word.trim()) {
      setError('Please enter a word');
      return;
    }

    setIsLoading(true);
    setError('');
    setModelMessage('');

    try {
      const prompt = `Provide a detailed dictionary definition for the word "${word}" in JSON format with the following structure:
{
  "word": "${word}",
  "phonetic": "/phonetic/",
  "meanings": [
    {
      "partOfSpeech": "noun|verb|adjective|adverb|etc",
      "definitions": [
        {
          "definition": "clear English definition",
          "example": "example sentence",
          "chineseDefinition": "中文释义"
        }
      ]
    }
  ]
}
Include at least 2 meanings with different parts of speech if applicable.`;

      const response = await generateContent(prompt, undefined, selectedModel);
      const content = response.content;
      
      // 显示使用的模型
      if (response.model) {
        setModelMessage(`使用 ${response.model} 生成释义`);
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const wordData = JSON.parse(jsonMatch[0]);

        setPhonetic(wordData.phonetic || '');
        setMeanings(
          wordData.meanings.map((m: any) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.map((d: any) => ({
              definition: d.definition,
              example: d.example || '',
              chineseDefinition: d.chineseDefinition,
              synonyms: [],
              antonyms: [],
            })),
            synonyms: [],
            antonyms: [],
          }))
        );
      } else {
        setError('Failed to parse word definition');
      }
    } catch (err: any) {
      console.error('Error fetching definition:', err);
      setError('Failed to fetch definition: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [word, selectedModel]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim()) {
      setError('Please enter a word');
      return;
    }

    if (meanings.every((meaning) => meaning.definitions.every((def: any) => !def.definition.trim()))) {
      setError('Please enter at least one definition');
      return;
    }

    try {
      const newWord: Word = {
        id: crypto.randomUUID(),
        word: word.trim(),
        phonetic: phonetic.trim(),
        phonetics: [],
        meanings: meanings,
        tags: parseTags(tags),
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        nextReviewAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        quality: 0,
      };

      await addWord(newWord);

      // Reset form
      setWord('');
      setPhonetic('');
      setTags('');
      setMeanings([
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: '',
              example: '',
              chineseDefinition: '',
              synonyms: [],
              antonyms: [],
            },
          ],
          synonyms: [],
          antonyms: [],
        },
      ]);
      setError('');
    } catch (err: any) {
      console.error('Error adding word:', err);
      setError('Failed to add word: ' + err.message);
    }
  }, [word, phonetic, tags, meanings, addWord]);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2">Add New Word</h1>
          <p className="text-slate-600 dark:text-slate-400">Build your vocabulary collection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}
          {modelMessage && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50 rounded-2xl text-primary-600 dark:text-primary-400 text-sm flex items-center gap-2">
              <span>✅</span>
              {modelMessage}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Word</label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="Enter a word"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phonetic</label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="/fəˈnɛtɪk/"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="separated by commas"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">优先模型</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              >
                <option value="siliconflow">SiliconFlow Tencent Hunyuan MT-7B (默认)</option>
                <option value="zhipu">智谱 GLM-4.7-Flash</option>
                <option value="google">Google Gemini</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGetDefinitions}
              disabled={!word.trim() || isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Getting definitions...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Get Definitions
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📝</span>
              Meanings
            </h3>

            {meanings.map((meaning, meaningIndex) => (
              <div
                key={meaningIndex}
                className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-600/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <input
                    type="text"
                    value={meaning.partOfSpeech}
                    onChange={(e) =>
                      setMeanings(
                        meanings.map((m, i) =>
                          i === meaningIndex ? { ...m, partOfSpeech: e.target.value } : m
                        )
                      )
                    }
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Part of speech"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMeaning(meaningIndex)}
                    disabled={meanings.length === 1}
                    className="ml-3 p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕
                  </button>
                </div>

                {meaning.definitions.map((definition: any, definitionIndex: number) => (
                  <div key={definitionIndex} className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        English Definition
                      </label>
                      <textarea
                        value={definition.definition}
                        onChange={(e) =>
                          setMeanings(
                            meanings.map((m, i) =>
                              i === meaningIndex
                                ? {
                                    ...m,
                                    definitions: m.definitions.map((d: any, j: number) =>
                                      j === definitionIndex
                                        ? { ...d, definition: e.target.value }
                                        : d
                                    ),
                                  }
                                : m
                            )
                          )
                        }
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                        rows={2}
                        placeholder="Definition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Chinese Definition
                      </label>
                      <input
                        type="text"
                        value={definition.chineseDefinition}
                        onChange={(e) =>
                          setMeanings(
                            meanings.map((m, i) =>
                              i === meaningIndex
                                ? {
                                    ...m,
                                    definitions: m.definitions.map((d: any, j: number) =>
                                      j === definitionIndex
                                        ? { ...d, chineseDefinition: e.target.value }
                                        : d
                                    ),
                                  }
                                : m
                            )
                          )
                        }
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="中文释义"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Example
                      </label>
                      <input
                        type="text"
                        value={definition.example}
                        onChange={(e) =>
                          setMeanings(
                            meanings.map((m, i) =>
                              i === meaningIndex
                                ? {
                                    ...m,
                                    definitions: m.definitions.map((d: any, j: number) =>
                                      j === definitionIndex
                                        ? { ...d, example: e.target.value }
                                        : d
                                    ),
                                  }
                                : m
                            )
                          )
                        }
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Example sentence"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDefinition(meaningIndex, definitionIndex)}
                        disabled={meaning.definitions.length === 1}
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove Definition
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddDefinition(meaningIndex)}
                  className="w-full py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-xl text-sm font-medium transition-colors"
                >
                  + Add Definition
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddMeaning}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
            >
              + Add Meaning
            </button>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setWord('');
                setPhonetic('');
                setTags('');
                setMeanings([
                  {
                    partOfSpeech: 'noun',
                    definitions: [
                      {
                        definition: '',
                        example: '',
                        chineseDefinition: '',
                        synonyms: [],
                        antonyms: [],
                      },
                    ],
                    synonyms: [],
                    antonyms: [],
                  },
                ]);
                setError('');
              }}
              className="flex-1 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft"
            >
              Reset
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
            >
              Add Word
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
