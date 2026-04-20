import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { appProperties } from './config/appProperties.js';
import { createApiRouter } from './controller/apiController.js';
import { SearchAgentService } from './service/searchAgentService.js';
import { SearchOrchestratorService } from './service/searchOrchestratorService.js';
import { SummaryAgentService } from './service/summaryAgentService.js';
import { AmazonConnector } from './service/connector/impl/amazonConnector.js';
import { EbayConnector } from './service/connector/impl/ebayConnector.js';
import { MediaworldConnector } from './service/connector/impl/mediaworldConnector.js';
import { TronyConnector } from './service/connector/impl/tronyConnector.js';
import { UnieuroConnector } from './service/connector/impl/unieuroConnector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectors = [
  new EbayConnector(),
  new AmazonConnector(),
  new MediaworldConnector(),
  new TronyConnector(),
  new UnieuroConnector()
];

const searchAgentService = new SearchAgentService(connectors);
const summaryAgentService = new SummaryAgentService();
const searchOrchestratorService = new SearchOrchestratorService(
  searchAgentService,
  summaryAgentService
);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use('/api', createApiRouter({ searchAgentService, searchOrchestratorService }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', agents: connectors.length });
});

app.listen(appProperties.server.port, () => {
  console.log(`Server avviato su http://localhost:${appProperties.server.port}`);
});
