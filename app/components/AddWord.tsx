'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fetchWordFromDictionary, translateDefinitionsToChinese } from '../services/dictionaryAPI';
import { checkWordExists, addWordWithCheck } from '../services/wordAPI';
import { fetchWordBooks, createWordBook, addToLearningSequence } from '../services/wordbookAPI';
import { parseTags } from '../utils/formatters';
import { DuplicateWarning } from './DuplicateWarning';
import { BuiltinMeaningsCard } from './BuiltinMeaningsCard';
import type { Word, WordCheckResult, WordBook } from '../types';

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

  // 获取或创建自定义单词书
  const getOrCreateCustomWordBook = async (userId: string): Promise<WordBook | null> => {
    try {
      // 获取用户的单词书列表
      const { customBooks } = await fetchWordBooks(userId);
      
      // 查找是否已有"自定义单词书"
      let customBook = customBooks.find(book => book.name === '自定义单词书');
      
      if (!customBook) {
        // 创建新的自定义单词书
        customBook = await createWordBook(userId, {
          name: '自定义单词书',
          description: '用户手动添加的单词集合',
        });
        
        // 自动添加到学习序列
        await addToLearningSequence(userId, customBook.id, customBooks.length === 0);
      }
      
      return customBook;
    } catch (err) {
      console.error('Error getting/creating custom wordbook:', err);
      return null;
    }
  };

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

      // 将单词添加到自定义单词书
      const customBook = await getOrCreateCustomWordBook(user.id);
      if (customBook) {
        // 调用 API 将单词添加到单词书
        await fetch(`/api/wordbooks/${customBook.id}/words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id, 
            wordId: newWord.id,
            sourceType: 'custom'
          }),
        });
      }

      // 显示成功提示
      setSuccessMessage(`"${newWord.word}" 已添加到自定义单词书！`);
      
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg text-red-700 dark:text-red-400 shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg text-green-700 dark:text-green-400 shadow-sm animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {modelMessage && (
          <div className={`p-4 border-l-4 rounded-r-lg shadow-sm ${
            isFromDictionary 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-400' 
              : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-800 dark:text-indigo-400'
          }`}>
            <div className="flex items-center">
              {isChecking ? (
                <svg className="animate-spin w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{modelMessage}</span>
            </div>
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">添加新单词</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                单词 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="flex-1 px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  placeholder="请输入英文单词"
                />
                <button
                  type="button"
                  onClick={handleGetDefinitions}
                  disabled={isLoading || !word.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  {isLoading ? '获取中...' : '获取释义'}
                </button>
              </div>
              {isChecking && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  正在检查单词...
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                音标
                {isFromDictionary && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">词典音标</span>
                )}
                {!isFromDictionary && <span className="text-gray-400 dark:text-gray-500 font-normal">(可选)</span>}
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => !isFromDictionary && setPhonetic(e.target.value)}
                disabled={isFromDictionary}
                className={`w-full px-4 py-2 border rounded-lg ${
                  isFromDictionary
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                }`}
                placeholder="/fəˈnetɪk/"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                标签 <span className="text-gray-400 dark:text-gray-500 font-normal font-medium">(可选，逗号分隔)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                placeholder="例如：noun, verb, CET-4"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center">
              <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-3"></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                释义 <span className="text-gray-400 dark:text-gray-500 font-normal text-sm font-medium">(可选)</span>
                {useBuiltinMeanings && (
                  <span className="ml-2 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 rounded-full">
                    系统内置释义
                  </span>
                )}
                {isFromDictionary && (
                  <span className="ml-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                    词典释义
                  </span>
                )}
              </h3>
            </div>
            <div className="flex gap-2">
              {!isFromDictionary && (
                <>
                  <button
                    type="button"
                    onClick={handleTranslateChinese}
                    disabled={isTranslating || meanings.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 text-sm transition-all shadow-sm"
                  >
                    {isTranslating ? '翻译中...' : '翻译中文'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMeaning}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm transition-all border border-gray-200 dark:border-gray-600"
                  >
                    添加释义
                  </button>
                </>
              )}
            </div>
          </div>

          {meanings.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">暂无释义</p>
              {!isFromDictionary && (
                <p className="text-sm mt-2 text-gray-400 dark:text-gray-500">点击「添加释义」按钮添加，或直接提交</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {meanings.map((meaning, meaningIndex) => (
                <div
                  key={meaningIndex}
                  className={`border rounded-lg p-4 space-y-4 ${isFromDictionary ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        词性
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
                        className={`w-full px-3 py-2.5 text-base border rounded-lg ${
                          isFromDictionary 
                            ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                            : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                        }`}
                        placeholder="如：名词、动词、形容词"
                      />
                    </div>
                    {meanings.length > 1 && !isFromDictionary && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMeaning(meaningIndex)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium flex items-center px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {meaning.definitions.map((def, defIndex: number) => (
                      <div
                        key={defIndex}
                        className={`rounded-lg p-4 space-y-3 ${isFromDictionary ? 'bg-blue-50/50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                      >
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            英文释义
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
                            className={`w-full px-3 py-2.5 text-base border rounded-lg ${
                              isFromDictionary 
                                ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                                : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                            }`}
                            rows={2}
                            placeholder="输入英文释义"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            例句 <span className="text-gray-400 dark:text-gray-500 font-normal font-medium">(可选)</span>
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
                            className={`w-full px-3 py-2.5 text-base border rounded-lg ${
                              isFromDictionary 
                                ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                                : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                            }`}
                            rows={2}
                            placeholder="输入例句"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            中文释义
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
                            className={`w-full px-3 py-2.5 text-base border rounded-lg ${
                              isFromDictionary 
                                ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                                : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
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
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            删除定义
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isFromDictionary && (
                    <button
                      type="button"
                      onClick={() => handleAddDefinition(meaningIndex)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      添加定义
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!word.trim()}
        >
          <span className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加单词
          </span>
        </button>
      </form>
    </div>
  );
}
