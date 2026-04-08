'use client';

import { useState, useCallback } from 'react';
import type { Word, Meaning } from '../types';

interface UseWordEditorOptions {
  initialWord: Word;
}

export function useWordEditor({ initialWord }: UseWordEditorOptions) {
  const [editWord, setEditWord] = useState(initialWord.word);
  const [editPhonetic, setEditPhonetic] = useState(initialWord.phonetic || '');
  const [editMeanings, setEditMeanings] = useState<Meaning[]>(
    initialWord.meanings.map(m => ({
      ...m,
      definitions: m.definitions.map(d => ({ ...d })),
    }))
  );
  const [editTags, setEditTags] = useState(initialWord.tags.join(', '));
  const [editNote, setEditNote] = useState(initialWord.customNote || '');

  const updateMeaning = useCallback((meaningIdx: number, field: 'partOfSpeech', value: string) => {
    setEditMeanings(prev =>
      prev.map((meaning, idx) => (idx === meaningIdx ? { ...meaning, [field]: value } : meaning))
    );
  }, []);

  const updateDefinition = useCallback(
    (meaningIdx: number, defIdx: number, field: 'definition' | 'example' | 'chineseDefinition', value: string) => {
      setEditMeanings(prev =>
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
    setEditMeanings(prev =>
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
    setEditMeanings(prev =>
      prev.map((meaning, mIdx) =>
        mIdx === meaningIdx && meaning.definitions.length > 1
          ? { ...meaning, definitions: meaning.definitions.filter((_, dIdx) => dIdx !== defIdx) }
          : meaning
      )
    );
  }, []);

  const addMeaning = useCallback(() => {
    setEditMeanings(prev => [
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
    setEditMeanings(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== meaningIdx) : prev));
  }, []);

  const getEditedWord = useCallback((originalWord: Word): Word => {
    return {
      ...originalWord,
      word: editWord,
      phonetic: editPhonetic || undefined,
      meanings: editMeanings,
      customNote: editNote || undefined,
    };
  }, [editWord, editPhonetic, editMeanings, editNote]);

  const resetToOriginal = useCallback(() => {
    setEditWord(initialWord.word);
    setEditPhonetic(initialWord.phonetic || '');
    setEditMeanings(
      initialWord.meanings.map(m => ({
        ...m,
        definitions: m.definitions.map(d => ({ ...d })),
      }))
    );
    setEditTags(initialWord.tags.join(', '));
    setEditNote(initialWord.customNote || '');
  }, [initialWord]);

  return {
    editWord,
    editPhonetic,
    editMeanings,
    editTags,
    editNote,
    setEditWord,
    setEditPhonetic,
    setEditMeanings,
    setEditTags,
    setEditNote,
    updateMeaning,
    updateDefinition,
    addDefinition,
    removeDefinition,
    addMeaning,
    removeMeaning,
    getEditedWord,
    resetToOriginal,
  };
}
