import { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { fetchWord } from '../services/dictionaryAPI';
import { createNewWord, parseTags } from '../utils';
import type { Word, Meaning } from '../types';

interface DefinitionInput {
  definition: string;
  example?: string;
  chineseDefinition?: string;
}

interface MeaningInput {
  partOfSpeech: string;
  definitions: DefinitionInput[];
}

function createEmptyDefinition(): DefinitionInput {
  return { definition: '' };
}

function createEmptyMeaning(): MeaningInput {
  return {
    partOfSpeech: 'unknown',
    definitions: [createEmptyDefinition()],
  };
}

function convertToWordMeaning(meaning: MeaningInput): Meaning {
  return {
    partOfSpeech: meaning.partOfSpeech,
    definitions: meaning.definitions.map(def => ({
      definition: def.definition,
      example: def.example,
      chineseDefinition: def.chineseDefinition,
      synonyms: [],
      antonyms: [],
    })),
    synonyms: [],
    antonyms: [],
  };
}

export function AddWord() {
  const { addWord, words, settings } = useApp();
  const [inputWord, setInputWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedWord, setFetchedWord] = useState<Word | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualWord, setManualWord] = useState('');
  const [manualPhonetic, setManualPhonetic] = useState('');
  const [manualMeanings, setManualMeanings] = useState<MeaningInput[]>([createEmptyMeaning()]);

  const existingWords = useMemo(() => 
    new Set(words.map(w => w.word.toLowerCase())),
    [words]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputWord(value);
    if (value.trim()) {
      setManualWord(value.trim());
      setShowManualAdd(true);
    } else {
      setShowManualAdd(false);
      setFetchedWord(null);
    }
  }, []);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const wordData = await fetchWord(inputWord.trim(), settings);
      const word = createNewWord(wordData);
      setFetchedWord(word);
      setCustomNote(word.customNote || '');
      setShowManualAdd(false);
    } catch (err: any) {
      setError('Word not found. Please check the spelling or try manual addition.');
      setShowManualAdd(true);
      setManualWord(inputWord.trim());
    } finally {
      setIsLoading(false);
    }
  }, [inputWord, settings]);

  const handleSaveFetched = useCallback(async () => {
    if (!fetchedWord) return;

    const tags = parseTags(tagsInput);
    const wordToSave: Word = {
      ...fetchedWord,
      tags,
      customNote: customNote || undefined,
    };

    await addWord(wordToSave);
    setFetchedWord(null);
    setInputWord('');
    setTagsInput('');
    setCustomNote('');
  }, [fetchedWord, tagsInput, customNote, addWord]);

  const handleSaveManual = useCallback(async () => {
    if (!manualWord.trim()) return;

    const tags = parseTags(tagsInput);
    const newWord: Word = {
      id: crypto.randomUUID(),
      word: manualWord.trim(),
      phonetic: manualPhonetic || undefined,
      phonetics: [],
      meanings: manualMeanings.map(convertToWordMeaning),
      tags,
      createdAt: Date.now(),
      nextReviewAt: Date.now(),
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 1,
      quality: 0,
      customNote: customNote || undefined,
    };

    await addWord(newWord);
    setShowManualAdd(false);
    setInputWord('');
    setManualWord('');
    setManualPhonetic('');
    setManualMeanings([createEmptyMeaning()]);
    setTagsInput('');
    setCustomNote('');
    setError('');
  }, [manualWord, manualPhonetic, manualMeanings, tagsInput, customNote, addWord]);

  const addMeaningField = useCallback(() => {
    setManualMeanings(prev => [...prev, createEmptyMeaning()]);
  }, []);

  const removeMeaningField = useCallback((index: number) => {
    setManualMeanings(prev => 
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  }, []);

  const addDefinitionField = useCallback((meaningIndex: number) => {
    setManualMeanings(prev =>
      prev.map((meaning, i) =>
        i === meaningIndex
          ? { ...meaning, definitions: [...meaning.definitions, createEmptyDefinition()] }
          : meaning
      )
    );
  }, []);

  const removeDefinitionField = useCallback((meaningIndex: number, defIndex: number) => {
    setManualMeanings(prev =>
      prev.map((meaning, i) =>
        i === meaningIndex && meaning.definitions.length > 1
          ? { ...meaning, definitions: meaning.definitions.filter((_, j) => j !== defIndex) }
          : meaning
      )
    );
  }, []);

  const updateMeaning = useCallback((index: number, field: keyof MeaningInput, value: string) => {
    setManualMeanings(prev =>
      prev.map((meaning, i) => (i === index ? { ...meaning, [field]: value } : meaning))
    );
  }, []);

  const updateDefinition = useCallback(
    (meaningIndex: number, defIndex: number, field: keyof DefinitionInput, value: string) => {
      setManualMeanings(prev =>
        prev.map((meaning, i) =>
          i === meaningIndex
            ? {
                ...meaning,
                definitions: meaning.definitions.map((def, j) =>
                  j === defIndex ? { ...def, [field]: value } : def
                ),
              }
            : meaning
        )
      );
    },
    []
  );

  const handlePlayAudio = useCallback(() => {
    if (!fetchedWord) return;
    const audioUrl = fetchedWord.phonetics?.find(p => p.audio)?.audio;
    if (audioUrl) {
      new Audio(audioUrl).play().catch(console.error);
    }
  }, [fetchedWord]);

  const updateFetchedWordMeaning = useCallback((meaningIdx: number, field: 'partOfSpeech', value: string) => {
    setFetchedWord(prev => {
      if (!prev) return prev;
      const updatedMeanings = [...prev.meanings];
      updatedMeanings[meaningIdx] = { ...updatedMeanings[meaningIdx], [field]: value };
      return { ...prev, meanings: updatedMeanings };
    });
  }, []);

  const updateFetchedWordDefinition = useCallback(
    (meaningIdx: number, defIdx: number, field: 'definition' | 'example' | 'chineseDefinition', value: string) => {
      setFetchedWord(prev => {
        if (!prev) return prev;
        const updatedMeanings = [...prev.meanings];
        updatedMeanings[meaningIdx] = {
          ...updatedMeanings[meaningIdx],
          definitions: updatedMeanings[meaningIdx].definitions.map((def, i) =>
            i === defIdx ? { ...def, [field]: value } : def
          ),
        };
        return { ...prev, meanings: updatedMeanings };
      });
    },
    []
  );

  const addFetchedWordDefinition = useCallback((meaningIdx: number) => {
    setFetchedWord(prev => {
      if (!prev) return prev;
      const updatedMeanings = [...prev.meanings];
      updatedMeanings[meaningIdx].definitions.push({
        definition: '',
        example: '',
        chineseDefinition: '',
        synonyms: [],
        antonyms: [],
      });
      return { ...prev, meanings: updatedMeanings };
    });
  }, []);

  const removeFetchedWordDefinition = useCallback((meaningIdx: number, defIdx: number) => {
    setFetchedWord(prev => {
      if (!prev) return prev;
      const updatedMeanings = [...prev.meanings];
      if (updatedMeanings[meaningIdx].definitions.length > 1) {
        updatedMeanings[meaningIdx].definitions = updatedMeanings[meaningIdx].definitions.filter(
          (_, i) => i !== defIdx
        );
      }
      return { ...prev, meanings: updatedMeanings };
    });
  }, []);

  const addFetchedWordMeaning = useCallback(() => {
    setFetchedWord(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        meanings: [
          ...prev.meanings,
          {
            partOfSpeech: 'unknown',
            definitions: [{ definition: '', example: '', chineseDefinition: '', synonyms: [], antonyms: [] }],
            synonyms: [],
            antonyms: [],
          },
        ],
      };
    });
  }, []);

  const isManualSaveDisabled = !manualWord.trim() || manualMeanings.some(m => 
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
        <FetchedWordEditor
          word={fetchedWord}
          tagsInput={tagsInput}
          customNote={customNote}
          existingWords={existingWords}
          onTagsChange={setTagsInput}
          onCustomNoteChange={setCustomNote}
          onWordChange={(word) => setFetchedWord(prev => prev ? { ...prev, word } : prev)}
          onPhoneticChange={(phonetic) => setFetchedWord(prev => prev ? { ...prev, phonetic } : prev)}
          onUpdateMeaning={updateFetchedWordMeaning}
          onUpdateDefinition={updateFetchedWordDefinition}
          onAddDefinition={addFetchedWordDefinition}
          onRemoveDefinition={removeFetchedWordDefinition}
          onAddMeaning={addFetchedWordMeaning}
          onPlayAudio={handlePlayAudio}
          onCancel={() => setFetchedWord(null)}
          onSave={handleSaveFetched}
        />
      )}

      {showManualAdd && (
        <ManualWordEditor
          word={manualWord}
          phonetic={manualPhonetic}
          meanings={manualMeanings}
          tagsInput={tagsInput}
          customNote={customNote}
          existingWords={existingWords}
          onWordChange={setManualWord}
          onPhoneticChange={setManualPhonetic}
          onMeaningsChange={setManualMeanings}
          onTagsChange={setTagsInput}
          onCustomNoteChange={setCustomNote}
          onUpdateMeaning={updateMeaning}
          onUpdateDefinition={updateDefinition}
          onAddDefinition={addDefinitionField}
          onRemoveDefinition={removeDefinitionField}
          onAddMeaning={addMeaningField}
          onRemoveMeaning={removeMeaningField}
          onCancel={() => {
            setShowManualAdd(false);
            setManualWord('');
            setManualPhonetic('');
            setManualMeanings([createEmptyMeaning()]);
            setTagsInput('');
            setCustomNote('');
            setError('');
          }}
          onSave={handleSaveManual}
          isSaveDisabled={isManualSaveDisabled}
        />
      )}
    </div>
  );
}

interface FetchedWordEditorProps {
  word: Word;
  tagsInput: string;
  customNote: string;
  existingWords: Set<string>;
  onTagsChange: (tags: string) => void;
  onCustomNoteChange: (note: string) => void;
  onWordChange: (word: string) => void;
  onPhoneticChange: (phonetic: string) => void;
  onUpdateMeaning: (idx: number, field: 'partOfSpeech', value: string) => void;
  onUpdateDefinition: (meaningIdx: number, defIdx: number, field: 'definition' | 'example' | 'chineseDefinition', value: string) => void;
  onAddDefinition: (meaningIdx: number) => void;
  onRemoveDefinition: (meaningIdx: number, defIdx: number) => void;
  onAddMeaning: () => void;
  onPlayAudio: () => void;
  onCancel: () => void;
  onSave: () => void;
}

function FetchedWordEditor({
  word,
  tagsInput,
  customNote,
  existingWords,
  onTagsChange,
  onCustomNoteChange,
  onWordChange,
  onPhoneticChange,
  onUpdateMeaning,
  onUpdateDefinition,
  onAddDefinition,
  onRemoveDefinition,
  onAddMeaning,
  onPlayAudio,
  onCancel,
  onSave,
}: FetchedWordEditorProps) {
  return (
    <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div className="flex-1">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-1">Edit Word</h3>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">Edit word details or add to vocabulary</p>
        </div>
        {word.phonetics?.some(p => p.audio) && (
          <button
            onClick={onPlayAudio}
            className="ml-2 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors flex-shrink-0"
          >
            🔊
          </button>
        )}
      </div>

      {existingWords.has(word.word.toLowerCase()) && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
          ⚠️ This word is already in your vocabulary
        </div>
      )}

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Word</label>
        <input
          type="text"
          value={word.word}
          onChange={(e) => onWordChange(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phonetic (optional)</label>
        <input
          type="text"
          value={word.phonetic || ''}
          onChange={(e) => onPhoneticChange(e.target.value)}
          placeholder="e.g., /ˈæp.əl/"
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meanings</label>
        {word.meanings.map((meaning, idx) => (
          <div key={idx} className="mb-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Part of Speech</label>
                <input
                  type="text"
                  value={meaning.partOfSpeech}
                  onChange={(e) => onUpdateMeaning(idx, 'partOfSpeech', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => onAddDefinition(idx)}
                className="w-full sm:w-auto sm:ml-3 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors flex items-center justify-center"
              >
                + Add Definition
              </button>
            </div>
            {meaning.definitions.map((def, defIdx) => (
              <div key={defIdx} className="mb-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Definition {defIdx + 1}
                  </label>
                  {meaning.definitions.length > 1 && (
                    <button
                      onClick={() => onRemoveDefinition(idx, defIdx)}
                      className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  value={def.definition}
                  onChange={(e) => onUpdateDefinition(idx, defIdx, 'definition', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chinese Definition</label>
                  <input
                    type="text"
                    value={def.chineseDefinition || ''}
                    onChange={(e) => onUpdateDefinition(idx, defIdx, 'chineseDefinition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Example (optional)</label>
                  <input
                    type="text"
                    value={def.example || ''}
                    onChange={(e) => onUpdateDefinition(idx, defIdx, 'example', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={onAddMeaning}
          className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          + Add Part of Speech
        </button>
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="e.g., TOEFL, business, important"
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Note</label>
        <textarea
          value={customNote}
          onChange={(e) => onCustomNoteChange(e.target.value)}
          placeholder="Add your own notes about this word..."
          rows={3}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Add to Vocabulary
        </button>
      </div>
    </div>
  );
}

interface ManualWordEditorProps {
  word: string;
  phonetic: string;
  meanings: MeaningInput[];
  tagsInput: string;
  customNote: string;
  existingWords: Set<string>;
  onWordChange: (word: string) => void;
  onPhoneticChange: (phonetic: string) => void;
  onMeaningsChange: (meanings: MeaningInput[]) => void;
  onTagsChange: (tags: string) => void;
  onCustomNoteChange: (note: string) => void;
  onUpdateMeaning: (index: number, field: keyof MeaningInput, value: string) => void;
  onUpdateDefinition: (meaningIndex: number, defIndex: number, field: keyof DefinitionInput, value: string) => void;
  onAddDefinition: (meaningIndex: number) => void;
  onRemoveDefinition: (meaningIndex: number, defIndex: number) => void;
  onAddMeaning: () => void;
  onRemoveMeaning: (index: number) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
}

function ManualWordEditor({
  word,
  phonetic,
  meanings,
  tagsInput,
  customNote,
  existingWords,
  onWordChange,
  onPhoneticChange,
  onTagsChange,
  onCustomNoteChange,
  onUpdateMeaning,
  onUpdateDefinition,
  onAddDefinition,
  onRemoveDefinition,
  onAddMeaning,
  onRemoveMeaning,
  onCancel,
  onSave,
  isSaveDisabled,
}: ManualWordEditorProps) {
  return (
    <div className="bg-white dark:bg-gray-900 dark:border-gray-800 rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div className="flex-1">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-1">Edit Word</h3>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">Edit word details manually or click Search to get definitions</p>
        </div>
      </div>

      {existingWords.has(word.toLowerCase()) && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
          ⚠️ This word is already in your vocabulary
        </div>
      )}

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Word</label>
        <input
          type="text"
          value={word}
          onChange={(e) => onWordChange(e.target.value)}
          placeholder="Enter the word"
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phonetic (optional)</label>
        <input
          type="text"
          value={phonetic}
          onChange={(e) => onPhoneticChange(e.target.value)}
          placeholder="e.g., /ˈæp.əl/"
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meanings</label>
        {meanings.map((meaning, meaningIndex) => (
          <div key={meaningIndex} className="mb-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Part of Speech</label>
                <input
                  type="text"
                  value={meaning.partOfSpeech}
                  onChange={(e) => onUpdateMeaning(meaningIndex, 'partOfSpeech', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {meanings.length > 1 && (
                <button
                  onClick={() => onRemoveMeaning(meaningIndex)}
                  className="w-full sm:w-auto sm:ml-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            {meaning.definitions.map((def, defIndex) => (
              <div key={defIndex} className="mb-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Definition {defIndex + 1}
                  </label>
                  {meaning.definitions.length > 1 && (
                    <button
                      onClick={() => onRemoveDefinition(meaningIndex, defIndex)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  value={def.definition}
                  onChange={(e) => onUpdateDefinition(meaningIndex, defIndex, 'definition', e.target.value)}
                  placeholder="Enter the definition"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chinese Definition (optional)</label>
                  <input
                    type="text"
                    value={def.chineseDefinition || ''}
                    onChange={(e) => onUpdateDefinition(meaningIndex, defIndex, 'chineseDefinition', e.target.value)}
                    placeholder="Enter the Chinese definition"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Example (optional)</label>
                  <input
                    type="text"
                    value={def.example || ''}
                    onChange={(e) => onUpdateDefinition(meaningIndex, defIndex, 'example', e.target.value)}
                    placeholder="Enter an example sentence"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => onAddDefinition(meaningIndex)}
              className="w-full px-3 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              + Add Definition
            </button>
          </div>
        ))}
        <button
          onClick={onAddMeaning}
          className="w-full px-4 py-2 sm:py-3 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          + Add Part of Speech
        </button>
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="e.g., TOEFL, business, important"
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Note</label>
        <textarea
          value={customNote}
          onChange={(e) => onCustomNoteChange(e.target.value)}
          placeholder="Add your own notes about this word..."
          rows={3}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaveDisabled}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Add to Vocabulary
        </button>
      </div>
    </div>
  );
}
