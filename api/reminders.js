import { createClient } from '@supabase/supabase-js';

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WINDOWS = [
  { key: '24h', ms: 24 * 60 * 60 * 1000, label: '24 hours' },
];
const TOLERANCE = 35 * 60 * 1000; // ±35 min so hourly cron never misses a window

function parseDate(dateStr, timeStr) {
  const parts = dateStr.replace(',', '').trim().split(' ');
  const month = MONTHS.indexOf(parts[0]);
  const day   = parseInt(parts[1]);
  const year  = parseInt(parts[2]);
  const [timePart, period] = timeStr.trim().split(' ');
  let [h, m] = timePart.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return new Date(year, month, day, h, m, 0, 0);
}

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const now = new Date();

  const [{ data: bookings }, { data: users }] = await Promise.all([
    supabase.from('bookings').select('*'),
    supabase.from('users').select('email, phone').eq('phone_verified', true),
  ]);

  if (!bookings?.length || !users?.length) return res.json({ ok: true, sent: 0 });

  const byEmail = Object.fromEntries(users.map(u => [u.email, u.phone]));
  let sent = 0;

  for (const b of bookings) {
    const phone = byEmail[b.patient_email];
    if (!phone) continue;

    let appt;
    try { appt = parseDate(b.date, b.time); } catch { continue; }
    if (appt < now) continue;

    const done = b.reminders_sent || {};

    for (const w of WINDOWS) {
      if (done[w.key]) continue;
      const diff = appt - now;
      if (diff < w.ms - TOLERANCE || diff > w.ms + TOLERANCE) continue;

      const first = (b.patient_name || '').split(' ')[0] || 'there';
      const body = `Hi ${first}, reminder: your acupuncture appointment is in ${w.label} — ${b.date} at ${b.time} with Lucy Priest. Halesowen Acupuncture.`;

      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ From: process.env.TWILIO_PHONE_NUMBER, To: phone, Body: body }),
        }
      );

      if (r.ok) {
        await supabase.from('bookings').update({ reminders_sent: { ...done, [w.key]: true } }).eq('id', b.id);
        sent++;
      }
    }
  }

  res.json({ ok: true, sent });
}
