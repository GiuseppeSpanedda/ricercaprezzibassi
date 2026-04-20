import dotenv from 'dotenv';

dotenv.config({ override: true });

const toBool = (value, fallback = true) => {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const readRequiredEnv = (key) => {
  const value = process.env[key];
  if (value == null || String(value).trim() === '') {
    throw new Error(`Variabile ambiente obbligatoria mancante: ${key}`);
  }
  return String(value).trim();
};

const readOptionalEnv = (key, fallback = '') => {
  const value = process.env[key];
  if (value == null || String(value).trim() === '') return fallback;
  return String(value).trim();
};

export const appProperties = Object.freeze({
  server: Object.freeze({
    port: toInt(process.env.PORT, 8080)
  }),
  search: Object.freeze({
    defaultLimit: 10,
    maxLimit: 10,
    headless: toBool(process.env.HEADLESS, true)
  }),
  ollama: Object.freeze({
    host: readRequiredEnv('OLLAMA_HOST'),
    model: readRequiredEnv('OLLAMA_MODEL'),
    apiKey: readOptionalEnv('OLLAMA_API_KEY')
  })
});
