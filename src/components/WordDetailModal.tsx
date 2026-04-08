import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWord } from '../services/dictionaryAPI';
import { getIntervalText, playAudio, hasAudio, parseTags } from '../utils';
import { useWordEditor } from '../hooks/useWordEditor';
import type { Word } from '../types';

interface WordDetailModalProps {
  word: Word;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function WordDetailModal({ word, onClose, onDelete }: WordDetailModalProps) {
  const { updateWord, settings } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const editor = useWordEditor({ initialWord: word });

  const handleGetDefinitions = useCallback(async () => {
    if (!editor.editWord.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const wordData = await fetchWord(editor.editWord.trim(), settings);
      editor.setEditPhonetic(wordData.phonetic || '');
      editor.setEditMeanings(wordData.meanings);
    } catch {
      setError('Failed to get definitions. Please check the word spelling.');
    } finally {
      setIsLoading(false);
    }
  }, [editor, settings]);

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
    setError('');
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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editor.editWord}
                        onChange={(e) => editor.setEditWord(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleGetDefinitions}
                        disabled={isLoading || !editor.editWord.trim()}
                        className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
                      >
                        {isLoading ? 'Getting...' : 'Get Definitions'}
                      </button>
                    </div>
                    {error && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phonetic</label>
                    <input
                      type="text"
                      value={editor.editPhonetic}
                      onChange={(e) => editor.setEditPhonetic(e.target.value)}
                      placeholder="e.g., /ˈæp.əl/"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editor.editTags}
                      onChange={(e) => editor.setEditTags(e.target.value)}
                      placeholder="e.g., TOEFL, business, important"
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
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-full"
                        >
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
                <button
                  onClick={handlePlayAudio}
                  className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                >
                  🔊
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
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
                {editor.editMeanings.map((meaning, meaningIdx) => (
                  <div key={meaningIdx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Part of Speech
                        </label>
                        <input
                          type="text"
                          value={meaning.partOfSpeech}
                          onChange={(e) => editor.updateMeaning(meaningIdx, 'partOfSpeech', e.target.value)}
                          placeholder="e.g., noun, verb, adjective"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {editor.editMeanings.length > 1 && (
                        <button
                          onClick={() => editor.removeMeaning(meaningIdx)}
                          className="ml-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {meaning.definitions.map((def, defIdx) => (
                        <div key={defIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Definition {defIdx + 1}
                            </label>
                            <textarea
                              value={def.definition}
                              onChange={(e) => editor.updateDefinition(meaningIdx, defIdx, 'definition', e.target.value)}
                              placeholder="Enter the definition"
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Chinese Definition
                            </label>
                            <input
                              type="text"
                              value={def.chineseDefinition || ''}
                              onChange={(e) => editor.updateDefinition(meaningIdx, defIdx, 'chineseDefinition', e.target.value)}
                              placeholder="Enter the Chinese definition"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Example
                            </label>
                            <input
                              type="text"
                              value={def.example || ''}
                              onChange={(e) => editor.updateDefinition(meaningIdx, defIdx, 'example', e.target.value)}
                              placeholder="Enter an example sentence"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex justify-end">
                            {meaning.definitions.length > 1 && (
                              <button
                                onClick={() => editor.removeDefinition(meaningIdx, defIdx)}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                Remove Definition
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => editor.addDefinition(meaningIdx)}
                        className="w-full px-3 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                      >
                        + Add Definition
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={editor.addMeaning}
                  className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  + Add Meaning
                </button>
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
                          <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 italic">"{def.example}"</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Custom Note</h3>
            {isEditing ? (
              <textarea
                value={editor.editNote}
                onChange={(e) => editor.setEditNote(e.target.value)}
                placeholder="Add your notes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 min-h-[80px]">
                {word.customNote || <span className="text-gray-400 dark:text-gray-600">No notes yet</span>}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-xl p-6 max-w-sm w-full animate-slide-up">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Delete Word?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{word.word}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
