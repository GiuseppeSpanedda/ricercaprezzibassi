import { ConnectorType } from '../../../dto/connectorType.js';
import { BasePlaywrightConnector } from './basePlaywrightConnector.js';

export class MediaworldConnector extends BasePlaywrightConnector {
  type() {
    return ConnectorType.MEDIAWORLD;
  }

  getConfig() {
    return {
      baseUrl: 'https://www.mediaworld.it',
      buildUrl: query => `https://www.mediaworld.it/it/search.html?query=${encodeURIComponent(query)}`,
      cardSelector: '[data-test="mms-product-grid-item"], .product-grid-item, article',
      titleSelectors: ['[data-test="mms-product-title"]', '.product-title', 'h2', 'h3'],
      priceSelectors: ['[data-test="mms-price-current"]', '.price', '.product-price'],
      linkSelectors: ['a[href*="/product/"]', 'a[href*="/it/product/"]', 'a'],
      conditionSelectors: ['.product-badge', '.badge', '.product-label'],
      shippingSelectors: ['.delivery-message', '.availability', '.shipping'],
      antiBotPatterns: [/captcha/i, /access denied/i]
    };
  }
}
