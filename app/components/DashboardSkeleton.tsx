'use client';

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 欢迎区域骨架屏 */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white animate-pulse">
        <div className="h-8 bg-white/20 rounded w-48 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-64"></div>
      </div>

      {/* 今日进度骨架屏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div className="bg-gray-300 dark:bg-gray-600 h-3 rounded-full w-1/3"></div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mt-2"></div>
      </div>

      {/* 统计卡片骨架屏 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* 快速操作骨架屏 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
              </div>
              <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* 最近添加骨架屏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
