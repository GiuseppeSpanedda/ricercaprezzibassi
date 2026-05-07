import { Router } from 'express';
import { searchOffers, summarizeOffers } from '../controllers/agentController.js';

export const agentRoutes = Router();

agentRoutes.post('/search', searchOffers);
agentRoutes.post('/summary', summarizeOffers);
