import 'dotenv/config';

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'y', 'si', 'sì'].includes(String(value).trim().toLowerCase());
}

function toEnum(value, allowedValues, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),

  // Mai inserire la chiave OpenAI nel codice o nel frontend.
  // Impostala nel file .env locale o nelle variabili ambiente di Hostinger/VPS.
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  openAiTimeoutMs: toNumber(process.env.OPENAI_TIMEOUT_MS, 90000),
  openAiUseWebSearch: toBoolean(process.env.OPENAI_USE_WEB_SEARCH, true),
  openAiForceWebSearch: toBoolean(process.env.OPENAI_FORCE_WEB_SEARCH, true),
  openAiToolChoice: toEnum(process.env.OPENAI_TOOL_CHOICE, ['auto', 'required'], 'auto'),
  openAiSearchContextSize: toEnum(process.env.OPENAI_SEARCH_CONTEXT_SIZE, ['low', 'medium', 'high'], 'medium'),
  openAiUseDomainFilters: toBoolean(process.env.OPENAI_USE_DOMAIN_FILTERS, false),
  openAiIncludeSources: toBoolean(process.env.OPENAI_INCLUDE_SOURCES, true),
  openAiStructuredOutput: toBoolean(process.env.OPENAI_STRUCTURED_OUTPUT, true),
  openAiTextModeFallback: toBoolean(process.env.OPENAI_TEXT_MODE_FALLBACK, true),

  // Target: mostrare 20 risultati quando gli store ufficiali restituiscono abbastanza offerte valide.
  // Il backend cerca più candidati del necessario perché poi elimina duplicati, comparatori e link non validi.
  resultsLimit: toNumber(process.env.RESULTS_LIMIT, 20),
  searchCandidateLimit: toNumber(process.env.SEARCH_CANDIDATE_LIMIT, 80),
  minResultsBeforeFallback: toNumber(process.env.MIN_RESULTS_BEFORE_STORE_FALLBACK, 20),
  storeFallbackEnabled: toBoolean(process.env.STORE_FALLBACK_ENABLED, true),
  storeFallbackMaxGroups: toNumber(process.env.STORE_FALLBACK_MAX_GROUPS, 9),
  storeFallbackCandidatesPerGroup: toNumber(process.env.STORE_FALLBACK_CANDIDATES_PER_GROUP, 8),

  validateLinks: toBoolean(process.env.VALIDATE_LINKS, true),
  strictLinkValidation: toBoolean(process.env.STRICT_LINK_VALIDATION, false),
  fastLinkValidation: toBoolean(process.env.FAST_LINK_VALIDATION, true),
  linkValidationCandidateLimit: toNumber(process.env.LINK_VALIDATION_CANDIDATE_LIMIT, 80),
  linkValidationTimeoutMs: toNumber(process.env.LINK_VALIDATION_TIMEOUT_MS, 2500),
  linkValidationConcurrency: toNumber(process.env.LINK_VALIDATION_CONCURRENCY, 12),
  fallbackToDirectLinks: toBoolean(process.env.FALLBACK_TO_DIRECT_LINKS, true)
};
