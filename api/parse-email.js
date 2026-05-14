export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emailText } = req.body;
  if (!emailText) {
    return res.status(400).json({ error: 'No email text provided' });
  }

  const prompt = `You are a UK property letting data extractor. Extract ONLY information explicitly stated in the email. Do NOT guess or use prior knowledge. If a field is not in the email, use null or empty string.

Return ONLY a valid JSON object, no markdown, no code blocks, no explanation.

JSON structure:
{
  "property": {
    "address": "full street address excluding postcode, exactly as written in email",
    "postcode": "UK postcode only e.g. SW9 9FA",
    "weeklyRent": null or number with no symbols,
    "monthlyRent": null or number with no symbols,
    "startDate": "move-in or start date as written",
    "tenancyType": "AST or Monthly Rolling or Fixed Term, only if stated",
    "reservationFee": null or number,
    "deposit": null or number
  },
  "tenant": {
    "name": "tenant full name as written in email",
    "email": null,
    "phone": null
  },
  "agent": {
    "name": "agent full name who signed off email",
    "company": "agency or company name",
    "email": "agent email if present else null",
    "phone": "agent phone if present else null"
  },
  "notes": "special conditions, guarantor requirements, other agreed terms"
}

RULES:
- Extract ONLY from the email below, nothing else
- If rent is monthly, put in monthlyRent. If weekly, put in weeklyRent. Never convert.
- Postcode must come directly from the email address line
- Tenant name is the person named on the tenancy or who the email is addressed to
- Agent name is the person who signed the email

EMAIL:
${emailText}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse email', detail: err.message });
  }
}
