'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Word, AppSettings, ReviewStats, AIContext } from '../types';
import { useAuth } from './AuthContext';
import {
  fetchWords,
  addWordAPI,
  updateWordAPI,
  deleteWordAPI,
  fetchSettings,
  saveSettingsAPI,
  fetchContexts,
  addContextAPI,
  updateContextAPI,
  deleteContextAPI,
} from '../services/apiClient';

interface AppContextType {
  words: Word[];
  contexts: AIContext[];
  settings: AppSettings;
  isLoading: boolean;
  refreshWords: () => Promise<void>;
  refreshContexts: () => Promise<void>;
  addWord: (word: Word) => Promise<void>;
  updateWord: (word: Word) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  addContext: (context: AIContext) => Promise<void>;
  updateContext: (context: AIContext) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  getStats: () => ReviewStats;
  toggleDarkMode: () => Promise<void>;
  isDarkMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [contexts, setContexts] = useState<AIContext[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  const refreshWords = useCallback(async () => {
    if (!user) return;
    try {
      const allWords = await fetchWords(user.id);
      setWords(allWords);
    } catch (error) {
      console.error('Error refreshing words:', error);
    }
  }, [user]);

  const refreshContexts = useCallback(async () => {
    if (!user) return;
    try {
      const allContexts = await fetchContexts(user.id);
      setContexts(allContexts);
    } catch (error) {
      console.error('Error refreshing contexts:', error);
    }
  }, [user]);

  const addWord = useCallback(async (word: Word) => {
    if (!user) return;
    try {
      await addWordAPI(word, user.id);
      await refreshWords();
    } catch (error) {
      console.error('Error adding word:', error);
      throw error;
    }
  }, [user, refreshWords]);

  const updateWord = useCallback(async (word: Word) => {
    if (!user) return;
    try {
      await updateWordAPI(word, user.id);
      await refreshWords();
    } catch (error) {
      console.error('Error updating word:', error);
      throw error;
    }
  }, [user, refreshWords]);

  const deleteWord = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteWordAPI(id, user.id);
      await refreshWords();
    } catch (error) {
      console.error('Error deleting word:', error);
      throw error;
    }
  }, [user, refreshWords]);

  const addContext = useCallback(async (context: AIContext) => {
    if (!user) return;
    try {
      await addContextAPI(context, user.id);
      await refreshContexts();
    } catch (error) {
      console.error('Error adding context:', error);
      throw error;
    }
  }, [user, refreshContexts]);

  const updateContext = useCallback(async (context: AIContext) => {
    if (!user) return;
    try {
      await updateContextAPI(context, user.id);
      await refreshContexts();
    } catch (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }, [user, refreshContexts]);

  const deleteContext = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteContextAPI(id, user.id);
      await refreshContexts();
    } catch (error) {
      console.error('Error deleting context:', error);
      throw error;
    }
  }, [user, refreshContexts]);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    if (!user) return;
    try {
      await saveSettingsAPI(newSettings, user.id);
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
    const now = Date.now();
    const dueToday = words.filter(w => w.nextReviewAt <= now).length;
    const mastered = words.filter(w => w.interval >= 30).length;
    const learning = words.filter(w => w.interval < 30 && w.reviewCount > 0).length;
    
    return {
      total: words.length,
      dueToday,
      mastered,
      learning,
    };
  }, [words]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        lastUserIdRef.current = null;
        return;
      }

      // 只有当用户真正变化时才重新加载数据
      if (lastUserIdRef.current === user.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        await Promise.all([refreshWords(), refreshContexts()]);
        const savedSettings = await fetchSettings(user.id);
        if (savedSettings) {
          setSettings(savedSettings);
          setIsDarkMode(savedSettings.darkMode || false);
        }
        lastUserIdRef.current = user.id;
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [isAuthenticated, user, refreshWords, refreshContexts]);

  const value = useMemo(() => ({
    words,
    contexts,
    settings,
    isLoading,
    refreshWords,
    refreshContexts,
    addWord,
    updateWord,
    deleteWord,
    addContext,
    updateContext,
    deleteContext,
    saveSettings,
    getStats,
    toggleDarkMode,
    isDarkMode,
  }), [
    words,
    contexts,
    settings,
    isLoading,
    refreshWords,
    refreshContexts,
    addWord,
    updateWord,
    deleteWord,
    addContext,
    updateContext,
    deleteContext,
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
    throw new Error('useApp must be used within an AuthProvider');
  }
  return context;
}
