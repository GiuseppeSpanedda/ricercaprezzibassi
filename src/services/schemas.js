export const searchSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          priceText: { type: 'string' },
          price: { type: ['number', 'string', 'null'] },
          source: { type: 'string' },
          url: { type: 'string' },
          condition: { type: 'string' }
        },
        required: ['title', 'priceText', 'price', 'source', 'url', 'condition']
      }
    }
  },
  required: ['results', 'summary', 'warnings']
};

export const summarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' }
  },
  required: ['summary']
};
