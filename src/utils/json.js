function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function stripMarkdownFence(value) {
  const text = String(value || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1] ? fenced[1].trim() : text;
}

function extractJsonObjectText(value) {
  const text = stripMarkdownFence(value);
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');

  if (first >= 0 && last > first) {
    return text.slice(first, last + 1).trim();
  }

  return text;
}

function repairCommonJsonIssues(value) {
  let text = extractJsonObjectText(value);

  // Caso frequente con output non perfettamente valido: "price":599,99.
  // JSON richiede il punto decimale. Converto solo campi prezzo/amount/prezzo.
  text = text.replace(
    /("(?:price|amount|prezzo)"\s*:\s*)(-?\d{1,3}(?:\.\d{3})*|-?\d+),(\d+)(?=\s*[,}\]])/gi,
    (_match, prefix, integerPart, decimalPart) => `${prefix}${integerPart.replace(/\./g, '')}.${decimalPart}`
  );

  // Rimuove virgole finali prima di } o ].
  text = text.replace(/,\s*([}\]])/g, '$1');

  return text;
}

export function safeJsonParse(value) {
  if (!value || typeof value !== 'string') return null;

  const candidates = [
    value.trim(),
    stripMarkdownFence(value),
    extractJsonObjectText(value),
    repairCommonJsonIssues(value)
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch (_error) {
      // prova successiva
    }
  }

  return null;
}

export function looksLikeJsonPayload(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return text.startsWith('{') || text.startsWith('[') || text.includes('"results"') || text.includes('"summary"');
}

export function extractResponsesText(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string') return data.output_text.trim();

  const chunks = [];

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (typeof item?.content === 'string') chunks.push(item.content);

      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (typeof content?.text === 'string') chunks.push(content.text);
          if (typeof content?.output_text === 'string') chunks.push(content.output_text);
        }
      }
    }
  }

  return chunks.join('\n').trim();
}

function normalizeParsedObject(parsed) {
  if (!isPlainObject(parsed)) return parsed;

  // Se il modello ha messo un secondo JSON dentro summary, lo spacchetto.
  if (!Array.isArray(parsed.results) && typeof parsed.summary === 'string' && looksLikeJsonPayload(parsed.summary)) {
    const nested = safeJsonParse(parsed.summary);
    if (isPlainObject(nested)) return normalizeParsedObject(nested);
  }

  if (typeof parsed.results === 'string') {
    const nestedResults = safeJsonParse(parsed.results);
    if (Array.isArray(nestedResults)) {
      parsed.results = nestedResults;
    }
  }

  return parsed;
}

export function normalizeAgentResponse(data) {
  if (!data) return {};

  if (isPlainObject(data) && (Array.isArray(data.results) || typeof data.summary === 'string')) {
    return normalizeParsedObject({ ...data });
  }

  const text = typeof data === 'string' ? data : extractResponsesText(data);
  const parsed = safeJsonParse(text);

  if (parsed && typeof parsed === 'object') {
    return normalizeParsedObject(parsed);
  }

  return {
    summary: looksLikeJsonPayload(text) ? '' : (text || ''),
    results: []
  };
}
