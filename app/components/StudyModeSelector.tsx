'use client';

import { useState } from 'react';
import type { StudyMode } from '../types';

interface StudyModeSelectorProps {
  currentMode: StudyMode;
  onChange: (mode: StudyMode) => void;
}

const modes: { value: StudyMode; label: string; description: string; icon: string }[] = [
  {
    value: 'book-only',
    label: '只学当前书',
    description: '仅复习主学单词书中的单词',
    icon: '📖'
  },
  {
    value: 'book-priority',
    label: '优先当前书',
    description: '优先复习主学单词书，不足时从其他来源补充',
    icon: '📚'
  },
  {
    value: 'mixed',
    label: '全部混合',
    description: '从所有单词统一抽取复习',
    icon: '🔄'
  }
];

export function StudyModeSelector({ currentMode, onChange }: StudyModeSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedMode, setSavedMode] = useState<StudyMode | null>(null);

  const handleChange = async (mode: StudyMode) => {
    if (mode === currentMode) return;
    
    setIsSaving(true);
    try {
      await onChange(mode);
      setSavedMode(mode);
      // 2秒后清除保存成功提示
      setTimeout(() => setSavedMode(null), 2000);
    } catch (error) {
      console.error('Failed to save study mode:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">学习模式:</span>
        <div className="relative">
          <select
            value={currentMode}
            onChange={(e) => handleChange(e.target.value as StudyMode)}
            disabled={isSaving}
            className="px-3 py-1.5 pr-8 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {modes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.icon} {mode.label}
              </option>
            ))}
          </select>
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        {savedMode && (
          <span className="text-xs text-green-600 dark:text-green-400 animate-fade-in">
            ✓ 已保存
          </span>
        )}
      </div>
      
      {/* 当前模式说明 */}
      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {modes.find(m => m.value === currentMode)?.icon} {modes.find(m => m.value === currentMode)?.label}:
        </span>{' '}
        {modes.find(m => m.value === currentMode)?.description}
      </div>
    </div>
  );
}
