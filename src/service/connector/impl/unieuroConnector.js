import { ConnectorType } from '../../../dto/connectorType.js';
import { BasePlaywrightConnector } from './basePlaywrightConnector.js';

export class UnieuroConnector extends BasePlaywrightConnector {
  type() {
    return ConnectorType.UNIEURO;
  }

  getConfig() {
    return {
      baseUrl: 'https://www.unieuro.it',
      buildUrl: query => `https://www.unieuro.it/online/search?text=${encodeURIComponent(query)}`,
      cardSelector: '[data-testid="product-tile"], .product-tile, article',
      titleSelectors: ['[data-testid="product-tile-description"]', '.product-card__title', 'h2', 'h3'],
      priceSelectors: ['[data-testid="product-tile-price"]', '.price', '.product-card__price'],
      linkSelectors: ['a[href*="/online/"]', 'a[href*="/products/"]', 'a'],
      conditionSelectors: ['.badge', '.product-card__label', '.stock'],
      shippingSelectors: ['.delivery', '.availability', '.shipping'],
      antiBotPatterns: [/captcha/i, /access denied/i]
    };
  }
}
