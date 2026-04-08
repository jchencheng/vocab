import { supabase, toSupabaseWord, fromSupabaseWord, toSupabaseContext, fromSupabaseContext, toSupabaseSettings, fromSupabaseSettings, fromSupabaseUser } from './supabase';
import type { Word, AIContext, AppSettings, AppUser } from '../types';

// 简单的密码哈希函数（使用 SHA-256）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证密码
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

export class SupabaseService {
  // ========== Users (独立用户认证) ==========

  async createUser(email: string, password: string): Promise<AppUser> {
    const passwordHash = await hashPassword(password);
    const now = Date.now();
    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('users')
      .insert({
        id,
        email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      if (error.code === '23505') {
        throw new Error('该邮箱已被注册');
      }
      throw error;
    }

    return fromSupabaseUser(data);
  }

  async getUserByEmail(email: string): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching user:', error);
      throw error;
    }

    return data ? fromSupabaseUser(data) : null;
  }

  async verifyUser(email: string, password: string): Promise<AppUser | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: Date.now(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }
  // ========== Words ==========
  
  async getAllWords(userId: string): Promise<Word[]> {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching words:', error);
      throw error;
    }
    
    return (data || []).map(fromSupabaseWord);
  }

  async addWord(word: Word, userId: string): Promise<void> {
    const supabaseWord = toSupabaseWord(word, userId);
    const { error } = await supabase
      .from('words')
      .insert(supabaseWord);
    
    if (error) {
      console.error('Error adding word:', error);
      throw error;
    }
  }

  async updateWord(word: Word, userId: string): Promise<void> {
    const supabaseWord = toSupabaseWord(word, userId);
    const { error } = await supabase
      .from('words')
      .update(supabaseWord)
      .eq('id', word.id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating word:', error);
      throw error;
    }
  }

  async deleteWord(wordId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', wordId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting word:', error);
      throw error;
    }
  }

  // ========== Contexts ==========
  
  async getAllContexts(userId: string): Promise<AIContext[]> {
    const { data, error } = await supabase
      .from('contexts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching contexts:', error);
      throw error;
    }
    
    return (data || []).map(fromSupabaseContext);
  }

  async addContext(context: AIContext, userId: string): Promise<void> {
    const supabaseContext = toSupabaseContext(context, userId);
    const { error } = await supabase
      .from('contexts')
      .insert(supabaseContext);
    
    if (error) {
      console.error('Error adding context:', error);
      throw error;
    }
  }

  async updateContext(context: AIContext, userId: string): Promise<void> {
    const supabaseContext = toSupabaseContext(context, userId);
    const { error } = await supabase
      .from('contexts')
      .update(supabaseContext)
      .eq('id', context.id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }

  async deleteContext(contextId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('contexts')
      .delete()
      .eq('id', contextId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting context:', error);
      throw error;
    }
  }

  // ========== Settings ==========
  
  async getSettings(userId: string): Promise<AppSettings | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found
        return null;
      }
      console.error('Error fetching settings:', error);
      throw error;
    }
    
    return data ? fromSupabaseSettings(data) : null;
  }

  async saveSettings(settings: AppSettings, userId: string): Promise<void> {
    const supabaseSettings = toSupabaseSettings(settings, userId);
    
    // Try to update first
    const { error: updateError } = await supabase
      .from('settings')
      .update(supabaseSettings)
      .eq('user_id', userId);
    
    if (updateError) {
      // If update fails, try insert
      const { error: insertError } = await supabase
        .from('settings')
        .insert(supabaseSettings);
      
      if (insertError) {
        console.error('Error saving settings:', insertError);
        throw insertError;
      }
    }
  }

  // ========== Bulk Operations ==========
  
  async bulkAddWords(words: Word[], userId: string): Promise<void> {
    if (words.length === 0) return;
    
    const supabaseWords = words.map(word => toSupabaseWord(word, userId));
    const { error } = await supabase
      .from('words')
      .insert(supabaseWords);
    
    if (error) {
      console.error('Error bulk adding words:', error);
      throw error;
    }
  }

  async bulkAddContexts(contexts: AIContext[], userId: string): Promise<void> {
    if (contexts.length === 0) return;
    
    const supabaseContexts = contexts.map(context => toSupabaseContext(context, userId));
    const { error } = await supabase
      .from('contexts')
      .insert(supabaseContexts);
    
    if (error) {
      console.error('Error bulk adding contexts:', error);
      throw error;
    }
  }
}

export const supabaseService = new SupabaseService();
