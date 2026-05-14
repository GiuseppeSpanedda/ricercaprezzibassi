import { BLOCKED_DOMAINS, BLOCKED_SOURCE_TERMS } from '../config/searchPolicy.js';
import { env } from '../config/env.js';
import { formatEuro, parsePrice } from '../utils/price.js';
import { getHostname, normalizeUrl } from '../utils/url.js';
import { looksLikeJsonPayload, safeJsonParse } from '../utils/json.js';
import { LinkValidationService } from './linkValidationService.js';

const ACCESSORY_TERMS = [
  'accessorio',
  'accessori',
  'custodia',
  'cover',
  'case',
  'pellicola',
  'vetro temperato',
  'cavo',
  'cavi',
  'caricatore',
  'charger',
  'alimentatore',
  'adattatore',
  'adapter',
  'supporto',
  'stand',
  'staffa',
  'ricambio',
  'ricambi',
  'parti di ricambio',
  'batteria sostitutiva',
  'manuale',
  'garanzia',
  'assicurazione'
];

const GENERIC_QUERY_TERMS = new Set([
  'prezzo',
  'prezzi',
  'basso',
  'bassi',
  'migliore',
  'migliori',
  'offerta',
  'offerte',
  'sconto',
  'sconti',
  'comprare',
  'acquistare',
  'nuovo',
  'nuova',
  'usato',
  'usata',
  'ricondizionato',
  'italia',
  'online',
  'store',
  'negozio',
  'negozi',
  'con',
  'per',
  'del',
  'della',
  'dello',
  'dei',
  'degli',
  'delle',
  'una',
  'uno',
  'the',
  'and',
  'for'
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function queryTokens(query) {
  return normalizeText(query)
    .replace(/[^a-z0-9]+/gi, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !GENERIC_QUERY_TERMS.has(token));
}

export class ResultService {
  constructor() {
    this.linkValidationService = new LinkValidationService();
  }

  async prepareSearchResponse(rawAgentResponse, query = '') {
    const unpacked = this.#unpackAgentResponse(rawAgentResponse);
    const rawResults = Array.isArray(unpacked?.results) ? unpacked.results : [];
    const warnings = Array.isArray(unpacked?.warnings) ? [...unpacked.warnings] : [];

    const normalized = this.#dedupeResults(this.#normalizeResults(rawResults));
    const filtered = normalized.filter(item => !this.#isBlockedResult(item));
    const relevant = filtered.filter(item => !this.#isIrrelevantResult(item, query));
    const preSorted = this.#sortByPrice(relevant).slice(0, Math.max(env.searchCandidateLimit, env.resultsLimit));

    let validated = preSorted;

    if (env.validateLinks) {
      const candidatesForValidation = preSorted.slice(0, env.linkValidationCandidateLimit);
      const remainingCandidates = preSorted.slice(env.linkValidationCandidateLimit);
      const validatedFirstBatch = await this.linkValidationService.validateResults(candidatesForValidation);

      // Se la validazione server-side blocca tutto, non azzeriamo i risultati:
      // molti store ecommerce rifiutano HEAD/GET da server, ma il link resta apribile dal browser.
      if (validatedFirstBatch.length > 0) {
        validated = [...validatedFirstBatch, ...remainingCandidates.map(item => ({ ...item, linkStatus: 'not-validated' }))];
      } else if (env.fallbackToDirectLinks) {
        validated = preSorted.map(item => ({ ...item, linkStatus: 'direct' }));
      } else {
        validated = [];
      }
    } else {
      validated = preSorted.map(item => ({ ...item, linkStatus: 'not-validated' }));
    }

    const sorted = this.#sortByPrice(validated).slice(0, env.resultsLimit);
    const cleanedSummary = this.#cleanSummary(unpacked?.summary);

    return {
      results: sorted,
      summary: cleanedSummary || this.buildQualityPriceSummary(query, sorted),
      warnings: [...new Set(warnings.filter(Boolean))],
      debug: env.nodeEnv === 'development'
        ? {
            rawResults: rawResults.length,
            normalized: normalized.length,
            afterPolicyFilter: filtered.length,
            afterRelevanceFilter: relevant.length,
            returned: sorted.length
          }
        : undefined
    };
  }

  buildQualityPriceSummary(query, results) {
    const items = Array.isArray(results) ? results : [];

    if (items.length === 0) {
      return 'Nessuna offerta valida trovata sugli store ammessi. Prova con un nome prodotto più specifico, includendo marca, modello e versione.';
    }

    const pricedItems = items.filter(item => typeof item.price === 'number' && Number.isFinite(item.price));
    const cheapest = pricedItems[0] || items[0];
    const best = this.#selectBestValueItem(items);
    const bestLabel = this.#formatItemLabel(best);
    const cheapestLabel = this.#formatItemLabel(cheapest);
    const sameAsCheapest = best === cheapest || best?.url === cheapest?.url;
    const conditionText = this.#conditionNote(best);
    const queryText = query ? ` per “${query}”` : '';

    return [
      `Miglior rapporto qualità/prezzo${queryText}: ${bestLabel}.`,
      sameAsCheapest
        ? `Coincide anche con il prezzo più basso tra i risultati ordinati: ${cheapestLabel}.`
        : `Il prezzo più basso in assoluto è ${cheapestLabel}, ma l’offerta indicata sopra sembra più equilibrata per condizione o chiarezza del prodotto.`,
      conditionText,
      'Prima dell’acquisto verifica sempre sulla pagina dello store disponibilità, versione esatta, venditore, spedizione e garanzia.'
    ].filter(Boolean).join('\n');
  }

  #selectBestValueItem(items) {
    const priced = items.filter(item => typeof item.price === 'number' && Number.isFinite(item.price));
    if (priced.length === 0) return items[0];

    const cheapest = priced[0];
    const clearNewCandidate = priced.find(item => {
      const text = `${item.title || ''} ${item.condition || ''}`.toLowerCase();
      return !/(usato|used|ricondizionato|refurbished|rigenerato|rotto|parti|ricambi)/i.test(text);
    });

    if (!clearNewCandidate) return cheapest;

    // Se il prezzo più basso è ambiguo/usato/ricondizionato e una proposta più chiara costa poco di più,
    // la proposta più chiara è spesso un rapporto qualità/prezzo migliore.
    const cheapestText = `${cheapest.title || ''} ${cheapest.condition || ''}`.toLowerCase();
    const cheapestLooksRisky = /(usato|used|ricondizionato|refurbished|rigenerato|rotto|parti|ricambi)/i.test(cheapestText);

    if (cheapestLooksRisky && clearNewCandidate.price <= cheapest.price * 1.15) {
      return clearNewCandidate;
    }

    return cheapest;
  }

  #formatItemLabel(item) {
    if (!item) return 'offerta non disponibile';
    const title = item.title || 'Prodotto senza titolo';
    const source = item.source || 'Store';
    const priceText = item.priceText || (typeof item.price === 'number' ? formatEuro(item.price) : 'prezzo non disponibile');
    return `“${title}” da ${source} a ${priceText}`;
  }

  #conditionNote(item) {
    const text = `${item?.title || ''} ${item?.condition || ''}`.toLowerCase();

    if (/(usato|used)/i.test(text)) {
      return 'Nota: l’offerta scelta risulta usata o potenzialmente usata, quindi il prezzo va valutato insieme a stato reale e garanzia.';
    }

    if (/(ricondizionato|refurbished|rigenerato)/i.test(text)) {
      return 'Nota: l’offerta scelta risulta ricondizionata o rigenerata, quindi controlla grado, garanzia e condizioni di reso.';
    }

    if (/(bundle|pacchetto|kit)/i.test(text)) {
      return 'Nota: l’offerta scelta sembra un bundle o pacchetto, quindi confrontala solo con offerte equivalenti.';
    }

    return 'La scelta è basata sui dati disponibili: prezzo, store, titolo e condizione dichiarata.';
  }

  #unpackAgentResponse(rawAgentResponse) {
    if (rawAgentResponse?.results || rawAgentResponse?.summary) {
      if (!Array.isArray(rawAgentResponse.results) && typeof rawAgentResponse.summary === 'string') {
        const nested = safeJsonParse(rawAgentResponse.summary);
        if (nested?.results) return nested;
      }
      return rawAgentResponse;
    }

    return rawAgentResponse || {};
  }

  #normalizeResults(results) {
    return results
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const rawPrice = item.price ?? item.priceText ?? item.prezzo ?? item.amount;
        const price = parsePrice(rawPrice);
        const url = normalizeUrl(item.url || item.link || item.href || '');

        return {
          title: String(item.title || item.name || item.nome || item.productName || 'Prodotto senza titolo').trim(),
          price,
          priceText: String(item.priceText || item.prezzo || item.displayPrice || (price !== null ? formatEuro(price) : 'Prezzo non disponibile')).trim(),
          source: String(item.source || item.store || item.vendor || item.marketplace || 'Store ufficiale').trim(),
          url,
          condition: String(item.condition || item.stato || 'n.d.').trim()
        };
      })
      .filter(item => item.title && item.url && /^https?:\/\//i.test(item.url));
  }

  #dedupeResults(results) {
    const seen = new Set();

    return results.filter(item => {
      const normalizedUrl = item.url.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
      const key = `${getHostname(item.url)}::${normalizedUrl || item.title.toLowerCase()}::${item.price ?? 'n.d.'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  #cleanSummary(summary) {
    if (typeof summary !== 'string') return '';
    const text = summary.trim();
    if (!text || looksLikeJsonPayload(text)) return '';
    return text;
  }

  #isBlockedResult(item) {
    const hostname = getHostname(item.url);
    const source = normalizeText(item.source);
    const title = normalizeText(item.title);

    if (hostname && BLOCKED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }

    return BLOCKED_SOURCE_TERMS.some(term => source.includes(normalizeText(term)) || title.includes(normalizeText(term)));
  }

  #isIrrelevantResult(item, query) {
    const normalizedQuery = normalizeText(query);
    const title = normalizeText(item.title);
    const source = normalizeText(item.source);
    const searchableText = `${title} ${source}`;

    if (!normalizedQuery || !title) return false;

    const userAskedForAccessory = ACCESSORY_TERMS.some(term => normalizedQuery.includes(normalizeText(term)));
    const resultLooksAccessory = ACCESSORY_TERMS.some(term => title.includes(normalizeText(term)));

    if (!userAskedForAccessory && resultLooksAccessory) {
      return true;
    }

    const tokens = queryTokens(query);
    if (tokens.length === 0) return false;

    const matchedTokens = tokens.filter(token => searchableText.includes(token));

    // Per query con un solo elemento distintivo, almeno quello deve comparire nel titolo/store.
    if (tokens.length === 1) {
      return matchedTokens.length === 0;
    }

    // Per query più lunghe evitiamo risultati completamente scollegati.
    return matchedTokens.length === 0;
  }

  #sortByPrice(results) {
    return [...results].sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
      const priceB = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
      return priceA - priceB;
    });
  }
}
