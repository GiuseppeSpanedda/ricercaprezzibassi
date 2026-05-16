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
    // Entrambi presenti: l'ultimo è il separatore decimale
    normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')   // formato IT: 1.499,00
      : raw.replace(/,/g, '');                      // formato EN: 1,499.00
  } else if (hasComma) {
    // Solo virgola: potrebbe essere decimale (599,99) o migliaia (1,200)
    const parts = raw.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      // Es. "1,200" → separatore migliaia → rimuovi la virgola
      normalized = raw.replace(',', '');
    } else {
      // Es. "599,99" → decimale → converti in punto
      normalized = raw.replace(',', '.');
    }
  } else if (hasDot) {
    // Solo punto: potrebbe essere decimale (147.00, 1499.00) o migliaia (1.200)
    const parts = raw.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      // Es. "1.200" o "1.499" → separatore migliaia → rimuovi il punto
      normalized = raw.replace('.', '');
    }
    // Altrimenti lascia com'è: "147.00", "1499.00" sono già corretti
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
