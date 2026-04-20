import { ConnectorType } from '../../../dto/connectorType.js';
import { BasePlaywrightConnector } from './basePlaywrightConnector.js';

export class AmazonConnector extends BasePlaywrightConnector {
  type() {
    return ConnectorType.AMAZON;
  }

  getConfig() {
    return {
      baseUrl: 'https://www.amazon.it',
      buildUrl: query => `https://www.amazon.it/s?k=${encodeURIComponent(query)}`,
      cardSelector: "div[data-component-type='s-search-result']",
      titleSelectors: ['h2 span', 'h2 a span'],
      priceSelectors: ['span.a-price span.a-offscreen', '.a-price .a-offscreen'],
      linkSelectors: ['h2 a.a-link-normal', 'a.a-link-normal.s-no-outline'],
      conditionSelectors: ['.a-color-secondary', '.a-size-base.a-color-base'],
      shippingSelectors: ['.a-row.a-size-base.a-color-secondary', '.a-color-base.a-size-small'],
      antiBotPatterns: [/captcha/i, /inserisci i caratteri/i, /robot/i]
    };
  }
}
