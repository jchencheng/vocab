import { supabase } from './utils/supabase';

export default async function handler(req: any, res: any) {
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
        .from('contexts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching contexts:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { context, userId } = req.body;
      if (!context || !userId) {
        return res.status(400).json({ error: 'context and userId are required' });
      }

      const { error } = await supabase
        .from('contexts')
        .insert({ ...context, user_id: userId });
      
      if (error) {
        console.error('Error adding context:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const { context, userId } = req.body;
      if (!context || !userId) {
        return res.status(400).json({ error: 'context and userId are required' });
      }

      const { error } = await supabase
        .from('contexts')
        .update({ ...context, user_id: userId })
        .eq('id', context.id)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating context:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { contextId, userId } = req.query;
      if (!contextId || !userId) {
        return res.status(400).json({ error: 'contextId and userId are required' });
      }

      const { error } = await supabase
        .from('contexts')
        .delete()
        .eq('id', contextId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error deleting context:', error);
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
