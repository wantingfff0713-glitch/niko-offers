export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emailText } = req.body;
  if (!emailText) {
    return res.status(400).json({ error: 'No email text provided' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a property data extractor. Extract information from this UK letting agent offer confirmation email and return ONLY valid JSON with no markdown, no explanation.

Return exactly this structure (use null for missing fields):
{
  "property": {
    "address": "",
    "postcode": "",
    "weeklyRent": null,
    "monthlyRent": null,
    "startDate": "",
    "tenancyType": "",
    "reservationFee": null
  },
  "tenant": {
    "name": "",
    "email": "",
    "phone": ""
  },
  "agent": {
    "name": "",
    "company": "",
    "email": "",
    "phone": ""
  },
  "notes": ""
}

Email:
${emailText}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse email', detail: err.message });
  }
}
