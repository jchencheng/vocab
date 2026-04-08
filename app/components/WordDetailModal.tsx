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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Word</label>
                    <input
                      type="text"
                      value={editor.editWord}
                      onChange={(e) => editor.setEditWord(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phonetic</label>
                    <input
                      type="text"
                      value={editor.editPhonetic}
                      onChange={(e) => editor.setEditPhonetic(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                    <input
                      type="text"
                      value={editor.editTags}
                      onChange={(e) => editor.setEditTags(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{word.word}</h2>
                    {word.phonetic && (
                      <span className="text-lg text-gray-600 dark:text-gray-400">{word.phonetic}</span>
                    )}
                  </div>
                  {word.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {word.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {hasAudio(word.phonetics) && (
                <button onClick={handlePlayAudio} className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  🔊
                </button>
              )}
              <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{getIntervalText(word.interval)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Interval</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{word.reviewCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Reviews</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{word.easeFactor.toFixed(2)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Ease Factor</div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {isEditing ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Meanings</h3>
                {editor.editMeanings.map((meaning, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <input
                      type="text"
                      value={meaning.partOfSpeech}
                      onChange={(e) => editor.updateMeaning(idx, 'partOfSpeech', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg mb-3"
                    />
                    {meaning.definitions.map((def, defIdx) => (
                      <div key={defIdx} className="mb-3">
                        <textarea
                          value={def.definition}
                          onChange={(e) => editor.updateDefinition(idx, defIdx, 'definition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              word.meanings.map((meaning, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded mb-3">
                    {meaning.partOfSpeech}
                  </span>
                  <ul className="space-y-3">
                    {meaning.definitions.map((def, defIdx) => (
                      <li key={defIdx}>
                        <div className="font-medium text-gray-800 dark:text-white">{def.definition}</div>
                        {def.chineseDefinition && (
                          <div className="text-green-600 dark:text-green-400 text-sm mt-1">{def.chineseDefinition}</div>
                        )}
                        {def.example && (
                          <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 italic">&quot;{def.example}&quot;</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button onClick={handleCancelEdit} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                  Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Delete Word?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{word.word}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
