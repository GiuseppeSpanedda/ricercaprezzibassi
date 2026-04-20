import { appProperties } from '../config/appProperties.js';
import { ConnectorType, connectorTypes } from '../dto/connectorType.js';
import { SortMode } from '../dto/sortMode.js';

export class SearchAgentService {
  constructor(connectors) {
    this.connectorsByType = new Map(connectors.map(connector => [connector.type(), connector]));
  }

  async search(request) {
    const query = String(request?.query || '').trim();
    const limit = this.normalizeLimit(request?.limit ?? appProperties.search.defaultLimit);
    const connectors = this.resolveConnectors(request?.connectors);
    const warnings = [];

    const tasks = connectors.map(async (connectorType) => {
      const connector = this.connectorsByType.get(connectorType);
      if (!connector) {
        return { items: [], warning: `Connettore non registrato: ${connectorType}` };
      }

      try {
        const result = await connector.search({ query, limit });
        return {
          items: result?.items || [],
          warning: result?.error || null
        };
      } catch (error) {
        return {
          items: [],
          warning: `${connectorType}: ${error.message}`
        };
      }
    });

    const settled = await Promise.all(tasks);
    const combined = [];

    for (const result of settled) {
      if (result.warning) warnings.push(result.warning);
      combined.push(...result.items);
    }

    const normalizedUnique = this.deduplicate(combined);
    const sorted = this.sort(normalizedUnique, SortMode.PRICE_ASC);
    const finalResults = sorted.slice(0, limit);

    return {
      query,
      limit,
      connectors,
      sortMode: SortMode.PRICE_ASC,
      results: finalResults,
      warnings
    };
  }

  deduplicate(items) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      const titleKey = normalizeTitle(item.title);
      const priceKey = item.priceValue ?? item.priceText ?? 'n/d';
      const key = `${titleKey}|${priceKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    return unique;
  }

  sort(items, sortMode) {
    const cloned = [...items];
    if (sortMode === SortMode.PRICE_ASC) {
      cloned.sort((a, b) => compareNullablePrice(a.priceValue, b.priceValue));
    } else if (sortMode === SortMode.PRICE_DESC) {
      cloned.sort((a, b) => compareNullablePrice(b.priceValue, a.priceValue));
    }
    return cloned;
  }

  normalizeLimit(_limit) {
    return appProperties.search.maxLimit;
  }

  resolveConnectors(connectors) {
    if (!Array.isArray(connectors) || connectors.length === 0) {
      return [
        ConnectorType.EBAY,
        ConnectorType.AMAZON,
        ConnectorType.MEDIAWORLD,
        ConnectorType.TRONY,
        ConnectorType.UNIEURO
      ];
    }
    return connectors.filter(type => connectorTypes.includes(type));
  }
}

function compareNullablePrice(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function normalizeTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9àèéìòù ]/gi, '')
    .trim();
}
