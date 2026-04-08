'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useWordEditor } from '../hooks/useWordEditor';
import { getIntervalText, playAudio, hasAudio, parseTags } from '../utils/formatters';
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

  const editor = useWordEditor({ initialWord: word });

  const handlePlayAudio = useCallback(() => {
    playAudio(word.phonetics);
  }, [word.phonetics]);

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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Word</label>
                    <input
                      type="text"
                      value={editor.editWord}
                      onChange={(e) => editor.setEditWord(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Phonetic</label>
                    <input
                      type="text"
                      value={editor.editPhonetic}
                      onChange={(e) => editor.setEditPhonetic(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags</label>
                    <input
                      type="text"
                      value={editor.editTags}
                      onChange={(e) => editor.setEditTags(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Meanings</h3>
                {editor.editMeanings.map((meaning, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-4 border border-slate-200/50 dark:border-slate-600/50">
                    <input
                      type="text"
                      value={meaning.partOfSpeech}
                      onChange={(e) => editor.updateMeaning(idx, 'partOfSpeech', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                    {meaning.definitions.map((def, defIdx) => (
                      <div key={defIdx} className="mb-4">
                        <textarea
                          value={def.definition}
                          onChange={(e) => editor.updateDefinition(idx, defIdx, 'definition', e.target.value)}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                ))}
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
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 px-6 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]">
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="flex-1 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft">
                  Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 px-6 py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]">
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-medium">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Delete Word?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Are you sure you want to delete &quot;<span className="font-semibold">{word.word}</span>&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-soft">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
