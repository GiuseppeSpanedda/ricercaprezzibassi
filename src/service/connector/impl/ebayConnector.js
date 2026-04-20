import { ConnectorType } from '../../../dto/connectorType.js';
import { BasePlaywrightConnector } from './basePlaywrightConnector.js';

export class EbayConnector extends BasePlaywrightConnector {
  type() {
    return ConnectorType.EBAY;
  }

  getConfig() {
    return {
      baseUrl: 'https://www.ebay.it',
      buildUrl: query => `https://www.ebay.it/sch/i.html?_nkw=${encodeURIComponent(query)}`,
      cardSelector: 'li.s-item, li.s-card',
      titleSelectors: ['.s-item__title', '.s-card__title'],
      priceSelectors: ['.s-item__price', '.s-card__price'],
      linkSelectors: ['a.s-item__link', 'a.s-card__link'],
      conditionSelectors: ['.SECONDARY_INFO', '.s-item__subtitle', '.s-card__subtitle'],
      shippingSelectors: ['.s-item__shipping', '.s-item__logisticsCost'],
      antiBotPatterns: [/captcha/i, /robot/i]
    };
  }
}
