'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { WordEditorForm } from './WordEditorForm';
import { generateContent } from '../services/apiClient';
import { parseTags } from '../utils/formatters';
import type { Word, Meaning } from '../types';

const emptyWord: Word = {
  id: '',
  word: '',
  phonetics: [],
  meanings: [
    {
      partOfSpeech: 'noun',
      definitions: [{ definition: '', example: '', synonyms: [], antonyms: [] }],
      synonyms: [],
      antonyms: [],
    },
  ],
  tags: [],
  interval: 1,
  easeFactor: 2.5,
  reviewCount: 0,
  nextReviewAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  quality: 0,
};

export function AddWord() {
  const { addWord } = useApp();
  const [currentWord, setCurrentWord] = useState<Word>({ ...emptyWord, id: crypto.randomUUID() });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [editWord, setEditWord] = useState('');
  const [editPhonetic, setEditPhonetic] = useState('');
  const [editMeanings, setEditMeanings] = useState<Meaning[]>(emptyWord.meanings);
  const [editTags, setEditTags] = useState('');
  const [editNote, setEditNote] = useState('');

  const handleGetDefinitions = useCallback(async () => {
    if (!editWord.trim()) return;

    setIsLoadingDefinition(true);
    setError('');

    try {
      const prompt = `Provide a detailed dictionary definition for the word "${editWord}" in JSON format with the following structure:
{
  "word": "${editWord}",
  "phonetic": "/phonetic/",
  "meanings": [
    {
      "partOfSpeech": "noun|verb|adjective|adverb|etc",
      "definitions": [
        {
          "definition": "clear English definition",
          "example": "example sentence",
          "chineseDefinition": "中文释义"
        }
      ]
    }
  ]
}
Include at least 2 meanings with different parts of speech if applicable.`;

      const content = await generateContent(prompt);

      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const wordData = JSON.parse(jsonMatch[0]);

        setEditPhonetic(wordData.phonetic || '');
        setEditMeanings(
          wordData.meanings.map((m: any) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions.map((d: any) => ({
              definition: d.definition,
              example: d.example || '',
              chineseDefinition: d.chineseDefinition,
              synonyms: [],
              antonyms: [],
            })),
            synonyms: [],
            antonyms: [],
          }))
        );
      } else {
        setError('Failed to parse word definition');
      }
    } catch (err: any) {
      console.error('Error fetching definition:', err);
      setError('Failed to fetch definition: ' + err.message);
    } finally {
      setIsLoadingDefinition(false);
    }
  }, [editWord]);

  const handleSubmit = useCallback(async () => {
    if (!editWord.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const newWord: Word = {
        ...currentWord,
        word: editWord.trim(),
        phonetic: editPhonetic || undefined,
        meanings: editMeanings,
        tags: parseTags(editTags),
        customNote: editNote || undefined,
      };

      await addWord(newWord);
      setSuccess(true);

      // Reset form
      setCurrentWord({ ...emptyWord, id: crypto.randomUUID() });
      setEditWord('');
      setEditPhonetic('');
      setEditMeanings(emptyWord.meanings);
      setEditTags('');
      setEditNote('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error adding word:', err);
      setError('Failed to add word: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentWord, editWord, editPhonetic, editMeanings, editTags, editNote, addWord]);

  const updateMeaning = useCallback((meaningIdx: number, field: 'partOfSpeech', value: string) => {
    setEditMeanings((prev) =>
      prev.map((meaning, idx) => (idx === meaningIdx ? { ...meaning, [field]: value } : meaning))
    );
  }, []);

  const updateDefinition = useCallback(
    (meaningIdx: number, defIdx: number, field: 'definition' | 'example' | 'chineseDefinition', value: string) => {
      setEditMeanings((prev) =>
        prev.map((meaning, mIdx) =>
          mIdx === meaningIdx
            ? {
                ...meaning,
                definitions: meaning.definitions.map((def, dIdx) =>
                  dIdx === defIdx ? { ...def, [field]: value } : def
                ),
              }
            : meaning
        )
      );
    },
    []
  );

  const addDefinition = useCallback((meaningIdx: number) => {
    setEditMeanings((prev) =>
      prev.map((meaning, idx) =>
        idx === meaningIdx
          ? {
              ...meaning,
              definitions: [...meaning.definitions, { definition: '', example: '', synonyms: [], antonyms: [] }],
            }
          : meaning
      )
    );
  }, []);

  const removeDefinition = useCallback((meaningIdx: number, defIdx: number) => {
    setEditMeanings((prev) =>
      prev.map((meaning, mIdx) =>
        mIdx === meaningIdx && meaning.definitions.length > 1
          ? { ...meaning, definitions: meaning.definitions.filter((_, dIdx) => dIdx !== defIdx) }
          : meaning
      )
    );
  }, []);

  const addMeaning = useCallback(() => {
    setEditMeanings((prev) => [
      ...prev,
      {
        partOfSpeech: 'unknown',
        definitions: [{ definition: '', example: '', synonyms: [], antonyms: [] }],
        synonyms: [],
        antonyms: [],
      },
    ]);
  }, []);

  const removeMeaning = useCallback((meaningIdx: number) => {
    setEditMeanings((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== meaningIdx) : prev));
  }, []);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400">
          Word added successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <WordEditorForm
        word={editWord}
        phonetic={editPhonetic}
        meanings={editMeanings}
        tags={editTags}
        note={editNote}
        onWordChange={setEditWord}
        onPhoneticChange={setEditPhonetic}
        onTagsChange={setEditTags}
        onNoteChange={setEditNote}
        onUpdateMeaning={updateMeaning}
        onUpdateDefinition={updateDefinition}
        onAddDefinition={addDefinition}
        onRemoveDefinition={removeDefinition}
        onAddMeaning={addMeaning}
        onRemoveMeaning={removeMeaning}
        showGetDefinitions
        onGetDefinitions={handleGetDefinitions}
        isLoading={isLoadingDefinition}
        error={error}
        onCancel={() => {
          setEditWord('');
          setEditPhonetic('');
          setEditMeanings(emptyWord.meanings);
          setEditTags('');
          setEditNote('');
        }}
        onSave={handleSubmit}
        isSaveDisabled={isSubmitting || !editWord.trim()}
        title="Add New Word"
        subtitle="Enter a word and get its definition"
      />
    </div>
  );
}
