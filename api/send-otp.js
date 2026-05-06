import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { phone, email } = req.body;
  if (!phone || !email) return res.status(400).json({ error: 'Phone and email required' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from('users').update({ otp_code: code, otp_expires: expires }).eq('email', email.toLowerCase());

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: phone,
        Body: `Your Halesowen Acupuncture verification code is: ${code}. Valid for 10 minutes.`,
      }),
    }
  );

  if (!r.ok) {
    const d = await r.json();
    return res.status(400).json({ error: d.message || 'Failed to send code' });
  }
  res.json({ ok: true });
}
