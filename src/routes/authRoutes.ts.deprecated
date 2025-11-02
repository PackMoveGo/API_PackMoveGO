import express, { Request, Response } from 'express';
import authDataService from '../service/authDataService';
import { logger, LogCategory } from '../util/logger';
// User tracking is now handled by Socket.IO

const router = express.Router();

/**
 * @route POST /auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    logger.auth(`Login attempt for: ${email}`, undefined, { ip: req.ip });

    const result = await authDataService.login({ email, password });

    if (result.success) {
      logger.success(`Login successful for: ${email}`);
      
      // User tracking is now handled by Socket.IO
      
      // Set JWT token in cookie
      res.cookie('jwt_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: result.user,
        token: result.token
      });
    } else {
      logger.failure(`Login failed for: ${email} - ${result.message}`);
      
      // User tracking is now handled by Socket.IO
      
      return res.status(401).json({
        success: false,
        message: result.message || 'Login failed'
      });
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Login error:', error as Error, { ip: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route POST /auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    logger.auth(`Registration attempt for: ${email}`, undefined, { ip: req.ip });

    const result = await authDataService.register({
      email,
      password,
      firstName,
      lastName,
      phone
    });

    if (result.success) {
      logger.success(`Registration successful for: ${email}`);
      
      // Set JWT token in cookie
      res.cookie('jwt_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: result.user,
        token: result.token
      });
    } else {
      logger.failure(`Registration failed for: ${email} - ${result.message}`);
      return res.status(400).json({
        success: false,
        message: result.message || 'Registration failed'
      });
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Registration error:', error as Error, { ip: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route POST /auth/logout
 * @desc Logout user
 * @access Public
 */
router.post('/logout', (req: Request, res: Response) => {
  try {
    logger.auth(`Logout request from: ${req.ip}`, undefined, { ip: req.ip });
    
    // Clear JWT token cookie
    res.clearCookie('jwt_token');
    
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Logout error:', error as Error, { ip: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', (req: Request, res: Response) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Get user info
    const user = authDataService.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.user(`User info requested for: ${user.email}`, undefined, { userId: user.id });

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (error) {
    logger.error(LogCategory.USER, 'Get user info error:', error as Error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /auth/verify
 * @desc Verify JWT token
 * @access Public
 */
router.get('/verify', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /auth/status
 * @desc Check authentication status
 * @access Public
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        message: 'No token provided'
      });
    }

    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        message: 'Invalid token'
      });
    }

    logger.auth(`Auth status check for user: ${decoded.email}`, undefined, { userId: decoded.id });

    return res.status(200).json({
      success: true,
      authenticated: true,
      message: 'User is authenticated',
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions
      }
    });
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Auth status check error:', error as Error);
    return res.status(200).json({
      success: false,
      authenticated: false,
      message: 'Authentication check failed'
    });
  }
});

/**
 * @route GET /auth/admin
 * @desc Check if user is admin
 * @access Private
 */
router.get('/admin', (req: Request, res: Response) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user is admin
    const isAdmin = authDataService.isAdmin(decoded.id);
    
    logger.admin(`Admin check for user ${decoded.email}: ${isAdmin}`, undefined, { userId: decoded.id });

    return res.status(200).json({
      success: true,
      isAdmin,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions
      }
    });
  } catch (error) {
    logger.error(LogCategory.ADMIN, 'Admin check error:', error as Error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /auth/users
 * @desc Get all users (admin only)
 * @access Private (Admin)
 */
router.get('/users', (req: Request, res: Response) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user is admin
    if (!authDataService.isAdmin(decoded.id)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const users = authDataService.getAllUsers();
    
    logger.admin(`Admin requested users list: ${users.length} users`, undefined, { userId: decoded.id });

    return res.status(200).json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    logger.error(LogCategory.ADMIN, 'Get users error:', error as Error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /auth/users/:id
 * @desc Get specific user info (admin or self)
 * @access Private
 */
router.get('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user is requesting their own info or is admin
    if (decoded.id !== id && !authDataService.isAdmin(decoded.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = authDataService.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.user(`User info requested for ID: ${id} by: ${decoded.email}`, undefined, { userId: decoded.id });

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (error) {
    logger.error(LogCategory.USER, 'Get user info error:', error as Error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /auth/profile
 * @desc Get current user's detailed profile
 * @access Private
 */
router.get('/profile', (req: Request, res: Response) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.jwt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = authDataService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Get user info
    const user = authDataService.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.user(`Profile requested for: ${user.email}`, undefined, { userId: user.id });

    // Calculate account age
    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const accountAge = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Format last login
    const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';

    return res.status(200).json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        role: user.role,
        isAdmin: user.role === 'admin',
        permissions: user.permissions,
        isActive: true, // All users are active in data-based system
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        accountAge: `${accountAge} days`,
        lastLoginFormatted: lastLogin,
        stats: {
          totalUsers: authDataService.isAdmin(decoded.id) ? authDataService.getAllUsers().length : null,
          permissionsCount: user.permissions.length,
          isVerified: true // Since we're using data files for now
        }
      }
    });
  } catch (error) {
    logger.error(LogCategory.USER, 'Get profile error:', error as Error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router; 