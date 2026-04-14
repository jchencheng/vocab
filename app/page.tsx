import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { HomeClient } from './components/HomeClient';

// 强制动态渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server Component - 获取用户并渲染客户端应用
export default async function HomePage() {
  const cookieStore = await cookies();
  
  // Server Component 使用非 NEXT_PUBLIC_ 前缀的环境变量
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">服务器配置错误</p>
          <p className="text-xs text-red-500 mt-2">缺少 Supabase 环境变量</p>
        </div>
      </div>
    );
  }
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Server Component 中不需要设置 cookie
        },
        remove(name: string, options: any) {
          // Server Component 中不需要删除 cookie
        },
      },
    }
  );

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();

  // 渲染客户端应用，传递用户ID
  return <HomeClient userId={user?.id || ''} />;
}
