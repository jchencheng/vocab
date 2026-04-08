import { supabase } from './utils/supabase';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return null
          return res.status(200).json(null);
        }
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(data);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const { settings, userId } = req.body;
      if (!settings || !userId) {
        return res.status(400).json({ error: 'settings and userId are required' });
      }

      // Try to update first
      const { error: updateError } = await supabase
        .from('settings')
        .update({ 
          ...settings, 
          user_id: userId,
          updated_at: Date.now()
        })
        .eq('user_id', userId);
      
      if (!updateError) {
        return res.status(200).json({ success: true });
      }

      // If update fails, try insert
      const { error: insertError } = await supabase
        .from('settings')
        .insert({ 
          ...settings, 
          user_id: userId,
          updated_at: Date.now()
        });
      
      if (insertError) {
        console.error('Error saving settings:', insertError);
        return res.status(500).json({ error: insertError.message });
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
