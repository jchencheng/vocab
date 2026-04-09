'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWordFromDictionary, translateDefinitionsToChinese } from '../services/dictionaryAPI';
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
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

  // 从 Free Dictionary API 获取英文释义
  const handleGetDefinitions = useCallback(async () => {
    if (!word.trim()) {
      setError('Please enter a word');
      return;
    }

    setIsLoading(true);
    setError('');
    setModelMessage('');

    try {
      const wordData = await fetchWordFromDictionary(word.trim());
      
      if (wordData) {
        setPhonetic(wordData.phonetic || '');
        setMeanings(wordData.meanings);
        setModelMessage(`已从 Free Dictionary API 获取释义`);
      } else {
        setError('未找到该单词的释义');
      }
    } catch (err: any) {
      console.error('Error fetching definition:', err);
      setError('获取释义失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [word]);

  // 翻译中文释义
  const handleTranslateChinese = useCallback(async () => {
    if (meanings.every(m => m.definitions.every(d => d.chineseDefinition))) {
      setError('所有释义已有中文翻译');
      return;
    }

    setIsTranslating(true);
    setError('');
    setModelMessage('');

    try {
      // 收集所有需要翻译的释义
      const definitionsToTranslate: { meaningIndex: number; defIndex: number; definition: string; example: string }[] = [];
      
      meanings.forEach((meaning, mIndex) => {
        meaning.definitions.forEach((def, dIndex) => {
          if (!def.chineseDefinition && def.definition) {
            definitionsToTranslate.push({
              meaningIndex: mIndex,
              defIndex: dIndex,
              definition: def.definition,
              example: def.example,
            });
          }
        });
      });

      if (definitionsToTranslate.length === 0) {
        setError('没有需要翻译的释义');
        setIsTranslating(false);
        return;
      }

      // 调用百度翻译 API
      const translations = await translateDefinitionsToChinese(
        definitionsToTranslate.map(d => ({ definition: d.definition, example: d.example }))
      );

      // 更新中文释义
      const newMeanings = [...meanings];
      definitionsToTranslate.forEach((item, index) => {
        const translation = translations[index];
        if (translation && translation.chineseDefinition) {
          newMeanings[item.meaningIndex].definitions[item.defIndex].chineseDefinition = translation.chineseDefinition;
        }
      });
      
      setMeanings(newMeanings);
      setModelMessage('已使用百度翻译完成中文释义');
    } catch (err: any) {
      console.error('Error translating:', err);
      setError('翻译失败: ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  }, [meanings]);

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
        quality: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nextReviewAt: Date.now(),
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
      setModelMessage('');
    } catch (err) {
      setError('Failed to add word');
    }
  }, [word, phonetic, tags, meanings, addWord]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {modelMessage && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            {modelMessage}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Word</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Word
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a word"
                />
                <button
                  type="button"
                  onClick={handleGetDefinitions}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Get Definitions'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phonetic
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/fəˈnetɪk/"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="noun, verb, adjective"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Meanings</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTranslateChinese}
                disabled={isTranslating}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
              >
                {isTranslating ? 'Translating...' : 'Translate to Chinese'}
              </button>
              <button
                type="button"
                onClick={handleAddMeaning}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
              >
                Add Meaning
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {meanings.map((meaning, meaningIndex) => (
              <div
                key={meaningIndex}
                className="border border-gray-200 rounded-lg p-4 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Part of Speech
                    </label>
                    <input
                      type="text"
                      value={meaning.partOfSpeech}
                      onChange={(e) =>
                        setMeanings(
                          meanings.map((m, i) =>
                            i === meaningIndex
                              ? { ...m, partOfSpeech: e.target.value }
                              : m
                          )
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="noun, verb, adjective, etc."
                    />
                  </div>
                  {meanings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMeaning(meaningIndex)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {meaning.definitions.map((def, defIndex) => (
                    <div
                      key={defIndex}
                      className="bg-gray-50 rounded-lg p-4 space-y-3"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Definition
                        </label>
                        <textarea
                          value={def.definition}
                          onChange={(e) =>
                            setMeanings(
                              meanings.map((m, mi) =>
                                mi === meaningIndex
                                  ? {
                                      ...m,
                                      definitions: m.definitions.map(
                                        (d, di) =>
                                          di === defIndex
                                            ? { ...d, definition: e.target.value }
                                            : d
                                      ),
                                    }
                                  : m
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="Enter definition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Example
                        </label>
                        <textarea
                          value={def.example}
                          onChange={(e) =>
                            setMeanings(
                              meanings.map((m, mi) =>
                                mi === meaningIndex
                                  ? {
                                      ...m,
                                      definitions: m.definitions.map(
                                        (d, di) =>
                                          di === defIndex
                                            ? { ...d, example: e.target.value }
                                            : d
                                      ),
                                    }
                                  : m
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="Enter example sentence"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chinese Definition
                        </label>
                        <textarea
                          value={def.chineseDefinition}
                          onChange={(e) =>
                            setMeanings(
                              meanings.map((m, mi) =>
                                mi === meaningIndex
                                  ? {
                                      ...m,
                                      definitions: m.definitions.map(
                                        (d, di) =>
                                          di === defIndex
                                            ? { ...d, chineseDefinition: e.target.value }
                                            : d
                                      ),
                                    }
                                  : m
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                          placeholder="输入中文释义"
                        />
                      </div>

                      {meaning.definitions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveDefinition(meaningIndex, defIndex)
                          }
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove Definition
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddDefinition(meaningIndex)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Add Definition
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add Word
        </button>
      </form>
    </div>
  );
}
