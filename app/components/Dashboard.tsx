'use client';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { fetchDueTodayCount, fetchDailyProgress } from '../services/apiClient';

interface DashboardStats {
  totalWords: number;
  dueToday: number;
  mastered: number;
  learning: number;
  completedToday: number;
  streak: number;
}

interface DashboardProps {
  onViewChange: (view: 'add' | 'wordbooks' | 'review' | 'settings' | 'ai-memory') => void;
}

export function Dashboard({ onViewChange }: DashboardProps) {
  const { user } = useAuth();
  const { settings, wordBooks } = useApp();
  const [stats, setStats] = useState<DashboardStats>({
    totalWords: 0,
    dueToday: 0,
    mastered: 0,
    learning: 0,
    completedToday: 0,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    async function loadDashboardData() {
      try {
        setIsLoading(true);

        // 并行获取数据（只获取必要的数据）
        const [dueTodayCount, dailyProgress] = await Promise.all([
          fetchDueTodayCount(userId, settings.maxDailyReviews),
          fetchDailyProgress(userId),
        ]);

        // 计算今日已完成数量
        const completedToday = dailyProgress?.completedWordIds?.length || 0;

        // 从 wordBooks 计算总单词数
        const totalWords = wordBooks.reduce((sum, book) => sum + (book.wordCount || 0), 0);

        setStats({
          totalWords,
          dueToday: dueTodayCount,
          mastered: 0, // 暂时无法从 wordBooks 获取
          learning: 0, // 暂时无法从 wordBooks 获取
          completedToday,
          streak: 0,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.id, settings.maxDailyReviews, wordBooks]);

  const dailyGoal = settings.maxDailyReviews || 20;
  const progressPercent = Math.min((stats.completedToday / dailyGoal) * 100, 100);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 欢迎区域骨架屏 */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white animate-pulse">
          <div className="h-8 bg-white/20 rounded w-48 mb-2"></div>
          <div className="h-4 bg-white/20 rounded w-64"></div>
        </div>
        
        {/* 统计卡片骨架屏 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          欢迎回来，{user?.email?.split('@')[0] || '学习者'}！
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
          onClick={() => onViewChange('review')}
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
          onClick={() => onViewChange('add')}
          className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-6 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">添加单词</h3>
              <p className="text-green-100 text-sm">添加新单词到词库</p>
            </div>
            <span className="text-3xl">➕</span>
          </div>
        </button>
      </div>
    </div>
  );
}
