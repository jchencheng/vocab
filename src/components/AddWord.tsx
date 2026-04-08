import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWord } from '../services/dictionaryAPI';
import { createNewWord, parseTags } from '../utils';
import { useWordEditor } from '../hooks/useWordEditor';
import { WordEditorForm } from './WordEditorForm';
import type { Word, Meaning } from '../types';

function createEmptyMeaning(): Meaning {
  return {
    partOfSpeech: 'unknown',
    definitions: [{ definition: '', example: '', synonyms: [], antonyms: [] }],
    synonyms: [],
    antonyms: [],
  };
}

function createEmptyWord(): Word {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    word: '',
    phonetic: '',
    phonetics: [],
    meanings: [createEmptyMeaning()],
    tags: [],
    createdAt: now,
    updatedAt: now,
    nextReviewAt: now,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 1,
    quality: 0,
  };
}

export function AddWord() {
  const { addWord } = useApp();
  const [searchWord, setSearchWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedWord, setFetchedWord] = useState<Word | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);

  const editor = useWordEditor({ initialWord: fetchedWord || createEmptyWord() });
  const manualEditor = useWordEditor({ initialWord: createEmptyWord() });

  const handleSearch = useCallback(async () => {
    if (!searchWord.trim()) return;

    setIsLoading(true);
    setError('');
    setFetchedWord(null);

    try {
      const result = await fetchWord(searchWord.trim());
      if (result) {
        const newWord = createNewWord(result, []);
        setFetchedWord(newWord);
      } else {
        setError('Word not found. You can add it manually below.');
        setShowManualAdd(true);
      }
    } catch (err) {
      setError('Failed to fetch word. You can add it manually below.');
      setShowManualAdd(true);
    } finally {
      setIsLoading(false);
    }
  }, [searchWord]);

  const handleSaveFetched = useCallback(async () => {
    if (!editor.editWord.trim()) return;

    const wordToSave: Word = {
      id: fetchedWord?.id || crypto.randomUUID(),
      word: editor.editWord,
      phonetic: editor.editPhonetic,
      phonetics: fetchedWord?.phonetics || [],
      meanings: editor.editMeanings,
      tags: parseTags(editor.editTags),
      customNote: editor.editNote,
      createdAt: fetchedWord?.createdAt || Date.now(),
      updatedAt: Date.now(),
      nextReviewAt: Date.now(),
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      quality: 0,
    };

    await addWord(wordToSave);
    setFetchedWord(null);
    setSearchWord('');
    editor.resetToOriginal();
  }, [editor, fetchedWord, addWord]);

  const handleSaveManual = useCallback(async () => {
    if (!manualEditor.editWord.trim()) return;

    const wordToSave: Word = {
      id: crypto.randomUUID(),
      word: manualEditor.editWord,
      phonetic: manualEditor.editPhonetic,
      phonetics: [],
      meanings: manualEditor.editMeanings,
      tags: parseTags(manualEditor.editTags),
      customNote: manualEditor.editNote,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nextReviewAt: Date.now(),
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      quality: 0,
    };

    await addWord(wordToSave);
    manualEditor.resetToOriginal();
    setShowManualAdd(false);
  }, [manualEditor, addWord]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const isSaveDisabled = useMemo(() => {
    return !editor.editWord.trim() || editor.editMeanings.every(m => 
      m.definitions.every(d => !d.definition.trim())
    );
  }, [editor.editWord, editor.editMeanings]);

  const isManualSaveDisabled = useMemo(() => {
    return !manualEditor.editWord.trim() || manualEditor.editMeanings.every(m => 
      m.definitions.every(d => !d.definition.trim())
    );
  }, [manualEditor.editWord, manualEditor.editMeanings]);

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Add New Word</h2>
        <p className="text-gray-600 dark:text-gray-400">Search for a word or add it manually</p>
      </div>

      <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a word to search..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchWord.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-700 dark:text-yellow-400">
            {error}
          </div>
        )}
      </div>

      {fetchedWord && (
        <WordEditorForm
          word={editor.editWord}
          phonetic={editor.editPhonetic}
          meanings={editor.editMeanings}
          tags={editor.editTags}
          note={editor.editNote}
          onWordChange={editor.setEditWord}
          onPhoneticChange={editor.setEditPhonetic}
          onTagsChange={editor.setEditTags}
          onNoteChange={editor.setEditNote}
          onUpdateMeaning={editor.updateMeaning}
          onUpdateDefinition={editor.updateDefinition}
          onAddDefinition={editor.addDefinition}
          onRemoveDefinition={editor.removeDefinition}
          onAddMeaning={editor.addMeaning}
          onRemoveMeaning={editor.removeMeaning}
          onPlayAudio={() => {}}
          onCancel={() => setFetchedWord(null)}
          onSave={handleSaveFetched}
          isSaveDisabled={isSaveDisabled}
          title="Edit Word"
          subtitle="Edit word details or add to vocabulary"
        />
      )}

      {showManualAdd && (
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
            <span className="text-gray-500 dark:text-gray-400">Or add manually</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <WordEditorForm
            word={manualEditor.editWord}
            phonetic={manualEditor.editPhonetic}
            meanings={manualEditor.editMeanings}
            tags={manualEditor.editTags}
            note={manualEditor.editNote}
            onWordChange={manualEditor.setEditWord}
            onPhoneticChange={manualEditor.setEditPhonetic}
            onTagsChange={manualEditor.setEditTags}
            onNoteChange={manualEditor.setEditNote}
            onUpdateMeaning={manualEditor.updateMeaning}
            onUpdateDefinition={manualEditor.updateDefinition}
            onAddDefinition={manualEditor.addDefinition}
            onRemoveDefinition={manualEditor.removeDefinition}
            onAddMeaning={manualEditor.addMeaning}
            onRemoveMeaning={manualEditor.removeMeaning}
            onPlayAudio={() => {}}
            onCancel={() => {
              setShowManualAdd(false);
              manualEditor.resetToOriginal();
            }}
            onSave={handleSaveManual}
            isSaveDisabled={isManualSaveDisabled}
            title="Add Word Manually"
            subtitle="Enter word details manually"
          />
        </div>
      )}
    </div>
  );
}
