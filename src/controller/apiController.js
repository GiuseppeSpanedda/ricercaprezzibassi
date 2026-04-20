import express from 'express';

export function createApiRouter({ searchAgentService, searchOrchestratorService }) {
  const router = express.Router();

  router.post('/search-agent', async (req, res) => {
    try {
      const data = await searchAgentService.search(req.body || {});
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/search', async (req, res) => {
    try {
      const data = await searchOrchestratorService.execute(req.body || {});
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
