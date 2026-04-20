export function toPriceValue(text) {
  if (!text || !String(text).trim()) return null;
  const normalized = String(text).replace(/\s+/g, ' ');
  const match = normalized.match(/(?:EUR|€)?\s*(\d[\d\.,]*)/i);
  if (!match) return null;

  const raw = match[1].replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

export function detectCurrency(text) {
  if (!text) return 'EUR';
  const lower = String(text).toLowerCase();
  if (lower.includes('eur') || lower.includes('€')) return 'EUR';
  return 'EUR';
}
