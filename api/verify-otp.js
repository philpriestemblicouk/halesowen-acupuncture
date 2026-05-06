export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { phone, code } = req.body;
  console.log('verify-otp received phone:', JSON.stringify(phone), 'code:', JSON.stringify(code));
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

  const r = await fetch(
    `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SID}/VerificationChecks`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, Code: code }),
    }
  );

  const d = await r.json();
  console.log('twilio verify response:', JSON.stringify(d));
  if (!r.ok || d.status !== 'approved') {
    return res.status(400).json({ error: d.message || 'Invalid or expired code' });
  }
  res.json({ ok: true });
}
