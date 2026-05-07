import { env } from '../config/env.js';
import { OFFICIAL_STORE_DOMAINS } from '../config/searchPolicy.js';
import { HttpError, createAbortSignal } from '../utils/http.js';
import { normalizeAgentResponse } from '../utils/json.js';
import {
  buildFocusedStorePrompt,
  buildSearchPrompt,
  buildSummaryPrompt,
  getFallbackStoreGroups
} from './promptService.js';
import { searchSchema, summarySchema } from './schemas.js';

function isFiltersUnsupportedError(status, data) {
  const message = String(data?.error?.message || data?.error || '').toLowerCase();
  return status === 400 && message.includes('filters') && message.includes('not supported');
}

function modelSupportsDomainFilters(model) {
  const normalized = String(model || '').trim().toLowerCase();

  // gpt-4.1-mini respinge filters.allowed_domains.
  // Il filtro store ufficiali resta gestito da prompt + filtri server-side.
  return normalized.startsWith('gpt-5');
}

function countResults(value) {
  return Array.isArray(value?.results) ? value.results.length : 0;
}

export function mergeAgentResponses(responses) {
  const merged = {
    results: [],
    summary: '',
    warnings: []
  };

  for (const response of responses) {
    if (!response || typeof response !== 'object') continue;

    if (Array.isArray(response.results)) {
      merged.results.push(...response.results);
    }

    if (!merged.summary && typeof response.summary === 'string') {
      merged.summary = response.summary;
    }

    if (Array.isArray(response.warnings)) {
      merged.warnings.push(...response.warnings);
    }
  }

  if (!merged.summary) {
    merged.summary = merged.results.length > 0
      ? 'Offerte trovate sugli store ufficiali e retailer diretti disponibili.'
      : 'Nessuna offerta valida trovata sugli store ammessi.';
  }

  return merged;
}

export class OpenAiAgentService {
  async searchOffers(query) {
    const prompt = buildSearchPrompt({
      query,
      resultLimit: env.resultsLimit,
      candidateLimit: env.searchCandidateLimit
    });

    const primary = await this.#callResponsesApi({
      task: 'search',
      prompt,
      schema: searchSchema,
      maxOutputTokens: 7000,
      structuredOutput: env.openAiStructuredOutput
    });

    const responses = [primary];

    if (countResults(primary) === 0 && env.openAiTextModeFallback) {
      const textModeRetry = await this.#callResponsesApi({
        task: 'search',
        prompt,
        schema: searchSchema,
        maxOutputTokens: 7000,
        structuredOutput: false
      });
      responses.push(textModeRetry);
    }

    return mergeAgentResponses(responses);
  }

  async searchFallbackOffers(query) {
    const fallbackResponses = await this.#runStoreFallbackSearches(query);
    return mergeAgentResponses(fallbackResponses);
  }

  async summarizeOffers(query, results) {
    const prompt = buildSummaryPrompt({ query, results });

    return this.#callResponsesApi({
      task: 'summary',
      prompt,
      schema: summarySchema,
      maxOutputTokens: 900,
      structuredOutput: true
    });
  }

  async #runStoreFallbackSearches(query) {
    const groups = getFallbackStoreGroups().slice(0, Math.max(1, env.storeFallbackMaxGroups));
    const candidateLimit = Math.max(2, env.storeFallbackCandidatesPerGroup);

    const tasks = groups.map(group => {
      const prompt = buildFocusedStorePrompt({
        query,
        resultLimit: env.resultsLimit,
        candidateLimit,
        storeGroup: group
      });

      return this.#callResponsesApi({
        task: 'search',
        prompt,
        schema: searchSchema,
        maxOutputTokens: 2600,
        structuredOutput: false
      }).catch(error => {
        console.warn(`Fallback store non riuscito per ${group.name}:`, error.message);
        return { results: [], summary: '', warnings: [`Fallback store non riuscito per ${group.name}`] };
      });
    });

    return Promise.all(tasks);
  }

  #buildTools(task, { disableDomainFilters = false } = {}) {
    if (task !== 'search' || !env.openAiUseWebSearch) return undefined;

    const webSearchTool = {
      type: 'web_search',
      search_context_size: env.openAiSearchContextSize,
      user_location: {
        type: 'approximate',
        country: 'IT'
      }
    };

    const canSendFilters =
      env.openAiUseDomainFilters &&
      !disableDomainFilters &&
      modelSupportsDomainFilters(env.openAiModel);

    if (canSendFilters) {
      webSearchTool.filters = {
        allowed_domains: OFFICIAL_STORE_DOMAINS.slice(0, 100)
      };
    }

    return [webSearchTool];
  }

  #resolveToolChoice(task, tools) {
    if (task !== 'search' || !tools) return 'auto';
    if (!env.openAiForceWebSearch) return 'auto';
    return env.openAiToolChoice;
  }

  #buildRequestBody({
    task,
    prompt,
    schema,
    maxOutputTokens,
    disableDomainFilters = false,
    structuredOutput = true
  }) {
    const tools = this.#buildTools(task, { disableDomainFilters });

    const body = {
      model: env.openAiModel,
      instructions: task === 'summary'
        ? 'Sei un agente di sintesi offerte. Rispondi solo JSON valido nel formato richiesto. Devi scegliere sempre una singola migliore offerta qualità/prezzo basandoti solo sui risultati ricevuti.'
        : 'Sei un agente di ricerca offerte ecommerce. Devi usare la ricerca web quando disponibile, usare solo store ufficiali/retailer diretti, escludere comparatori, e rispondere con dati acquistabili. Per i numeri decimali usa il punto, non la virgola.',
      input: prompt,
      store: false,
      max_output_tokens: maxOutputTokens,
      tools,
      tool_choice: this.#resolveToolChoice(task, tools)
    };

    if (env.openAiIncludeSources && task === 'search') {
      body.include = ['web_search_call.action.sources'];
    }

    if (structuredOutput) {
      body.text = {
        format: {
          type: 'json_schema',
          name: task === 'summary' ? 'offer_summary' : 'offer_search',
          strict: true,
          schema
        }
      };
    }

    return body;
  }

  async #sendResponsesRequest(body) {
    const timeout = createAbortSignal(env.openAiTimeoutMs);

    try {
      const response = await fetch(`${env.openAiBaseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: timeout.signal
      });

      const data = await response.json().catch(async () => ({ error: await response.text() }));

      if (!response.ok) {
        const detail = data?.error?.message || data?.error || response.statusText;
        const error = new HttpError(`OpenAI Responses API HTTP ${response.status}: ${detail}`, response.status, data);
        error.openAiStatus = response.status;
        error.openAiData = data;
        throw error;
      }

      return data;
    } finally {
      timeout.clear();
    }
  }

  async #callResponsesApi({ task, prompt, schema, maxOutputTokens, structuredOutput = true }) {
    if (!env.openAiApiKey) {
      throw new HttpError('OPENAI_API_KEY non configurata sul server.', 500);
    }

    const body = this.#buildRequestBody({ task, prompt, schema, maxOutputTokens, structuredOutput });

    try {
      const data = await this.#sendResponsesRequest(body);
      return normalizeAgentResponse(data);
    } catch (error) {
      if (isFiltersUnsupportedError(error.openAiStatus, error.openAiData)) {
        const retryBody = this.#buildRequestBody({
          task,
          prompt,
          schema,
          maxOutputTokens,
          structuredOutput,
          disableDomainFilters: true
        });
        const retryData = await this.#sendResponsesRequest(retryBody);
        return normalizeAgentResponse(retryData);
      }

      throw error;
    }
  }
}
