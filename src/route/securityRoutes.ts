import express, { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { debug } from '@util/debug';

const router = express.Router();

interface SectionVerificationRequest {
  sections: string[];
  timestamp: number;
  path: string;
}

// Expected sections for each route
const expectedSections: Record<string, string[]> = {
  '/': ['hero', 'services', 'testimonials', 'why-choose-us', 'service-areas', 'download-apps', 'quote-form'],
  '/services': ['hero', 'services', 'testimonials', 'why-choose-us', 'service-areas', 'download-apps', 'quote-form'],
  '/search': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/about': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/contact': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/booking': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/supplies': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/review': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/blog': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/refer': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/locations': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/tips': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/faq': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/terms': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/privacy': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/sitemap': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/signin': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form'],
  '/signup': ['hero', 'loading', 'error', 'content', 'search-results', 'quote-form']
};

// Rate limiting for security checks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/verify-sections', limiter, async (req: Request<{}, {}, SectionVerificationRequest>, res: Response) => {
  try {
    const { sections, timestamp, path } = req.body;
    
    // Validate request data
    if (!Array.isArray(sections) || !timestamp || !path) {
      debug.warn('Invalid section verification request:', { sections, timestamp, path });
      return res.status(400).json({ 
        isValid: false, 
        error: 'Invalid request data',
        details: {
          hasSections: Array.isArray(sections),
          hasTimestamp: !!timestamp,
          hasPath: !!path
        }
      });
    }

    // Get expected sections for the current path
    const expected = expectedSections[path] || [];
    
    // Check if sections match expected sections
    const isValid = sections.every(section => expected.includes(section)) &&
                   expected.every(section => sections.includes(section));

    // Log verification attempt
    debug.log('Section verification attempt:', {
      path,
      receivedSections: sections,
      expectedSections: expected,
      isValid,
      timestamp: new Date(timestamp).toISOString(),
      ip: req.ip
    });

    // Log suspicious activity
    if (!isValid) {
      debug.warn('Suspicious section modification detected:', {
        path,
        receivedSections: sections,
        expectedSections: expected,
        timestamp: new Date(timestamp).toISOString(),
        ip: req.ip
      });
    }

    res.json({ 
      isValid,
      details: {
        path,
        receivedSections: sections,
        expectedSections: expected,
        timestamp: new Date(timestamp).toISOString()
      }
    });
  } catch (error) {
    debug.error('Section verification error:', error);
    res.status(500).json({ 
      isValid: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 