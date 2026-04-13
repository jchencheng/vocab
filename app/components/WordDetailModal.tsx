'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useWordEditor } from '../hooks/useWordEditor';
import { getIntervalText, playAudio, hasAudio, parseTags } from '../utils/formatters';
import { fetchWordFromDictionary, translateDefinitionsToChinese } from '../services/dictionaryAPI';
import type { Word } from '../types';

interface WordDetailModalProps {
  word: Word;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function WordDetailModal({ word, onClose, onDelete }: WordDetailModalProps) {
  const { updateWord } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [modelMessage, setModelMessage] = useState('');

  // 判断单词是否来自词典
  const isFromDictionary = word.sourceType === 'dictionary';

  const editor = useWordEditor({ initialWord: word });

  const handlePlayAudio = useCallback(() => {
    playAudio(word.phonetics);
  }, [word.phonetics]);

  // 从 Free Dictionary API 获取英文释义
  const handleGetDefinitions = useCallback(async () => {
    if (!editor.editWord.trim()) return;

    setIsLoadingDefinition(true);
    setError('');
    setModelMessage('');

    try {
      const wordData = await fetchWordFromDictionary(editor.editWord.trim());
      
      if (wordData) {
        editor.setEditPhonetic(wordData.phonetic || '');
        editor.setEditMeanings(wordData.meanings);
        setModelMessage(`已从 Free Dictionary API 获取释义`);
      } else {
        setError('未找到该单词的释义');
      }
    } catch (err: any) {
      console.error('Error fetching definition:', err);
      setError('获取释义失败: ' + err.message);
    } finally {
      setIsLoadingDefinition(false);
    }
  }, [editor]);

  // 翻译中文释义
  const handleTranslateChinese = useCallback(async () => {
    const meanings = editor.editMeanings;
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
        meaning.definitions.forEach((def: { chineseDefinition?: string; definition: string; example?: string }, dIndex: number) => {
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
      
      editor.setEditMeanings(newMeanings);
      setModelMessage('已使用百度翻译完成中文释义');
    } catch (err: any) {
      console.error('Error translating:', err);
      setError('翻译失败: ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  }, [editor]);

  const handleSave = useCallback(async () => {
    const tags = parseTags(editor.editTags);
    const updatedWord: Word = {
      ...editor.getEditedWord(word),
      tags,
    };
    await updateWord(updatedWord);
    setIsEditing(false);
    onClose();
  }, [word, editor, updateWord, onClose]);

  const handleDelete = useCallback(async () => {
    await onDelete(word.id);
    onClose();
  }, [word.id, onDelete, onClose]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    editor.resetToOriginal();
  }, [editor]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up shadow-medium">
        <div className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-5">
                  {/* 单词输入 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      单词 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editor.editWord}
                      onChange={(e) => editor.setEditWord(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* 音标输入 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      音标
                      {isFromDictionary && (
                        <span className="ml-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700">🔒 词典音标（不可编辑）</span>
                      )}
                      {!isFromDictionary && <span className="text-slate-400 font-normal">(可选)</span>}
                    </label>
                    {isFromDictionary ? (
                      <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-400">
                        <span className="font-mono text-lg">{editor.editPhonetic || '-'}</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={editor.editPhonetic}
                        onChange={(e) => editor.setEditPhonetic(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="/fəˈnetɪk/"
                      />
                    )}
                  </div>

                  {/* 标签输入 */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      标签 <span className="text-slate-400 font-normal">(可选，逗号分隔)</span>
                    </label>
                    <input
                      type="text"
                      value={editor.editTags}
                      onChange={(e) => editor.setEditTags(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="例如：noun, verb, CET-4"
                    />
                  </div>

                  {/* 错误提示 */}
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

                  {/* 成功提示 */}
                  {modelMessage && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg text-green-700 dark:text-green-400 shadow-sm">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{modelMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* 词典词提示 */}
                  {isFromDictionary && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg text-blue-800 dark:text-blue-400 shadow-sm">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">该单词来自词典，音标和释义不可编辑</span>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {!isFromDictionary && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleGetDefinitions}
                        disabled={!editor.editWord.trim() || isLoadingDefinition}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft flex items-center justify-center gap-2"
                      >
                        {isLoadingDefinition ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            获取中...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            获取释义
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleTranslateChinese}
                        disabled={isTranslating}
                        className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft flex items-center justify-center gap-2"
                      >
                        {isTranslating ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            翻译中...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            翻译中文
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white">{word.word}</h2>
                    {word.phonetic && (
                      <span className="text-lg text-slate-500 dark:text-slate-400 font-mono">{word.phonetic}</span>
                    )}
                  </div>
                  {word.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {word.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full border border-primary-100 dark:border-primary-800/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 ml-6 flex-shrink-0">
              {hasAudio(word.phonetics) && !isEditing && (
                <button onClick={handlePlayAudio} className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-colors shadow-soft">
                  🔊
                </button>
              )}
              <button onClick={onClose} className="p-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                  ✕
                </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">{getIntervalText(word.interval)}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Interval</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 text-center">
              <div className="text-2xl font-bold text-accent-600 dark:text-accent-400 mb-1">{word.reviewCount}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Reviews</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mb-1">{word.easeFactor.toFixed(2)}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Ease Factor</div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {isEditing ? (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-green-600 rounded-full mr-3"></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    释义
                    {isFromDictionary && (
                      <span className="ml-2 text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700">
                        🔒 词典释义（不可编辑）
                      </span>
                    )}
                  </h3>
                </div>
                {isFromDictionary ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6">
                    {editor.editMeanings.map((meaning, idx) => (
                      <div key={idx} className="mb-6 last:mb-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-lg">
                            {meaning.partOfSpeech}
                          </span>
                        </div>
                        {meaning.definitions.map((def, defIdx) => (
                          <div key={defIdx} className="mb-4 last:mb-0 pl-4 border-l-2 border-slate-300 dark:border-slate-600">
                            <p className="text-slate-700 dark:text-slate-300 mb-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">英文：</span>
                              {def.definition}
                            </p>
                            {def.chineseDefinition && (
                              <p className="text-slate-700 dark:text-slate-300 mb-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">中文：</span>
                                {def.chineseDefinition}
                              </p>
                            )}
                            {def.example && (
                              <p className="text-slate-600 dark:text-slate-400 italic">
                                <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">例句：</span>
                                {def.example}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  editor.editMeanings.map((meaning, idx) => (
                    <div key={idx} className="rounded-2xl p-5 mb-4 border bg-slate-50 dark:bg-slate-700/50 border-slate-200/50 dark:border-slate-600/50">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        词性
                      </label>
                      <input
                        type="text"
                        value={meaning.partOfSpeech}
                        onChange={(e) => editor.updateMeaning(idx, 'partOfSpeech', e.target.value)}
                        className="w-full px-4 py-2.5 border rounded-xl mb-4 text-sm transition-all bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="如：名词、动词、形容词"
                      />
                      {meaning.definitions.map((def, defIdx) => (
                        <div key={defIdx} className="rounded-xl p-4 mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              英文释义
                            </label>
                            <textarea
                              value={def.definition}
                              onChange={(e) => editor.updateDefinition(idx, defIdx, 'definition', e.target.value)}
                              className="w-full px-3 py-2.5 border rounded-xl text-sm transition-all resize-none bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              rows={2}
                              placeholder="输入英文释义"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              中文释义
                            </label>
                            <textarea
                              value={def.chineseDefinition || ''}
                              onChange={(e) => editor.updateDefinition(idx, defIdx, 'chineseDefinition', e.target.value)}
                              className="w-full px-3 py-2.5 border rounded-xl text-sm transition-all bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              rows={2}
                              placeholder="输入中文释义"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              例句 <span className="text-slate-400 font-normal font-medium">(可选)</span>
                            </label>
                            <textarea
                              value={def.example || ''}
                              onChange={(e) => editor.updateDefinition(idx, defIdx, 'example', e.target.value)}
                              className="w-full px-3 py-2.5 border rounded-xl text-sm transition-all bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              rows={2}
                              placeholder="输入例句"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
              )}
            </div>
          ) : (
            word.meanings.map((meaning, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/50">
                  <span className="inline-block px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-semibold rounded-full mb-4 border border-primary-100 dark:border-primary-800/30">
                    {meaning.partOfSpeech}
                  </span>
                  <ul className="space-y-4">
                    {meaning.definitions.map((def: any, defIdx: number) => (
                      <li key={defIdx}>
                        <div className="font-semibold text-slate-900 dark:text-white mb-2">{def.definition}</div>
                        {def.chineseDefinition && (
                          <div className="text-accent-600 dark:text-accent-400 text-base mb-2">{def.chineseDefinition}</div>
                        )}
                        {def.example && (
                          <div className="text-slate-600 dark:text-slate-400 text-sm italic">&quot;{def.example}&quot;</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-4">
            {isEditing ? (
              <>
                <button onClick={handleCancelEdit} className="flex-1 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft">
                  取消
                </button>
                <button onClick={handleSave} className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]">
                  保存修改
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="flex-1 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft">
                  编辑
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 px-6 py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]">
                  删除
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-medium">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">删除单词？</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              确定要删除 &quot;<span className="font-semibold">{word.word}</span>&quot; 吗？此操作无法撤销。
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft">
                取消
              </button>
              <button onClick={handleDelete} className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]">
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
