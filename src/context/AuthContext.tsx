import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabaseService } from '../services/supabaseService';
import type { AppUser, UserSession } from '../types';

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user: AppUser | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage key
const SESSION_KEY = 'vocab_app_session';

// 生成简单的 session token
function generateToken(): string {
  return crypto.randomUUID();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 恢复 session
  useEffect(() => {
    const initAuth = () => {
      try {
        const sessionJson = localStorage.getItem(SESSION_KEY);
        if (sessionJson) {
          const session: UserSession = JSON.parse(sessionJson);
          // 检查 session 是否过期
          if (session.expiresAt > Date.now()) {
            setUser(session.user);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const user = await supabaseService.verifyUser(email, password);
      if (!user) {
        return { error: new Error('邮箱或密码错误') };
      }

      // 创建 session
      const session: UserSession = {
        user,
        token: generateToken(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天过期
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(user);
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const user = await supabaseService.createUser(email, password);

      // 自动登录
      const session: UserSession = {
        user,
        token: generateToken(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(user);
      return { error: null, user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error, user: null };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string) => {
    try {
      const existingUser = await supabaseService.getUserByEmail(email);
      if (!existingUser) {
        return { error: new Error('该邮箱未注册') };
      }

      await supabaseService.updateUserPassword(existingUser.id, newPassword);
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as Error };
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
