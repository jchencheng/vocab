import { supabase } from './utils/supabase';

export default async function handler(req: any, res: any) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching words:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { word, userId } = req.body;
      if (!word || !userId) {
        return res.status(400).json({ error: 'word and userId are required' });
      }

      const { error } = await supabase
        .from('words')
        .insert({ ...word, user_id: userId });
      
      if (error) {
        console.error('Error adding word:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const { word, userId } = req.body;
      if (!word || !userId) {
        return res.status(400).json({ error: 'word and userId are required' });
      }

      const { error } = await supabase
        .from('words')
        .update({ ...word, user_id: userId })
        .eq('id', word.id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating word:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { wordId, userId } = req.query;
      if (!wordId || !userId) {
        return res.status(400).json({ error: 'wordId and userId are required' });
      }

      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting word:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
