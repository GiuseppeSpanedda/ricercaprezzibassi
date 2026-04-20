import { chromium } from 'playwright';
import { SearchConnector } from '../searchConnector.js';
import { appProperties } from '../../../config/appProperties.js';
import { detectCurrency, toPriceValue } from '../../../utils/priceParser.js';

export class BasePlaywrightConnector extends SearchConnector {
  getConfig() {
    throw new Error('getConfig() non implementato');
  }

  async search(request) {
    const config = this.getConfig();
    const results = [];
    const warnings = [];
    const seen = new Set();
    const query = clean(request.query || '');
    const searchUrl = config.buildUrl(query);

    let browser;
    let context;
    try {
      browser = await chromium.launch({
        headless: appProperties.search.headless,
        args: ['--disable-blink-features=AutomationControlled']
      });

      context = await browser.newContext({
        locale: 'it-IT',
        viewport: { width: 1366, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(config.waitAfterLoadMs ?? 3500);

      const bodyText = clean(await page.locator('body').innerText().catch(() => ''));
      const antiBotHit = (config.antiBotPatterns || []).find(pattern => pattern.test(bodyText));
      if (antiBotHit) {
        return {
          connectorType: this.type(),
          items: [],
          error: `${this.type()}: pagina anti-bot/captcha rilevata`
        };
      }

      const cards = page.locator(config.cardSelector);
      const cardCount = await cards.count();
      if (cardCount === 0) {
        return {
          connectorType: this.type(),
          items: [],
          error: `${this.type()}: nessuna card trovata con il selettore configurato`
        };
      }

      for (let i = 0; i < cardCount && results.length < request.limit; i += 1) {
        const card = cards.nth(i);
        const item = await this.extractItem(card, config);
        if (!item) continue;
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        results.push(item);
      }

      return {
        connectorType: this.type(),
        items: results,
        error: warnings.length ? warnings.join(' | ') : null
      };
    } catch (error) {
      return {
        connectorType: this.type(),
        items: results,
        error: `${this.type()}: ${error.message}`
      };
    } finally {
      await context?.close().catch(() => {});
      await browser?.close().catch(() => {});
    }
  }

  async extractItem(card, config) {
    const title = await firstText(card, config.titleSelectors);
    if (!title) return null;

    const rawUrl = await firstAttribute(card, config.linkSelectors, 'href');
    const url = normalizeUrl(rawUrl, config.baseUrl);
    if (!url) return null;

    const priceText = await firstText(card, config.priceSelectors) || 'Prezzo non trovato';
    const condition = await firstText(card, config.conditionSelectors) || 'Condizione non trovata';
    const shipping = await firstText(card, config.shippingSelectors) || 'Spedizione non indicata';

    return {
      title,
      priceText,
      priceValue: toPriceValue(priceText),
      currency: detectCurrency(priceText),
      condition,
      shipping,
      url,
      source: this.type()
    };
  }
}

async function firstText(card, selectors = []) {
  for (const selector of selectors || []) {
    try {
      const locator = card.locator(selector).first();
      if (await locator.count()) {
        const text = clean(await locator.innerText());
        if (text) return text;
      }
    } catch {}
  }
  return '';
}

async function firstAttribute(card, selectors = [], attribute) {
  for (const selector of selectors || []) {
    try {
      const locator = card.locator(selector).first();
      if (await locator.count()) {
        const value = await locator.getAttribute(attribute);
        if (value && value.trim()) return value.trim();
      }
    } catch {}
  }
  return '';
}

function normalizeUrl(rawUrl, baseUrl) {
  if (!rawUrl) return '';
  try {
    const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, baseUrl);
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function clean(value) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}
