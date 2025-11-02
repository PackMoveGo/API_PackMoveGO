import express from 'express';
const { check, validationResult } = require('express-validator');

const router = express.Router();

// In-memory storage for demo purposes
// In production, this should be replaced with database storage
let subscribers: Array<{
  id: string;
  name: string;
  email: string;
  timestamp: string;
  sessionId: string;
  userAgent: string;
}> = [];

// Validation middleware
const validateRegistration = [
  check('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  check('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  check('sessionId').optional().isString().withMessage('Session ID must be a string'),
  check('timestamp').optional().isISO8601().withMessage('Timestamp must be a valid ISO date'),
  check('userAgent').optional().isString().withMessage('User agent must be a string')
];

// POST /api/prelaunch/register
router.post('/prelaunch/register', validateRegistration, async (req: express.Request, res: express.Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, sessionId, timestamp, userAgent } = req.body;

    // Check if email already exists
    const existingSubscriber = subscribers.find(sub => 
      sub.email.toLowerCase() === email.toLowerCase()
    );

    if (existingSubscriber) {
      return res.status(409).json({
        success: false,
        message: 'This email has already been registered'
      });
    }

    // Create new subscriber
    const newSubscriber = {
      id: Date.now().toString(),
      name: name || '',
      email: email.toLowerCase(),
      timestamp: timestamp || new Date().toISOString(),
      sessionId: sessionId || '',
      userAgent: userAgent || ''
    };

    subscribers.push(newSubscriber);

    console.log('New prelaunch registration:', {
      email: newSubscriber.email,
      name: newSubscriber.name,
      timestamp: newSubscriber.timestamp
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for signing up! You\'ll receive your 30% off code and lifetime deal details soon.',
      data: {
        id: newSubscriber.id,
        email: newSubscriber.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

// GET /api/prelaunch/subscribers
router.get('/prelaunch/subscribers', async (req: express.Request, res: express.Response) => {
  try {
    const currentCount = subscribers.length;
    
    // Calculate average submissions per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSubscribers = subscribers.filter(sub => 
      new Date(sub.timestamp) > sevenDaysAgo
    );
    
    const averageSubmissions = recentSubscribers.length > 0 
      ? Math.round(recentSubscribers.length / 7) 
      : 0;

    res.json({
      success: true,
      data: {
        currentCount,
        averageSubmissions,
        lastUpdated: new Date().toISOString(),
        totalSubscribers: currentCount
      }
    });

  } catch (error) {
    console.error('Error fetching subscriber data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriber data'
    });
  }
});

// GET /api/prelaunch/early_subscribers (alias for subscribers)
router.get('/prelaunch/early_subscribers', async (req: express.Request, res: express.Response) => {
  // Redirect to the subscribers endpoint
  return res.redirect('/api/prelaunch/subscribers');
});

export default router; 