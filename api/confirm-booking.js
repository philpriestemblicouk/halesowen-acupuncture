export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { phone, name, treatment, date, time, ref, deposit } = req.body;
  if (!phone) return res.json({ ok: true });

  const first = (name || '').split(' ')[0] || 'there';
  const depositLine = deposit > 0 ? ` A deposit of £${deposit} has been taken.` : '';
  const body = `Hi ${first}, your acupuncture appointment is confirmed! ${treatment} on ${date} at ${time} with Lucy Priest. Ref: ${ref}.${depositLine} Halesowen Acupuncture.`;

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: process.env.TWILIO_PHONE_NUMBER, To: phone, Body: body }),
    }
  );

  res.json({ ok: r.ok });
}
