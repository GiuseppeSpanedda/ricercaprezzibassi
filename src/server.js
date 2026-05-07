import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { agentRoutes } from './routes/agentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: 'server-agent-proxy',
    model: env.openAiModel,
    openaiConfigured: Boolean(env.openAiApiKey),
    useWebSearch: env.openAiUseWebSearch,
    resultsLimit: env.resultsLimit,
    validateLinks: env.validateLinks,
    strictLinkValidation: env.strictLinkValidation,
    searchContextSize: env.openAiSearchContextSize,
    toolChoice: env.openAiToolChoice,
    textModeFallback: env.openAiTextModeFallback,
    storeFallbackEnabled: env.storeFallbackEnabled
  });
});

app.use('/api/agent', agentRoutes);

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`App avviata sulla porta ${env.port}`);
  console.log(`Modalità: server-agent-proxy | modello: ${env.openAiModel}`);
});
