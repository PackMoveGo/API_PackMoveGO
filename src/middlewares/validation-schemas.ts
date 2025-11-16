/**
 * Centralized Validation Schemas
 * Comprehensive validation for all API endpoints
 */

import{body,param,query} from 'express-validator';

export const authValidation={
  // Sign up
  signUp:[
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({min:8,max:128}).withMessage('Password must be 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('name').optional().isString().trim().isLength({min:2,max:100}).withMessage('Name must be 2-100 characters'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Invalid phone format'),
    body('location').optional().isObject(),
    body('location.city').optional().isString().trim().isLength({max:100}),
    body('location.state').optional().isString().trim().isLength({max:100}),
    body('location.country').optional().isString().trim().isLength({max:100}),
    body('location.latitude').optional().isFloat({min:-90,max:90}),
    body('location.longitude').optional().isFloat({min:-180,max:180})
  ],

  // Sign in
  signIn:[
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    body('location').optional().isObject()
  ],

  // SMS sign in request
  requestSmsSignin:[
    body('phone')
      .custom((value) => {
        // Strip all non-digit characters
        const digits = value.replace(/\D/g, '');
        // Must be exactly 10 digits
        if (digits.length !== 10) {
          throw new Error('Phone number must be exactly 10 digits');
        }
        return true;
      })
      .withMessage('Phone number must be exactly 10 digits'),
    body('username').optional().isString().trim().isLength({min:3,max:50})
  ],

  // Verify SMS code
  verifySmsCode:[
    body('phone')
      .custom((value) => {
        // Strip all non-digit characters
        const digits = value.replace(/\D/g, '');
        // Must be exactly 10 digits
        if (digits.length !== 10) {
          throw new Error('Phone number must be exactly 10 digits');
        }
        return true;
      })
      .withMessage('Phone number must be exactly 10 digits'),
    body('code').matches(/^\d{8}$/).withMessage('8-digit code required')
  ],

  // Refresh token
  refreshToken:[
    body('refreshToken').isString().notEmpty().withMessage('Refresh token required')
  ],

  // Password reset request
  passwordResetRequest:[
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],

  // Password reset
  passwordReset:[
    body('token').isString().isLength({min:32}).withMessage('Valid reset token required'),
    body('password')
      .isLength({min:8,max:128})
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/)
      .withMessage('Strong password required')
  ],

  // Change password
  changePassword:[
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({min:8,max:128})
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/)
      .withMessage('Strong password required')
  ]
};

export const bookingValidation={
  create:[
    body('serviceId').isMongoId().withMessage('Valid service ID required'),
    body('pickupAddress').isObject().withMessage('Pickup address required'),
    body('pickupAddress.street').isString().trim().notEmpty(),
    body('pickupAddress.city').isString().trim().notEmpty(),
    body('pickupAddress.state').isString().trim().isLength({min:2,max:2}),
    body('pickupAddress.zipCode').matches(/^\d{5}(-\d{4})?$/),
    body('deliveryAddress').isObject().withMessage('Delivery address required'),
    body('deliveryAddress.street').isString().trim().notEmpty(),
    body('deliveryAddress.city').isString().trim().notEmpty(),
    body('deliveryAddress.state').isString().trim().isLength({min:2,max:2}),
    body('deliveryAddress.zipCode').matches(/^\d{5}(-\d{4})?$/),
    body('moveDate').isISO8601().withMessage('Valid ISO date required'),
    body('rooms').optional().isInt({min:1,max:20}).withMessage('Rooms must be 1-20'),
    body('urgency').optional().isIn(['standard','rush','flexible'])
  ],

  update:[
    param('id').isMongoId().withMessage('Valid booking ID required'),
    body('status').optional().isIn(['pending','confirmed','in_progress','completed','cancelled']),
    body('moveDate').optional().isISO8601(),
    body('notes').optional().isString().trim().isLength({max:1000})
  ],

  get:[
    param('id').isMongoId().withMessage('Valid booking ID required')
  ],

  list:[
    query('status').optional().isIn(['pending','confirmed','in_progress','completed','cancelled']),
    query('page').optional().isInt({min:1}).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({min:1,max:100}).withMessage('Limit must be 1-100')
  ]
};

export const paymentValidation={
  createPaymentIntent:[
    body('bookingId').isMongoId().withMessage('Valid booking ID required'),
    body('amount').isFloat({min:0.01}).withMessage('Valid amount required'),
    body('currency').optional().isIn(['usd']).withMessage('Currency must be USD')
  ],

  confirmPayment:[
    body('paymentIntentId').isString().notEmpty().withMessage('Payment intent ID required'),
    body('paymentMethodId').isString().notEmpty().withMessage('Payment method ID required')
  ],

  refund:[
    param('id').isMongoId().withMessage('Valid payment ID required'),
    body('amount').optional().isFloat({min:0.01}),
    body('reason').isString().trim().isLength({min:10,max:500})
  ]
};

export const quoteValidation={
  generate:[
    body('fromZip').matches(/^\d{5}(-\d{4})?$/).withMessage('Valid from ZIP required'),
    body('toZip').matches(/^\d{5}(-\d{4})?$/).withMessage('Valid to ZIP required'),
    body('moveDate').isISO8601().withMessage('Valid ISO date required'),
    body('rooms').optional().isInt({min:1,max:20}),
    body('urgency').optional().isIn(['standard','rush','flexible']),
    body('items').optional().isArray(),
    body('items.*.name').optional().isString().trim().isLength({max:100}),
    body('items.*.quantity').optional().isInt({min:1,max:100})
  ],

  get:[
    param('id').isMongoId().withMessage('Valid quote ID required')
  ]
};

export const userValidation={
  create:[
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('firstName').isString().trim().isLength({min:2,max:50}),
    body('lastName').isString().trim().isLength({min:2,max:50}),
    body('phone').matches(/^\+?[\d\s\-\(\)]+$/),
    body('role').isIn(['customer','mover','admin','manager']),
    body('password').optional()
      .isLength({min:8,max:128})
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/)
  ],

  update:[
    param('id').isMongoId().withMessage('Valid user ID required'),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().isString().trim().isLength({min:2,max:50}),
    body('lastName').optional().isString().trim().isLength({min:2,max:50}),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/),
    body('isActive').optional().isBoolean()
  ],

  get:[
    param('id').isMongoId().withMessage('Valid user ID required')
  ],

  list:[
    query('role').optional().isIn(['customer','mover','admin','manager']),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({min:1}),
    query('limit').optional().isInt({min:1,max:100}),
    query('search').optional().isString().trim().isLength({max:100})
  ]
};

export const contactValidation={
  submit:[
    body('name').isString().trim().isLength({min:2,max:100}).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/),
    body('message').isString().trim().isLength({min:10,max:2000}).withMessage('Message must be 10-2000 characters'),
    body('subject').optional().isString().trim().isLength({max:200})
  ]
};

export const referralValidation={
  create:[
    body('referrerEmail').isEmail().normalizeEmail(),
    body('referredEmail').isEmail().normalizeEmail(),
    body('referredName').isString().trim().isLength({min:2,max:100})
  ]
};

export const searchValidation={
  search:[
    query('q').isString().trim().isLength({min:1,max:200}).withMessage('Search query required'),
    query('type').optional().isIn(['services','locations','content']),
    query('limit').optional().isInt({min:1,max:50})
  ]
};

export const subscriptionValidation={
  create:[
    body('email').isEmail().normalizeEmail(),
    body('plan').isIn(['basic','pro','enterprise']),
    body('paymentMethodId').isString().notEmpty()
  ],

  update:[
    param('id').isMongoId(),
    body('plan').optional().isIn(['basic','pro','enterprise']),
    body('status').optional().isIn(['active','paused','cancelled'])
  ]
};

export const workflowValidation={
  create:[
    body('name').isString().trim().isLength({min:3,max:100}),
    body('description').optional().isString().trim().isLength({max:500}),
    body('steps').isArray({min:1}),
    body('steps.*.name').isString().trim().isLength({min:3,max:100}),
    body('steps.*.type').isIn(['manual','automated','approval'])
  ],

  update:[
    param('id').isMongoId(),
    body('name').optional().isString().trim().isLength({min:3,max:100}),
    body('status').optional().isIn(['active','inactive','archived'])
  ]
};

export const chatValidation={
  sendMessage:[
    body('bookingId').isMongoId(),
    body('message').isString().trim().isLength({min:1,max:1000}),
    body('attachments').optional().isArray({max:5})
  ],

  getMessages:[
    param('bookingId').isMongoId(),
    query('page').optional().isInt({min:1}),
    query('limit').optional().isInt({min:1,max:100})
  ]
};

// Export all validation schemas
export default{
  auth:authValidation,
  booking:bookingValidation,
  payment:paymentValidation,
  quote:quoteValidation,
  user:userValidation,
  contact:contactValidation,
  referral:referralValidation,
  search:searchValidation,
  subscription:subscriptionValidation,
  workflow:workflowValidation,
  chat:chatValidation
};

