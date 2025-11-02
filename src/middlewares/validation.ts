import { Request, Response, NextFunction } from 'express';
const { body, param, query, validationResult } = require('express-validator');

export interface ValidationRule {
  field: string;
  validators: any[];
  optional?: boolean;
}

export interface ValidationConfig {
  body?: ValidationRule[];
  params?: ValidationRule[];
  query?: ValidationRule[];
}

/**
 * Creates validation middleware based on configuration
 */
export const createValidationMiddleware = (config: ValidationConfig) => {
  return [
    // Apply validators
    ...(config.body || []).map(rule => {
      const validators = rule.optional 
        ? [body(rule.field).optional(), ...rule.validators]
        : [body(rule.field), ...rule.validators];
      return validators;
    }).flat(),
    
    ...(config.params || []).map(rule => {
      const validators = rule.optional 
        ? [param(rule.field).optional(), ...rule.validators]
        : [param(rule.field), ...rule.validators];
      return validators;
    }).flat(),
    
    ...(config.query || []).map(rule => {
      const validators = rule.optional 
        ? [query(rule.field).optional(), ...rule.validators]
        : [query(rule.field), ...rule.validators];
      return validators;
    }).flat(),
    
    // Handle validation results
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map((error: any) => ({
            field: error.path,
            message: error.msg,
            value: error.value
          })),
          timestamp: new Date().toISOString()
        });
      }
      next();
    }
  ];
};

// Common validation rules
export const commonValidators = {
  // String validators
  requiredString: (field: string) => [
    body(field).notEmpty().withMessage(`${field} is required`),
    body(field).isString().withMessage(`${field} must be a string`),
    body(field).trim().isLength({ min: 1 }).withMessage(`${field} cannot be empty`)
  ],
  
  optionalString: (field: string) => [
    body(field).optional(),
    body(field).isString().withMessage(`${field} must be a string`),
    body(field).trim()
  ],
  
  // Email validation
  email: (field: string = 'email') => [
    body(field).isEmail().withMessage('Invalid email format'),
    body(field).normalizeEmail()
  ],
  
  // Password validation
  password: (field: string = 'password') => [
    body(field).isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body(field).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  
  // Phone validation
  phone: (field: string = 'phone') => [
    body(field).matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Invalid phone number format')
  ],
  
  // ZIP code validation
  zipCode: (field: string = 'zipCode') => [
    body(field).matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format')
  ],
  
  // Date validation
  date: (field: string = 'date') => [
    body(field).isISO8601().withMessage('Invalid date format (ISO 8601 required)')
  ],
  
  // Number validation
  positiveNumber: (field: string) => [
    body(field).isNumeric().withMessage(`${field} must be a number`),
    body(field).isFloat({ min: 0 }).withMessage(`${field} must be a positive number`)
  ],
  
  // ID validation
  mongoId: (field: string = 'id') => [
    param(field).isMongoId().withMessage('Invalid ID format')
  ],
  
  // UUID validation
  uuid: (field: string = 'id') => [
    param(field).isUUID().withMessage('Invalid UUID format')
  ],
  
  // Array validation
  array: (field: string) => [
    body(field).isArray().withMessage(`${field} must be an array`)
  ],
  
  // Object validation
  object: (field: string) => [
    body(field).isObject().withMessage(`${field} must be an object`)
  ],
  
  // Boolean validation
  boolean: (field: string) => [
    body(field).isBoolean().withMessage(`${field} must be a boolean`)
  ]
};

// Predefined validation schemas
export const validationSchemas = {
  // User registration
  userRegistration: {
    body: [
      { field: 'email', validators: commonValidators.email() },
      { field: 'password', validators: commonValidators.password() },
      { field: 'firstName', validators: commonValidators.requiredString('firstName') },
      { field: 'lastName', validators: commonValidators.requiredString('lastName') },
      { field: 'phone', validators: commonValidators.phone(), optional: true }
    ]
  },
  
  // User login
  userLogin: {
    body: [
      { field: 'email', validators: commonValidators.email() },
      { field: 'password', validators: [body('password').notEmpty().withMessage('Password is required')] }
    ]
  },
  
  // Quote generation
  quoteGeneration: {
    body: [
      { field: 'fromZip', validators: commonValidators.zipCode('fromZip') },
      { field: 'toZip', validators: commonValidators.zipCode('toZip') },
      { field: 'moveDate', validators: commonValidators.date('moveDate') },
      { field: 'rooms', validators: commonValidators.positiveNumber('rooms'), optional: true },
      { field: 'urgency', validators: [body('urgency').isIn(['standard', 'rush', 'flexible']).withMessage('Urgency must be standard, rush, or flexible')], optional: true }
    ],
    params: [
      { field: 'serviceId', validators: [param('serviceId').notEmpty().withMessage('Service ID is required')] }
    ]
  },
  
  // Service search
  serviceSearch: {
    query: [
      { field: 'search', validators: [query('search').optional().isString().withMessage('Search must be a string')] },
      { field: 'category', validators: [query('category').optional().isString().withMessage('Category must be a string')] },
      { field: 'sort', validators: [query('sort').optional().isIn(['price', 'name', 'popularity']).withMessage('Sort must be price, name, or popularity')] },
      { field: 'page', validators: [query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer')] },
      { field: 'limit', validators: [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')] }
    ]
  },
  
  // Analytics query
  analyticsQuery: {
    query: [
      { field: 'period', validators: [query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Period must be 7d, 30d, 90d, or 1y')] },
      { field: 'groupBy', validators: [query('groupBy').optional().isIn(['category', 'service', 'date']).withMessage('GroupBy must be category, service, or date')] }
    ]
  }
};

// Export validation middleware for each schema
export const validateUserRegistration = createValidationMiddleware(validationSchemas.userRegistration);
export const validateUserLogin = createValidationMiddleware(validationSchemas.userLogin);
export const validateQuoteGeneration = createValidationMiddleware(validationSchemas.quoteGeneration);
export const validateServiceSearch = createValidationMiddleware(validationSchemas.serviceSearch);
export const validateAnalyticsQuery = createValidationMiddleware(validationSchemas.analyticsQuery); 