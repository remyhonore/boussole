/**
 * Boussole — Proxy Anthropic API
 * Route : POST /api/narrative
 * Evite le CORS en faisant le relay serveur → api.anthropic.com
 */
export default async function handler(req, res) {
  // CORS — autoriser uniquement app.myboussole.fr
  res.setHeader('Access-Control-Allow-Origin', 'https://app.myboussole.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  try {
    const { system, messages, max_tokens } = req.body;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error || 'Upstream error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
