'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import type { AppSettings, WordBook, LearningSequenceItem } from '../types';

// Dashboard 统计数据接口
interface DashboardStats {
  totalWords: number;
  dueToday: number;
  mastered: number;
  learning: number;
  completedToday: number;
  streak: number;
}

interface DashboardClientProps {
  initialData: {
    settings: AppSettings;
    stats: DashboardStats;
    wordBooks: WordBook[];
    learningSequence: LearningSequenceItem[];
    customBooks: WordBook[];
  };
  userId: string;
  userEmail: string;
}

// SWR fetcher
const dashboardFetcher = async (userId: string) => {
  // 客户端刷新时获取最新数据
  const response = await fetch(`/api/dashboard?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
};

export function DashboardClient({ initialData, userId, userEmail }: DashboardClientProps) {
  const router = useRouter();

  // SWR 客户端缓存
  const { data, isValidating } = useSWR(
    userId ? ['dashboard', userId] : null,
    () => dashboardFetcher(userId),
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const settings = data?.settings || initialData.settings;
  const stats = data?.stats || initialData.stats;
  const wordBooks = data?.wordBooks || initialData.wordBooks;
  const learningSequence = data?.learningSequence || initialData.learningSequence;

  const dailyGoal = settings.maxDailyReviews || 20;
  const progressPercent = Math.min((stats.completedToday / dailyGoal) * 100, 100);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 同步状态指示器 */}
      {isValidating && (
        <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin" />
          同步中...
        </div>
      )}

      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          欢迎回来，{userEmail.split('@')[0] || '学习者'}！
        </h1>
        <p className="text-primary-100">
          {stats.dueToday > 0 
            ? `今天有 ${stats.dueToday} 个单词待复习，开始吧！` 
            : '太棒了！今天没有待复习的单词，去添加一些新单词吧！'}
        </p>
      </div>

      {/* 今日进度 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">今日学习进度</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {stats.completedToday} / {dailyGoal}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div 
            className="bg-primary-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          已完成 {stats.completedToday} 个单词，目标 {dailyGoal} 个
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📚</span>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats.totalWords}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">总单词数</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⏰</span>
            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.dueToday}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">今日待复习</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎯</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.mastered}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">已掌握</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.streak}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">连续天数</p>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleNavigate('/review')}
          disabled={stats.dueToday === 0}
          className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl p-6 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">开始复习</h3>
              <p className="text-primary-100 text-sm">
                {stats.dueToday > 0 
                  ? `${stats.dueToday} 个单词待复习` 
                  : '暂无待复习单词'}
              </p>
            </div>
            <span className="text-3xl">📖</span>
          </div>
        </button>

        <button
          onClick={() => handleNavigate('/wordbooks')}
          className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-6 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">单词书</h3>
              <p className="text-green-100 text-sm">
                {learningSequence.length > 0 
                  ? `${learningSequence.length} 本学习中` 
                  : '管理你的单词书'}
              </p>
            </div>
            <span className="text-3xl">📚</span>
          </div>
        </button>
      </div>

      {/* 学习序列概览 */}
      {learningSequence.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            正在学习
          </h2>
          <div className="space-y-3">
            {learningSequence.slice(0, 3).map((item: any) => {
              const book = item.word_book || item.wordBook;
              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📖</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {book?.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {book?.wordCount || 0} 个单词
                      </p>
                    </div>
                  </div>
                  {item.is_primary && (
                    <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs rounded-full">
                      主学
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {learningSequence.length > 3 && (
            <button
              onClick={() => handleNavigate('/wordbooks')}
              className="w-full mt-3 text-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              查看全部 {learningSequence.length} 本单词书 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
