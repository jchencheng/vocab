'use client';

import type { StudyMode } from '../types';

interface StudyModeSelectorProps {
  currentMode: StudyMode;
  onChange: (mode: StudyMode) => void;
}

const modes: { value: StudyMode; label: string; description: string }[] = [
  {
    value: 'book-only',
    label: '只学当前书',
    description: '仅复习主学单词书中的单词'
  },
  {
    value: 'book-priority',
    label: '优先当前书',
    description: '优先复习主学单词书，不足时从其他来源补充'
  },
  {
    value: 'mixed',
    label: '全部混合',
    description: '从所有单词统一抽取复习'
  }
];

export function StudyModeSelector({ currentMode, onChange }: StudyModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600 dark:text-slate-400">学习模式:</span>
      <select
        value={currentMode}
        onChange={(e) => onChange(e.target.value as StudyMode)}
        className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {modes.map((mode) => (
          <option key={mode.value} value={mode.value} title={mode.description}>
            {mode.label}
          </option>
        ))}
      </select>
    </div>
  );
}
