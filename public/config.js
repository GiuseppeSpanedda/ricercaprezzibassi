/*
 * Configurazione pubblica del frontend.
 * Non inserire qui API key o segreti.
 * La chiave OpenAI viene letta dal server tramite variabile ambiente OPENAI_API_KEY.
 */
window.APP_CONFIG = {
  provider: 'server-agent',
  searchEndpoint: '/api/agent/search',
  summaryEndpoint: '/api/agent/summary',
  timeoutMs: 120000,
  resultsLimit: 20,

  // true = dopo la ricerca fa una seconda chiamata al backend per generare
  // un riepilogo AI basato sui risultati finali filtrati/ordinati.
  // Serve per scegliere esplicitamente il miglior rapporto qualità/prezzo.
  useAiSummary: true
};
