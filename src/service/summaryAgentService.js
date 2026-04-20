import { appProperties } from '../config/appProperties.js';

export class SummaryAgentService {
  async summarize(query, items) {
    if (!items?.length) return 'Nessuna offerta utile trovata.';

    const compactItems = items
      .slice(0, 10)
      .map((item, index) => ({
        position: index + 1,
        title: normalizeTitle(item.title, 72),
        priceText: item.priceText || 'n.d.',
        priceValue: item.priceValue,
        condition: normalizeText(item.condition, 32),
        shipping: normalizeText(item.shipping, 32)
      }));

    const lines = compactItems.map((item) => {
      const parts = [
        `${item.position}. ${item.title}`,
        `prezzo ${item.priceText}`
      ];

      if (item.condition && item.condition !== 'n.d.') parts.push(`condizione ${item.condition}`);
      if (item.shipping && item.shipping !== 'n.d.') parts.push(`spedizione ${item.shipping}`);

      return parts.join(' | ');
    });

    const prompt = [
      'Riepiloga queste offerte in italiano in massimo 3 frasi brevi.',
      'Non citare siti o negozi.',
      'Indica il prezzo più basso, se ci sono differenze utili e se i dati sono incompleti.',
      'Non inventare nulla.',
      '',
      `Prodotto: ${normalizeText(query, 80)}`,
      'Offerte ordinate dal prezzo più basso al più alto:',
      ...lines
    ].join('\n');

    const headers = {
      'Content-Type': 'application/json'
    };

    if (appProperties.ollama.apiKey) {
      headers['x-api-key'] = appProperties.ollama.apiKey;
    }

    try {
      const response = await fetch(`${appProperties.ollama.host}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: appProperties.ollama.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 120
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return `Riepilogo AI non disponibile${errorText ? `: ${errorText}` : '.'}`;
      }

      const data = await response.json();
      return data?.message?.content?.trim() || 'Riepilogo AI non disponibile.';
    } catch (error) {
      return `Summary Agent non disponibile: ${error.message}`;
    }
  }
}

function normalizeText(value, maxLength = 60) {
  const text = String(value || 'n.d.')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeTitle(value, maxLength = 72) {
  return normalizeText(value, maxLength);
}
