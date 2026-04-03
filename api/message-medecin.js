/**
 * Boussole — Proxy Anthropic : Message médecin
 * Route : POST /api/message-medecin
 * Génère un message court (SMS/email) à destination du médecin
 * à partir des notes et événements du patient.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.myboussole.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const SYSTEM = `Tu es un assistant qui aide un patient à rédiger un message clair et concis à son médecin.

RÔLE : transformer des notes de suivi brutes en un message médecin structuré, court, actionnable.

RÈGLES ABSOLUES :
1. Le message doit tenir en 8 à 12 lignes maximum.
2. Commence TOUJOURS par : "Bonjour Dr [Nom du médecin]," — si le nom n'est pas fourni, mets "Bonjour Docteur,"
3. Structure obligatoire :
   - 1 phrase de contexte (pourquoi ce message maintenant)
   - 2 à 4 points factuels datés (effets observés, changements, signaux)
   - 1 question précise ou demande claire en fin de message
   - Formule de politesse courte
4. Utilise les mots exacts du patient entre guillemets quand ils décrivent un symptôme.
5. Ne jamais interpréter ni diagnostiquer — rapporter uniquement ce que le patient indique.
6. Ton sobre, factuel, pas alarmiste. Pas d'émojis.
7. Langue : français.
8. Signe avec le prénom du patient si fourni.
9. Réponds en texte brut uniquement. Aucun markdown, aucun JSON.`;

  try {
    const { context, max_tokens } = req.body;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: context }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data.error || 'Upstream error' });

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
