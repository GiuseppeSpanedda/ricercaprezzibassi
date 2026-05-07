import { env } from '../config/env.js';
import { createAbortSignal } from '../utils/http.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const SOFT_BLOCK_STATUSES = new Set([401, 403, 405, 406, 408, 409, 412, 416, 418, 425, 429, 451]);
const HARD_INVALID_STATUSES = new Set([400, 404, 410]);

export class LinkValidationService {
  async validateResults(results) {
    if (!env.validateLinks) {
      return results.map(item => ({ ...item, linkStatus: 'not-validated' }));
    }

    const validated = await this.#mapWithConcurrency(
      results,
      env.linkValidationConcurrency,
      item => this.#validateSingleResult(item)
    );

    return validated.filter(Boolean);
  }

  async #validateSingleResult(item) {
    if (!this.#hasValidHttpUrl(item.url)) {
      return null;
    }

    const validation = await this.#isValidUrl(item.url);

    if (validation.valid) {
      return {
        ...item,
        url: validation.finalUrl || item.url,
        linkStatus: 'verified'
      };
    }

    // Molti ecommerce bloccano le chiamate server-side. In modalità non stretta
    // manteniamo il link diretto se non abbiamo prova forte che sia inesistente.
    if (!env.strictLinkValidation && validation.keepDirectLink) {
      return {
        ...item,
        linkStatus: 'direct'
      };
    }

    return null;
  }

  #hasValidHttpUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (_error) {
      return false;
    }
  }

  async #isValidUrl(url) {
    const headResult = await this.#requestUrl(url, 'HEAD');
    if (headResult.valid || headResult.hardInvalid || env.fastLinkValidation) return headResult;

    const getResult = await this.#requestUrl(url, 'GET');
    if (getResult.valid) return getResult;

    return {
      ...getResult,
      keepDirectLink: getResult.keepDirectLink || headResult.keepDirectLink
    };
  }

  async #requestUrl(url, method) {
    const timeout = createAbortSignal(env.linkValidationTimeoutMs);

    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          ...(method === 'GET' ? { Range: 'bytes=0-4096' } : {})
        },
        signal: timeout.signal
      });

      const status = response.status;
      const valid = status >= 200 && status < 400;

      return {
        valid,
        status,
        finalUrl: response.url || url,
        hardInvalid: HARD_INVALID_STATUSES.has(status),
        keepDirectLink: !valid && !HARD_INVALID_STATUSES.has(status) && (SOFT_BLOCK_STATUSES.has(status) || status >= 500 || env.fastLinkValidation)
      };
    } catch (_error) {
      return {
        valid: false,
        keepDirectLink: true
      };
    } finally {
      timeout.clear();
    }
  }

  async #mapWithConcurrency(items, concurrency, mapper) {
    const queue = [...items];
    const results = [];
    const workersCount = Math.max(1, Math.min(Number(concurrency) || 1, queue.length || 1));

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        results.push(await mapper(item));
      }
    }

    await Promise.all(Array.from({ length: workersCount }, worker));
    return results;
  }
}
