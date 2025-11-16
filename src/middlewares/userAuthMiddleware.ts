import { Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../util/jwt-helper';
import { AuthRequest } from '../controllers/userAuthController';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate=async (req: AuthRequest, res: Response, next: NextFunction)=>{
    try {
        // Extract token from Authorization header
        const authHeader=req.headers.authorization;
        const token=extractTokenFromHeader(authHeader);
        
        if(!token){
            return res.status(401).json({
                success: false,
                message: 'No authentication token provided'
            });
        }
        
        // Verify token
        const payload=verifyAccessToken(token);
        if(!payload){
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        // Attach user info to request
        req.user={
            userId: payload.userId,
            email: payload.email || '',
            role: payload.role
        };
        
        return next();
    } catch(error: any){
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
};

/**
 * Middleware to check if user has required role
 */
export const authorize=(...allowedRoles: string[])=>{
    return (req: AuthRequest, res: Response, next: NextFunction)=>{
        if(!req.user){
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }
        
        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        
        return next();
    };
};

/**
 * Optional authentication - attaches user if token is valid but doesn't fail if missing
 */
export const optionalAuth=async (req: AuthRequest, _res: Response, next: NextFunction)=>{
    try {
        const authHeader=req.headers.authorization;
        const token=extractTokenFromHeader(authHeader);
        
        if(token){
            const payload=verifyAccessToken(token);
            if(payload){
                req.user={
                    userId: payload.userId,
                    email: payload.email || '',
                    role: payload.role
                };
            }
        }
        
        next();
    } catch(error){
        // Continue without authentication
        next();
    }
};

