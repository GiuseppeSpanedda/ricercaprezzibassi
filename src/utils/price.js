export function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value || '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.]/g, '');

  if (!raw) return null;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;

  if (hasComma && hasDot) {
    normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  } else if (hasComma) {
    normalized = raw.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatEuro(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Prezzo non disponibile';

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}
