const DEFAULT_CONFIG = {
  provider: 'server-agent',
  searchEndpoint: '/api/agent/search',
  summaryEndpoint: '/api/agent/summary',
  timeoutMs: 120000,
  resultsLimit: 20,
  useAiSummary: true
};

export function getAppConfig() {
  const rawConfig = window.APP_CONFIG || {};

  return {
    ...DEFAULT_CONFIG,
    ...rawConfig,
    provider: String(rawConfig.provider || DEFAULT_CONFIG.provider).trim(),
    searchEndpoint: String(rawConfig.searchEndpoint || rawConfig.searchAgentUrl || DEFAULT_CONFIG.searchEndpoint).trim(),
    summaryEndpoint: String(rawConfig.summaryEndpoint || rawConfig.summaryAgentUrl || DEFAULT_CONFIG.summaryEndpoint).trim(),
    timeoutMs: Number(rawConfig.timeoutMs || DEFAULT_CONFIG.timeoutMs),
    resultsLimit: Number(rawConfig.resultsLimit || rawConfig.maxResults || DEFAULT_CONFIG.resultsLimit),
    useAiSummary: Boolean(rawConfig.useAiSummary ?? DEFAULT_CONFIG.useAiSummary)
  };
}
