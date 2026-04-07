import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Word, AppSettings, ReviewStats } from '../types';
import { db } from '../services';
import { calculateStats } from '../utils';

interface AppContextType {
  words: Word[];
  settings: AppSettings;
  isLoading: boolean;
  refreshWords: () => Promise<void>;
  addWord: (word: Word) => Promise<void>;
  updateWord: (word: Word) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  getStats: () => ReviewStats;
  toggleDarkMode: () => Promise<void>;
  isDarkMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<Word[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const refreshWords = useCallback(async () => {
    const allWords = await db.getAllWords();
    setWords(allWords);
  }, []);

  const addWord = useCallback(async (word: Word) => {
    await db.addWord(word);
    await refreshWords();
  }, [refreshWords]);

  const updateWord = useCallback(async (word: Word) => {
    await db.updateWord(word);
    await refreshWords();
  }, [refreshWords]);

  const deleteWord = useCallback(async (id: string) => {
    await db.deleteWord(id);
    await refreshWords();
  }, [refreshWords]);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    await db.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await saveSettings({ ...settings, darkMode: newDarkMode });
  }, [isDarkMode, settings, saveSettings]);

  const getStats = useCallback((): ReviewStats => {
    return calculateStats(words);
  }, [words]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    async function initDB() {
      try {
        await db.init();
        await refreshWords();
        const savedSettings = await db.getSettings();
        if (savedSettings) {
          setSettings(savedSettings);
          setIsDarkMode(savedSettings.darkMode || false);
        }
      } catch (error) {
        console.error('Error initializing DB:', error);
      } finally {
        setIsLoading(false);
      }
    }
    initDB();
  }, [refreshWords]);

  const value = useMemo(() => ({
    words,
    settings,
    isLoading,
    refreshWords,
    addWord,
    updateWord,
    deleteWord,
    saveSettings,
    getStats,
    toggleDarkMode,
    isDarkMode,
  }), [
    words,
    settings,
    isLoading,
    refreshWords,
    addWord,
    updateWord,
    deleteWord,
    saveSettings,
    getStats,
    toggleDarkMode,
    isDarkMode,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
