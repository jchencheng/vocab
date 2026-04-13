'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fetchWordFromDictionary, translateDefinitionsToChinese } from '../services/dictionaryAPI';
import { checkWordExists, addWordWithCheck } from '../services/wordAPI';
import { parseTags } from '../utils/formatters';
import { DuplicateWarning } from './DuplicateWarning';
import { BuiltinMeaningsCard } from './BuiltinMeaningsCard';
import type { Word, WordCheckResult } from '../types';

export function AddWord() {
  const { addWord } = useApp();
  const { user } = useAuth();
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [tags, setTags] = useState('');
  const [meanings, setMeanings] = useState<Word['meanings']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [modelMessage, setModelMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 检查相关状态
  const [checkResult, setCheckResult] = useState<WordCheckResult | null>(null);
  const [showBuiltinCard, setShowBuiltinCard] = useState(false);
  const [useBuiltinMeanings, setUseBuiltinMeanings] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  
  // 词典词状态
  const [isDictionaryWord, setIsDictionaryWord] = useState(false);
  const [isFromDictionary, setIsFromDictionary] = useState(false);

  // 防抖定时器
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 自动检查单词（防抖）
  useEffect(() => {
    // 清除之前的定时器
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // 重置检查状态
    setCheckResult(null);
    setShowBuiltinCard(false);
    setUseBuiltinMeanings(false);
    setHasChecked(false);
    setModelMessage('');
    setIsDictionaryWord(false);
    setIsFromDictionary(false);
    // 清空释义
    setMeanings([]);
    setPhonetic('');

    // 如果单词为空，不检查
    if (!word.trim() || !user) {
      return;
    }

    // 设置防抖定时器，1秒后检查
    checkTimeoutRef.current = setTimeout(async () => {
      await performCheck(word.trim());
    }, 1000);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [word, user]);

  // 执行检查
  const performCheck = async (wordToCheck: string) => {
    if (!user) return;

    setIsChecking(true);
    setError('');

    try {
      const result = await checkWordExists(wordToCheck, user.id);
      setCheckResult(result);
      setHasChecked(true);

      if (result.existsInUserLibrary) {
        // 单词已存在于用户词库，显示警告
        setModelMessage(`"${wordToCheck}" 已在您的词库中`);
      } else if (result.existsInDictionary && result.dictionaryWord) {
        // 单词存在于词典数据库，自动使用词典释义（不可编辑）
        setIsDictionaryWord(true);
        setIsFromDictionary(true);
        setPhonetic(result.dictionaryWord.phonetic || '');
        setMeanings(result.dictionaryWord.meanings);
        setModelMessage(`"${wordToCheck}" 已存在于词典中，已自动加载释义（不可编辑）`);
      } else if (result.existsInBuiltin && result.builtinWord) {
        // 单词存在于系统词库，显示内置释义
        setShowBuiltinCard(true);
        setModelMessage(`"${wordToCheck}" 存在于系统词库，可使用内置释义`);
      } else {
        // 单词不存在，支持自定义释义
        setIsDictionaryWord(false);
        setIsFromDictionary(false);
        setModelMessage(`"${wordToCheck}" 是新单词，请添加自定义释义`);
      }
    } catch (err: any) {
      console.error('Error checking word:', err);
      // 不显示错误给用户，静默失败
    } finally {
      setIsChecking(false);
    }
  };

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
              definitions: meaning.definitions.filter((_, i: number) => i !== definitionIndex),
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
    if (meanings.length === 0 || meanings.every(m => m.definitions.every(d => d.chineseDefinition))) {
      setError('没有需要翻译的释义');
      return;
    }

    setIsTranslating(true);
    setError('');
    setModelMessage('');

    try {
      // 收集所有需要翻译的释义
      const definitionsToTranslate: { meaningIndex: number; defIndex: number; definition: string; example: string }[] = [];
      
      meanings.forEach((meaning, mIndex) => {
        meaning.definitions.forEach((def, dIndex: number) => {
          if (!def.chineseDefinition && def.definition) {
            definitionsToTranslate.push({
              meaningIndex: mIndex,
              defIndex: dIndex,
              definition: def.definition,
              example: def.example || '',
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

  // 使用内置释义
  const handleUseBuiltinMeanings = useCallback(() => {
    if (checkResult?.builtinWord) {
      setPhonetic(checkResult.builtinWord.phonetic || '');
      setMeanings(checkResult.builtinWord.meanings);
      setUseBuiltinMeanings(true);
      setShowBuiltinCard(false);
      setModelMessage('已使用系统内置释义');
    }
  }, [checkResult]);

  // 添加自定义释义（保留内置释义）
  const handleAddCustomMeanings = useCallback(() => {
    setUseBuiltinMeanings(false);
    setShowBuiltinCard(false);
    setModelMessage('请添加您的自定义释义');
    // 添加一个空的 meaning
    if (meanings.length === 0) {
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
    }
  }, [meanings.length]);

  // 取消添加（单词已存在）
  const handleCancelAdd = useCallback(() => {
    setCheckResult(null);
    setWord('');
    setPhonetic('');
    setMeanings([]);
    setModelMessage('');
    setHasChecked(false);
  }, []);

  // 强制添加（单词已存在但用户仍要添加）
  const handleForceAdd = useCallback(() => {
    setCheckResult(prev => prev ? { ...prev, existsInUserLibrary: false } : null);
    setModelMessage('您可以继续添加此单词（将创建新记录）');
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!word.trim()) {
      setError('Please enter a word');
      return;
    }

    if (!user) {
      setError('Please login first');
      return;
    }

    // 如果还没有检查过，先执行检查
    if (!hasChecked) {
      await performCheck(word.trim());
      return;
    }

    // 如果单词已存在且用户没有强制添加，显示警告
    if (checkResult?.existsInUserLibrary) {
      setModelMessage('该单词已存在，请选择操作');
      return;
    }

    try {
      // 使用新的 API 添加单词
      const newWord = await addWordWithCheck({
        word: word.trim(),
        phonetic: phonetic.trim(),
        meanings: meanings.length > 0 ? meanings : [],
        tags: parseTags(tags),
        userId: user.id,
        useBuiltinMeanings,
        originalWordId: checkResult?.builtinWord?.id || checkResult?.dictionaryWord?.id,
        isFromDictionary,
      });

      // 显示成功提示
      setSuccessMessage(`"${newWord.word}" added successfully!`);
      
      // 3秒后清除成功提示
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

      // Reset form
      setWord('');
      setPhonetic('');
      setTags('');
      setMeanings([]);
      setError('');
      setModelMessage('');
      setCheckResult(null);
      setShowBuiltinCard(false);
      setUseBuiltinMeanings(false);
      setHasChecked(false);
    } catch (err) {
      setError('Failed to add word');
      setSuccessMessage('');
    }
  }, [word, phonetic, tags, meanings, useBuiltinMeanings, checkResult, hasChecked, user]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 animate-fade-in">
            ✅ {successMessage}
          </div>
        )}

        {modelMessage && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            {isChecking && <span className="inline-block mr-2">⏳</span>}
            {modelMessage}
          </div>
        )}

        {/* 重复单词警告 */}
        {checkResult?.existsInUserLibrary && (
          <DuplicateWarning
            word={checkResult.userWord}
            onCancel={handleCancelAdd}
            onForceAdd={handleForceAdd}
          />
        )}

        {/* 内置释义卡片 */}
        {showBuiltinCard && checkResult?.builtinWord && (
          <BuiltinMeaningsCard
            word={checkResult.builtinWord}
            onUseBuiltin={handleUseBuiltinMeanings}
            onAddCustom={handleAddCustomMeanings}
          />
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
                  disabled={isLoading || !word.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Get Definitions'}
                </button>
              </div>
              {isChecking && (
                <p className="mt-1 text-sm text-gray-500">正在检查单词...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phonetic <span className="text-gray-400 font-normal">(可选)</span>
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
                Tags <span className="text-gray-400 font-normal">(可选，逗号分隔)</span>
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
            <h3 className="text-lg font-semibold text-gray-900">
              Meanings <span className="text-gray-400 font-normal text-sm">(可选)</span>
              {useBuiltinMeanings && (
                <span className="ml-2 text-sm font-normal text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  使用系统内置释义
                </span>
              )}
              {isFromDictionary && (
                <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  词典释义（不可编辑）
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              {!isFromDictionary && (
                <>
                  <button
                    type="button"
                    onClick={handleTranslateChinese}
                    disabled={isTranslating || meanings.length === 0}
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
                </>
              )}
            </div>
          </div>

          {meanings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>暂无释义</p>
              {!isFromDictionary && (
                <p className="text-sm mt-1">点击 &quot;Add Meaning&quot; 添加，或直接提交空单词</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {meanings.map((meaning, meaningIndex) => (
                <div
                  key={meaningIndex}
                  className={`border rounded-lg p-4 space-y-4 ${isFromDictionary ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}
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
                          !isFromDictionary && setMeanings(
                            meanings.map((m, i) =>
                              i === meaningIndex
                                ? { ...m, partOfSpeech: e.target.value }
                                : m
                            )
                          )
                        }
                        disabled={isFromDictionary}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isFromDictionary 
                            ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        }`}
                        placeholder="noun, verb, adjective, etc."
                      />
                    </div>
                    {meanings.length > 1 && !isFromDictionary && (
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
                    {meaning.definitions.map((def, defIndex: number) => (
                      <div
                        key={defIndex}
                        className={`rounded-lg p-4 space-y-3 ${isFromDictionary ? 'bg-blue-50/50' : 'bg-gray-50'}`}
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Definition
                          </label>
                          <textarea
                            value={def.definition}
                            onChange={(e) =>
                              !isFromDictionary && setMeanings(
                                meanings.map((m, mi) =>
                                  mi === meaningIndex
                                    ? {
                                        ...m,
                                        definitions: m.definitions.map((d, di: number) =>
                                          di === defIndex
                                            ? { ...d, definition: e.target.value }
                                            : d
                                        ),
                                      }
                                    : m
                                )
                              )
                            }
                            disabled={isFromDictionary}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isFromDictionary 
                                ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`}
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
                              !isFromDictionary && setMeanings(
                                meanings.map((m, mi) =>
                                  mi === meaningIndex
                                    ? {
                                        ...m,
                                        definitions: m.definitions.map((d, di: number) =>
                                          di === defIndex
                                            ? { ...d, example: e.target.value }
                                            : d
                                        ),
                                      }
                                    : m
                                )
                              )
                            }
                            disabled={isFromDictionary}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isFromDictionary 
                                ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`}
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
                              !isFromDictionary && setMeanings(
                                meanings.map((m, mi) =>
                                  mi === meaningIndex
                                    ? {
                                        ...m,
                                        definitions: m.definitions.map((d, di: number) =>
                                          di === defIndex
                                            ? { ...d, chineseDefinition: e.target.value }
                                            : d
                                        ),
                                      }
                                    : m
                                )
                              )
                            }
                            disabled={isFromDictionary}
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isFromDictionary 
                                ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                                : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`}
                            rows={2}
                            placeholder="输入中文释义"
                          />
                        </div>

                        {meaning.definitions.length > 1 && !isFromDictionary && (
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
          )}
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
