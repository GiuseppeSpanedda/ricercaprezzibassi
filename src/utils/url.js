export function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('//')) return `https:${raw}`;

  try {
    return new URL(raw).toString();
  } catch (_error) {
    return raw;
  }
}

export function getHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch (_error) {
    return '';
  }
}
