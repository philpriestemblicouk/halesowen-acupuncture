import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: user } = await supabase.from('users').select('otp_code, otp_expires').eq('email', email.toLowerCase()).single();

  if (!user || !user.otp_code) return res.status(400).json({ error: 'No verification pending — please request a new code' });
  if (new Date() > new Date(user.otp_expires)) return res.status(400).json({ error: 'Code has expired — please request a new one' });
  if (user.otp_code !== code.trim()) return res.status(400).json({ error: 'Incorrect code — please try again' });

  await supabase.from('users').update({ phone_verified: true, otp_code: null, otp_expires: null }).eq('email', email.toLowerCase());
  res.json({ ok: true });
}
