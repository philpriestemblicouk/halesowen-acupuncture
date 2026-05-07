import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { date, start_time, end_time, is_active, delete: del } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (del) {
    await supabase.from('schedule_dates').delete().eq('date', date);
  } else {
    const { data: existing } = await supabase.from('schedule_dates').select('id').eq('date', date).maybeSingle();
    if (existing) {
      await supabase.from('schedule_dates').update({ start_time, end_time, is_active }).eq('date', date);
    } else {
      await supabase.from('schedule_dates').insert({ date, start_time, end_time, is_active });
    }
  }
  res.json({ ok: true });
}
