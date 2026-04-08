import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Word, AppSettings, ReviewStats } from '../types';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from './AuthContext';
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
  const { user, isAuthenticated } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const refreshWords = useCallback(async () => {
    if (!user) return;
    try {
      const allWords = await supabaseService.getAllWords(user.id);
      setWords(allWords);
    } catch (error) {
      console.error('Error refreshing words:', error);
    }
  }, [user]);

  const addWord = useCallback(async (word: Word) => {
    if (!user) return;
    try {
      await supabaseService.addWord(word, user.id);
      await refreshWords();
    } catch (error) {
      console.error('Error adding word:', error);
      throw error;
    }
  }, [user, refreshWords]);

  const updateWord = useCallback(async (word: Word) => {
    if (!user) return;
    try {
      await supabaseService.updateWord(word, user.id);
      await refreshWords();
    } catch (error) {
      console.error('Error updating word:', error);
      throw error;
    }
  }, [user, refreshWords]);

  const deleteWord = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await supabaseService.deleteWord(id, user.id);
      await refreshWords();
    } catch (error) {
      console.error('Error deleting word:', error);
      throw error;
    }
  }, [user, refreshWords]);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    if (!user) return;
    try {
      await supabaseService.saveSettings(newSettings, user.id);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }, [user]);

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
    async function loadData() {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        await refreshWords();
        const savedSettings = await supabaseService.getSettings(user.id);
        if (savedSettings) {
          setSettings(savedSettings);
          setIsDarkMode(savedSettings.darkMode || false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isAuthenticated, user, refreshWords]);

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
