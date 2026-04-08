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
    nextReviewAt: now,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 1,
    quality: 0,
  };
}

export function AddWord() {
  const { addWord, words, settings } = useApp();
  const [inputWord, setInputWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedWord, setFetchedWord] = useState<Word | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);

  const manualEditor = useWordEditor({ initialWord: createEmptyWord() });
  const fetchedEditor = useWordEditor({ 
    initialWord: fetchedWord || createEmptyWord() 
  });

  const existingWords = useMemo(() => 
    new Set(words.map(w => w.word.toLowerCase())),
    [words]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputWord(value);
    if (value.trim()) {
      manualEditor.setEditWord(value.trim());
      setShowManualAdd(true);
    } else {
      setShowManualAdd(false);
      setFetchedWord(null);
    }
  }, [manualEditor]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const wordData = await fetchWord(inputWord.trim(), settings);
      const word = createNewWord(wordData);
      setFetchedWord(word);
      setShowManualAdd(false);
    } catch {
      setError('Word not found. Please check the spelling or try manual addition.');
      setShowManualAdd(true);
    } finally {
      setIsLoading(false);
    }
  }, [inputWord, settings]);

  const handleSaveFetched = useCallback(async () => {
    if (!fetchedWord) return;

    const tags = parseTags(fetchedEditor.editTags);
    const wordToSave: Word = {
      ...fetchedEditor.getEditedWord(fetchedWord),
      tags,
    };

    await addWord(wordToSave);
    setFetchedWord(null);
    setInputWord('');
  }, [fetchedWord, fetchedEditor, addWord]);

  const handleSaveManual = useCallback(async () => {
    const tags = parseTags(manualEditor.editTags);
    const newWord: Word = {
      ...manualEditor.getEditedWord(createEmptyWord()),
      tags,
    };

    await addWord(newWord);
    setShowManualAdd(false);
    setInputWord('');
    manualEditor.resetToOriginal();
  }, [manualEditor, addWord]);

  const handlePlayAudio = useCallback(() => {
    if (!fetchedWord) return;
    const audioUrl = fetchedWord.phonetics?.find(p => p.audio)?.audio;
    if (audioUrl) {
      new Audio(audioUrl).play().catch(console.error);
    }
  }, [fetchedWord]);

  const isManualSaveDisabled = !manualEditor.editWord.trim() || manualEditor.editMeanings.some(m => 
    m.definitions.some(d => !d.definition.trim())
  );

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Add New Word</h2>
        <p className="text-gray-600 dark:text-gray-400">Search for English words and add them to your vocabulary</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputWord}
            onChange={handleInputChange}
            placeholder="Enter an English word..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputWord.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </form>

      {fetchedWord && (
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">Edit Word</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">Edit word details or add to vocabulary</p>
            </div>
            {fetchedWord.phonetics?.some(p => p.audio) && (
              <button
                onClick={handlePlayAudio}
                className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
              >
                🔊
              </button>
            )}
          </div>

          {existingWords.has(fetchedWord.word.toLowerCase()) && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
              ⚠️ This word is already in your vocabulary
            </div>
          )}

          <WordEditorForm
            word={fetchedEditor.editWord}
            phonetic={fetchedEditor.editPhonetic}
            meanings={fetchedEditor.editMeanings}
            tags={fetchedEditor.editTags}
            note={fetchedEditor.editNote}
            onWordChange={fetchedEditor.setEditWord}
            onPhoneticChange={fetchedEditor.setEditPhonetic}
            onTagsChange={fetchedEditor.setEditTags}
            onNoteChange={fetchedEditor.setEditNote}
            onUpdateMeaning={fetchedEditor.updateMeaning}
            onUpdateDefinition={fetchedEditor.updateDefinition}
            onAddDefinition={fetchedEditor.addDefinition}
            onRemoveDefinition={fetchedEditor.removeDefinition}
            onAddMeaning={fetchedEditor.addMeaning}
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setFetchedWord(null);
                setInputWord('');
              }}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFetched}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Add to Vocabulary
            </button>
          </div>
        </div>
      )}

      {showManualAdd && (
        <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-6 animate-slide-up">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">Edit Word</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">Edit word details manually or click Search to get definitions</p>
            </div>
          </div>

          {existingWords.has(manualEditor.editWord.toLowerCase()) && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
              ⚠️ This word is already in your vocabulary
            </div>
          )}

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
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowManualAdd(false);
                setInputWord('');
                manualEditor.resetToOriginal();
              }}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveManual}
              disabled={isManualSaveDisabled}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Add to Vocabulary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
