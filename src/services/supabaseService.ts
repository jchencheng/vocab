import { supabase, toSupabaseWord, fromSupabaseWord, toSupabaseContext, fromSupabaseContext, toSupabaseSettings, fromSupabaseSettings } from './supabase';
import type { Word, AIContext, UserSettings } from '../types';

export class SupabaseService {
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
  
  async getSettings(userId: string): Promise<UserSettings | null> {
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

  async saveSettings(settings: UserSettings, userId: string): Promise<void> {
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
