'use client';

export function WordbookHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      {/* 返回按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      
      {/* 标题区域 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* 单词书名称 */}
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
            {/* 描述 */}
            <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded-lg mb-1" />
              <div className="h-3 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
      
      {/* 学习设置 */}
      <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function WordbookWordsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {/* 搜索和筛选 */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="w-32 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
      
      {/* 单词列表 */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* 单词和音标 */}
              <div className="flex items-center gap-3 mb-2">
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              {/* 释义 */}
              <div className="h-4 w-full max-w-md bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            {/* 操作按钮 */}
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      ))}
      
      {/* 分页 */}
      <div className="flex justify-center gap-2 mt-6">
        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export function WordbookDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <WordbookHeaderSkeleton />
        <div className="mt-6">
          <WordbookWordsSkeleton />
        </div>
      </div>
    </div>
  );
}
