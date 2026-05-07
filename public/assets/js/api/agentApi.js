import { postJson } from '../core/http.js';

export function searchOffers({ query, config }) {
  return postJson(config.searchEndpoint, {
    query,
    limit: config.resultsLimit
  }, config.timeoutMs);
}

export function summarizeOffers({ query, results, config }) {
  return postJson(config.summaryEndpoint, {
    query,
    results
  }, config.timeoutMs);
}
