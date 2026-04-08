'use client';

import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export function Settings() {
  const { settings, saveSettings, words, addWord } = useApp();
  const [maxDailyReviews, setMaxDailyReviews] = useState(settings.maxDailyReviews || 50);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        ...settings,
        maxDailyReviews,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [maxDailyReviews, settings, saveSettings]);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(words, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocab-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [words]);

  const handleImport = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedWords = JSON.parse(e.target?.result as string);
        for (const word of importedWords) {
          await addWord(word);
        }
        window.location.reload();
      } catch (err) {
        alert('Failed to import file. Please check the JSON format.');
      }
    };
    reader.readAsText(file);
  }, [addWord]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-3">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg">Configure your preferences and manage data</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Review Settings</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Maximum Daily Reviews
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={maxDailyReviews}
              onChange={(e) => setMaxDailyReviews(parseInt(e.target.value) || 50)}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Maximum number of words to review per day
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-6 p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/50 rounded-2xl text-accent-600 dark:text-accent-400 text-sm flex items-center gap-2">
              <span>✓</span>
              Settings saved successfully!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-2xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-soft hover:shadow-medium active:scale-[0.98]"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </span>
            ) : 'Save Settings'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Data Management</h3>
          
          <div className="space-y-4">
            <div>
              <button
                onClick={handleExport}
                className="w-full py-4 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-soft"
              >
                Export Data (JSON)
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Import Data
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-medium border border-slate-200/50 dark:border-slate-700/50 p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">About</h3>
          <div className="text-slate-600 dark:text-slate-400 space-y-3">
            <p className="flex items-center gap-2">
              <span>📖</span>
              <span className="font-medium">VocabMaster - Your Personal Vocabulary Book</span>
            </p>
            <p>All data is securely stored in the cloud using Supabase.</p>
            <p>Your data is synchronized across devices and never lost.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
