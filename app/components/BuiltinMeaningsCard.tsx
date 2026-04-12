'use client';

import type { Word } from '../types';

interface BuiltinMeaningsCardProps {
  word: Word;
  onUseBuiltin: () => void;
  onAddCustom: () => void;
}

export function BuiltinMeaningsCard({
  word,
  onUseBuiltin,
  onAddCustom,
}: BuiltinMeaningsCardProps) {
  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📖</span>
        <div className="flex-1">
          <h3 className="font-semibold text-primary-800 dark:text-primary-200 mb-3">
            发现系统内置释义
          </h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {word.word}
              </span>
              {word.phonetic && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {word.phonetic}
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                内置释义
              </p>
              {word.meanings?.map((meaning, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-primary-600 dark:text-primary-400">
                    {meaning.partOfSpeech}
                  </span>
                  <ul className="mt-1 space-y-1 ml-4">
                    {meaning.definitions?.map((def: any, defIdx: number) => (
                      <li key={defIdx} className="text-slate-700 dark:text-slate-300">
                        {def.definition}
                        {def.chineseDefinition && (
                          <span className="text-slate-500 dark:text-slate-500 ml-2">
                            {def.chineseDefinition}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onUseBuiltin}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              ✓ 使用内置释义
            </button>
            <button
              onClick={onAddCustom}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              ✎ 添加我的释义
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
