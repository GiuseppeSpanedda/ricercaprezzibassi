import { getAppConfig } from './core/config.js';
import { escapeHtml } from './core/html.js';
import { searchOffers, summarizeOffers } from './api/agentApi.js';
import { renderOffers, renderEmpty } from './render/offersRenderer.js';

const config = getAppConfig();

const elements = {
  query: document.getElementById('query'),
  searchBtn: document.getElementById('searchBtn'),
  status: document.getElementById('status'),
  results: document.getElementById('results'),
  resultsCount: document.getElementById('resultsCount'),
  summary: document.getElementById('summary')
};

function updateStatus(message, showLoader = false) {
  elements.status.style.display = message ? 'flex' : 'none';
  elements.status.innerHTML = `${showLoader ? '<div class="loader"></div>' : ''}<span>${escapeHtml(message)}</span>`;
}

function tryParseJsonText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text.startsWith('{') && !text.startsWith('[')) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function isJsonLike(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return text.startsWith('{') || text.startsWith('[') || text.includes('"results"') || text.includes('"summary"');
}

function hasRiskyCondition(item) {
  const text = `${item?.title || ''} ${item?.condition || ''}`.toLowerCase();
  return /(usato|used|ricondizionato|refurbished|rigenerato|rotto|parti|ricambi)/i.test(text);
}

function formatItemLabel(item) {
  if (!item) return 'offerta non disponibile';
  const title = item.title || 'Prodotto senza titolo';
  const source = item.source || 'Store';
  const price = item.priceText || 'prezzo non disponibile';
  return `“${title}” da ${source} a ${price}`;
}

function pickBestValueItem(results) {
  const priced = results.filter(item => typeof item.price === 'number' && Number.isFinite(item.price));
  if (priced.length === 0) return results[0];

  const cheapest = priced[0];
  const clearCandidate = priced.find(item => !hasRiskyCondition(item));

  if (clearCandidate && hasRiskyCondition(cheapest) && clearCandidate.price <= cheapest.price * 1.15) {
    return clearCandidate;
  }

  return cheapest;
}

function buildFallbackSummary(query, results) {
  if (!Array.isArray(results) || results.length === 0) {
    return 'Nessuna offerta valida trovata sugli store ammessi. Prova con un nome prodotto più specifico, ad esempio marca, modello e versione.';
  }

  const best = pickBestValueItem(results);
  const cheapest = results.find(item => typeof item.price === 'number' && Number.isFinite(item.price)) || results[0];
  const sameAsCheapest = best === cheapest || best?.url === cheapest?.url;

  return [
    `Miglior rapporto qualità/prezzo per “${query}”: ${formatItemLabel(best)}.`,
    sameAsCheapest
      ? `Coincide anche con il prezzo più basso tra i risultati ordinati: ${formatItemLabel(cheapest)}.`
      : `Il prezzo più basso in assoluto è ${formatItemLabel(cheapest)}, ma l’offerta indicata sopra sembra più equilibrata per condizione o chiarezza del prodotto.`,
    'Prima dell’acquisto verifica sempre disponibilità, versione esatta, venditore, spedizione e garanzia direttamente sullo store.'
  ].join('\n');
}

function normalizeSummaryText(value, query, results) {
  if (!value) return buildFallbackSummary(query, results);

  if (typeof value === 'object') {
    return normalizeSummaryText(value.summary, query, results);
  }

  const parsed = tryParseJsonText(value);
  if (parsed) {
    if (typeof parsed.summary === 'string' && !isJsonLike(parsed.summary)) {
      return parsed.summary;
    }
    return buildFallbackSummary(query, results);
  }

  if (isJsonLike(value)) {
    return buildFallbackSummary(query, results);
  }

  return String(value).trim() || buildFallbackSummary(query, results);
}

async function buildSummary({ query, items, searchData }) {
  const searchSummary = normalizeSummaryText(searchData.summary, query, items);

  if (!config.useAiSummary || items.length === 0) {
    return searchSummary;
  }

  try {
    const summaryData = await summarizeOffers({ query, results: items, config });
    return normalizeSummaryText(summaryData.summary, query, items);
  } catch (summaryError) {
    console.warn('Errore agente sintesi:', summaryError);
    return searchSummary || buildFallbackSummary(query, items);
  }
}

async function handleSearch() {
  const query = elements.query.value.trim();

  if (!query) {
    updateStatus('Inserisci un prodotto da cercare.');
    return;
  }

  elements.searchBtn.disabled = true;
  elements.results.innerHTML = '';
  elements.resultsCount.innerText = '0 Match';
  elements.summary.innerHTML = 'Ricerca offerte in corso...';
  updateStatus('Ricerca sugli store ufficiali in corso...', true);

  try {
    const searchData = await searchOffers({ query, config });
    const items = Array.isArray(searchData.results) ? searchData.results : [];

    elements.resultsCount.innerText = `${items.length} Match`;

    if (items.length === 0) {
      renderEmpty(elements.results, 'Nessuna offerta valida trovata sugli store ammessi.');
      elements.summary.innerHTML = escapeHtml(normalizeSummaryText(searchData.summary, query, items));
      updateStatus('Ricerca completata.');
      return;
    }

    renderOffers(elements.results, items);
    updateStatus(config.useAiSummary ? 'Generazione analisi qualità/prezzo...' : 'Ricerca completata.', config.useAiSummary);

    const summary = await buildSummary({ query, items, searchData });
    elements.summary.innerHTML = escapeHtml(summary);
    updateStatus('Ricerca completata con risultati ordinati per prezzo crescente.');
  } catch (error) {
    console.error(error);
    updateStatus(`Errore: ${error.message}`);
    elements.summary.innerHTML = 'Impossibile completare la ricerca tramite agente AI.';
  } finally {
    elements.searchBtn.disabled = false;
  }
}

elements.searchBtn.addEventListener('click', handleSearch);
elements.query.addEventListener('keydown', event => {
  if (event.key === 'Enter') handleSearch();
});
