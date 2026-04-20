import { ConnectorType } from '../../../dto/connectorType.js';
import { BasePlaywrightConnector } from './basePlaywrightConnector.js';

export class TronyConnector extends BasePlaywrightConnector {
  type() {
    return ConnectorType.TRONY;
  }

  getConfig() {
    return {
      baseUrl: 'https://www.trony.it',
      buildUrl: query => `https://www.trony.it/online/search?q=${encodeURIComponent(query)}`,
      cardSelector: '.product-item, .products-grid .item, article',
      titleSelectors: ['.product-item-link', '.product-name', 'h2', 'h3'],
      priceSelectors: ['.price', '.special-price .price', '.regular-price .price'],
      linkSelectors: ['a.product-item-link', 'a[href*="/product/"]', 'a'],
      conditionSelectors: ['.stock', '.product-label', '.badge'],
      shippingSelectors: ['.shipping', '.delivery', '.availability'],
      antiBotPatterns: [/captcha/i, /access denied/i]
    };
  }
}
