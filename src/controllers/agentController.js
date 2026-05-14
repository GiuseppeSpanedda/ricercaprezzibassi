import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { looksLikeJsonPayload } from '../utils/json.js';
import { OpenAiAgentService, mergeAgentResponses } from '../services/openAiAgentService.js';
import { ResultService } from '../services/resultService.js';

const openAiAgentService = new OpenAiAgentService();
const resultService = new ResultService();

export async function searchOffers(req, res, next) {
  try {
    const query = String(req.body?.query || '').trim();

    if (!query) {
      throw new HttpError('Query prodotto obbligatoria.', 400);
    }

    const primaryRawData = await openAiAgentService.searchOffers(query);
    let response = await resultService.prepareSearchResponse(primaryRawData, query);
    let usedStoreFallback = false;

    // La decisione di fare fallback va presa DOPO i filtri server-side:
    // il modello può restituire molti candidati grezzi, ma dopo esclusione comparatori,
    // deduplica e validazione potrebbero restarne pochi.
    if (env.storeFallbackEnabled && response.results.length < env.resultsLimit) {
      const fallbackRawData = await openAiAgentService.searchFallbackOffers(query);
      const mergedRawData = mergeAgentResponses([primaryRawData, fallbackRawData]);
      response = await resultService.prepareSearchResponse(mergedRawData, query);
      usedStoreFallback = true;
    }

    res.json({
      ...response,
      meta: {
        requestedResults: env.resultsLimit,
        returnedResults: response.results.length,
        minimumTarget: env.resultsLimit,
        validateLinks: env.validateLinks,
        strictLinkValidation: env.strictLinkValidation,
        sortedBy: 'price-asc',
        sourcePolicy: 'official-stores-only',
        usedStoreFallback
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function summarizeOffers(req, res, next) {
  try {
    const query = String(req.body?.query || '').trim();
    const results = Array.isArray(req.body?.results) ? req.body.results : [];

    if (!query) {
      throw new HttpError('Query prodotto obbligatoria.', 400);
    }

    const fallbackSummary = resultService.buildQualityPriceSummary(query, results);

    if (results.length === 0) {
      res.json({ summary: fallbackSummary, aiSummaryStatus: 'fallback-empty-results' });
      return;
    }

    try {
      const data = await openAiAgentService.summarizeOffers(query, results);
      const summary = typeof data.summary === 'string' && !looksLikeJsonPayload(data.summary)
        ? data.summary.trim()
        : '';

      res.json({
        summary: summary || fallbackSummary,
        aiSummaryStatus: summary ? 'ai' : 'fallback-invalid-ai-output'
      });
    } catch (error) {
      console.warn('Riepilogo AI non riuscito, uso riepilogo locale:', error.message);
      res.json({ summary: fallbackSummary, aiSummaryStatus: 'fallback-ai-error' });
    }
  } catch (error) {
    next(error);
  }
}
