import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { WordBookListClient } from '../components/WordBookListClient';
import type { WordBook, LearningSequenceItem, WordBookStats } from '../types';

// 服务端获取单词书数据
async function fetchWordBooksServer(userId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 并行执行所有查询
  const [
    { data: systemBooks, error: systemError },
    { data: learningSequence, error: sequenceError },
    { data: customBooks, error: customError }
  ] = await Promise.all([
    // 获取系统预置单词书
    supabase
      .from('word_books')
      .select('*')
      .is('user_id', null)
      .eq('is_active', true),
    
    // 获取用户学习序列（包含单词书详情）
    supabase
      .from('user_learning_sequences')
      .select(`
        *,
        word_book:word_books(*)
      `)
      .eq('user_id', userId),
    
    // 获取用户自建单词书
    supabase
      .from('word_books')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'custom')
  ]);

  if (systemError) throw systemError;
  if (sequenceError) throw sequenceError;
  if (customError) throw customError;

  // 获取学习序列中每本书的真实统计
  const bookIds = learningSequence?.map((item: any) => 
    item.word_book?.id || item.word_book_id
  ).filter(Boolean) || [];

  const stats: Record<string, WordBookStats> = {};
  
  if (bookIds.length > 0) {
    // 批量获取所有学习序列中单词书的统计
    const { data: itemsData, error: itemsError } = await supabase
      .from('word_book_items')
      .select('word_book_id, status')
      .in('word_book_id', bookIds);

    if (!itemsError && itemsData) {
      // 聚合统计
      for (const bookId of bookIds) {
        const bookItems = itemsData.filter((item: any) => item.word_book_id === bookId);
        const total = bookItems.length;
        const mastered = bookItems.filter((item: any) => item.status === 'mastered').length;
        const learning = bookItems.filter((item: any) => item.status === 'learning').length;
        const ignored = bookItems.filter((item: any) => item.status === 'ignored').length;
        
        stats[bookId] = {
          total,
          mastered,
          learning,
          ignored,
          progress: total > 0 ? Math.round((mastered / total) * 100) : 0
        };
      }
    }
  }

  return {
    systemBooks: systemBooks || [],
    learningSequence: learningSequence || [],
    customBooks: customBooks || [],
    stats
  };
}

// Server Component - 服务端渲染单词书列表
export default async function WordbooksPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">请先登录</p>
        </div>
      </div>
    );
  }

  // 服务端获取数据
  const initialData = await fetchWordBooksServer(user.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <main className="container mx-auto px-4 py-8">
        <WordBookListClient 
          initialData={initialData}
          userId={user.id}
        />
      </main>
    </div>
  );
}
