import { useState } from 'react';
import { fetchWord } from '../lib/dictionaryAPI';
import { createNewWord } from '../lib/spacedRepetition';
import { useApp } from '../context/AppContext';

interface Word {
  id: string;
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
      chineseDefinition?: string;
    }>;
    synonyms: string[];
    antonyms: string[];
  }>;
  tags: string[];
  createdAt: number;
  nextReviewAt: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  quality: number;
  customNote?: string;
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
  const [manualDefinitions, setManualDefinitions] = useState<Array<{ definition: string; example?: string; chineseDefinition?: string }>>([{ definition: '' }]);

  const existingWords = new Set(words.map(w => w.word.toLowerCase()));

  // 输入单词时立即显示编辑界面
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInputWord(value);
    if (value.trim()) {
      setManualWord(value.trim());
      setShowManualAdd(true);
    } else {
      setShowManualAdd(false);
      setFetchedWord(null);
    }
  }

  async function handleSearch(e: React.FormEvent) {
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
  }

  async function handleSave() {
    if (!fetchedWord) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

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
  }

  async function handleManualSave() {
    if (!manualWord.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Create a new word with manual data
    const newWord: Word = {
      id: crypto.randomUUID(),
      word: manualWord.trim(),
      phonetic: manualPhonetic || undefined,
      phonetics: [],
      meanings: [{
        partOfSpeech: 'unknown',
        definitions: manualDefinitions.map(def => ({
          definition: def.definition,
          example: def.example,
          chineseDefinition: def.chineseDefinition || undefined,
          synonyms: [],
          antonyms: [],
        })),
        synonyms: [],
        antonyms: [],
      }],
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
    setManualDefinitions([{ definition: '' }]);
    setTagsInput('');
    setCustomNote('');
    setError('');
  }

  function addDefinitionField() {
    setManualDefinitions([...manualDefinitions, { definition: '' }]);
  }

  function removeDefinitionField(index: number) {
    if (manualDefinitions.length > 1) {
      setManualDefinitions(manualDefinitions.filter((_, i) => i !== index));
    }
  }

  function updateDefinition(index: number, field: 'definition' | 'example' | 'chineseDefinition', value: string) {
    setManualDefinitions(manualDefinitions.map((def, i) => {
      if (i === index) {
        return { ...def, [field]: value };
      }
      return def;
    }));
  }

  function playAudio() {
    if (!fetchedWord) return;
    const audioUrl = fetchedWord.phonetics?.find(p => p.audio)?.audio;
    if (audioUrl) {
      new Audio(audioUrl).play();
    }
  }

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
                  onClick={playAudio}
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

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Word
              </label>
              <input
                type="text"
                value={fetchedWord.word}
                onChange={(e) => setFetchedWord({ ...fetchedWord, word: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phonetic (optional)
              </label>
              <input
                type="text"
                value={fetchedWord.phonetic || ''}
                onChange={(e) => setFetchedWord({ ...fetchedWord, phonetic: e.target.value })}
                placeholder="e.g., /ˈæp.əl/"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meanings
              </label>
              {fetchedWord.meanings.map((meaning, idx) => (
                <div key={idx} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Part of Speech
                      </label>
                      <input
                        type="text"
                        value={meaning.partOfSpeech}
                        onChange={(e) => {
                          const updatedMeanings = [...fetchedWord.meanings];
                          updatedMeanings[idx] = { ...updatedMeanings[idx], partOfSpeech: e.target.value };
                          setFetchedWord({ ...fetchedWord, meanings: updatedMeanings });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updatedMeanings = [...fetchedWord.meanings];
                        updatedMeanings[idx].definitions.push({
                          definition: '',
                          example: '',
                          chineseDefinition: '',
                          synonyms: [],
                          antonyms: []
                        });
                        setFetchedWord({ ...fetchedWord, meanings: updatedMeanings });
                      }}
                      className="ml-3 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors flex items-center"
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
                            onClick={() => {
                              const updatedMeanings = [...fetchedWord.meanings];
                              updatedMeanings[idx].definitions = updatedMeanings[idx].definitions.filter((_, i) => i !== defIdx);
                              setFetchedWord({ ...fetchedWord, meanings: updatedMeanings });
                            }}
                            className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        value={def.definition}
                        onChange={(e) => {
                          const updatedMeanings = [...fetchedWord.meanings];
                          updatedMeanings[idx].definitions[defIdx] = {
                            ...updatedMeanings[idx].definitions[defIdx],
                            definition: e.target.value
                          };
                          setFetchedWord({ ...fetchedWord, meanings: updatedMeanings });
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Chinese Definition
                        </label>
                        <input
                          type="text"
                          value={def.chineseDefinition || ''}
                          onChange={(e) => {
                            const updatedMeanings = [...fetchedWord.meanings];
                            updatedMeanings[idx].definitions[defIdx] = {
                              ...updatedMeanings[idx].definitions[defIdx],
                              chineseDefinition: e.target.value
                            };
                            setFetchedWord({ ...fetchedWord, meanings: updatedMeanings });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Example (optional)
                        </label>
                        <input
                          type="text"
                          value={def.example || ''}
                          onChange={(e) => {
                            const updatedMeanings = [...fetchedWord.meanings];
                            updatedMeanings[idx].definitions[defIdx] = {
                              ...updatedMeanings[idx].definitions[defIdx],
                              example: e.target.value
                            };
                            setFetchedWord({ ...fetchedWord, meanings: updatedMeanings });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <button
                onClick={() => {
                  setFetchedWord({
                    ...fetchedWord,
                    meanings: [
                      ...fetchedWord.meanings,
                      {
                        partOfSpeech: 'unknown',
                        definitions: [{
                          definition: '',
                          example: '',
                          chineseDefinition: '',
                          synonyms: [],
                          antonyms: []
                        }],
                        synonyms: [],
                        antonyms: []
                      }
                    ]
                  });
                }}
                className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                + Add Part of Speech
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., TOEFL, business, important"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Note
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Add your own notes about this word..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setFetchedWord(null)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
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

            {existingWords.has(manualWord.toLowerCase()) && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
                ⚠️ This word is already in your vocabulary
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Word
              </label>
              <input
                type="text"
                value={manualWord}
                onChange={(e) => setManualWord(e.target.value)}
                placeholder="Enter the word"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phonetic (optional)
              </label>
              <input
                type="text"
                value={manualPhonetic}
                onChange={(e) => setManualPhonetic(e.target.value)}
                placeholder="e.g., /ˈæp.əl/"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Definitions
              </label>
              {manualDefinitions.map((def, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Definition {index + 1}
                    </label>
                    <textarea
                      value={def.definition}
                      onChange={(e) => updateDefinition(index, 'definition', e.target.value)}
                      placeholder="Enter the definition"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Example (optional)
                    </label>
                    <input
                      type="text"
                      value={def.example || ''}
                      onChange={(e) => updateDefinition(index, 'example', e.target.value)}
                      placeholder="Enter an example sentence"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Chinese Definition (optional)
                    </label>
                    <input
                      type="text"
                      value={def.chineseDefinition || ''}
                      onChange={(e) => updateDefinition(index, 'chineseDefinition', e.target.value)}
                      placeholder="Enter the Chinese definition"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    {manualDefinitions.length > 1 && (
                      <button
                        onClick={() => removeDefinitionField(index)}
                        className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addDefinitionField}
                className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                + Add Definition
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., TOEFL, business, important"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Note
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Add your own notes about this word..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowManualAdd(false);
                  setManualWord('');
                  setManualPhonetic('');
                  setManualDefinitions([{ definition: '' }]);
                  setTagsInput('');
                  setCustomNote('');
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 dark:bg-gray-900 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSave}
                disabled={!manualWord.trim() || manualDefinitions.some(def => !def.definition.trim())}
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
