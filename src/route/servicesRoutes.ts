import { Router } from 'express';
import { 
  getServices, 
  getServiceById, 
  generateQuote, 
  getServiceAnalytics 
} from '../controller/servicesController';
import { validateServiceSearch, validateQuoteGeneration, validateAnalyticsQuery } from '../middleware/validation';

const router = Router();

// Enhanced services API with filtering and search
// GET /services?search=residential&category=residential&sort=price&page=1&limit=10
router.get('/', validateServiceSearch, getServices);

// Service analytics and performance (must come before :serviceId route)
// GET /services/analytics?period=30d&groupBy=category
router.get('/analytics', validateAnalyticsQuery, getServiceAnalytics);

// Get specific service by ID
// GET /services/{serviceId}
router.get('/:serviceId', getServiceById);

// Dynamic pricing and quote generation
// POST /services/{serviceId}/quote
router.post('/:serviceId/quote', validateQuoteGeneration, generateQuote);

export default router; 