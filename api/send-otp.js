export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

  const r = await fetch(
    `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SID}/Verifications`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }),
    }
  );

  if (!r.ok) {
    const d = await r.json();
    return res.status(400).json({ error: d.message || 'Failed to send code' });
  }
  res.json({ ok: true });
}
