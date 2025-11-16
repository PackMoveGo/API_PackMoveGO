import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

// JWT payload interface
export interface JWTPayload {
    userId: string;
    email: string;
    role: 'customer' | 'mover' | 'shiftlead' | 'admin' | 'manager';
    iat?: number;
    exp?: number;
}

// JWT secret from environment
const JWT_SECRET=config.JWT_SECRET || 'pack-move-go-secret-key-change-in-production';
const JWT_EXPIRES_IN='7d'; // 7 days
const JWT_REFRESH_EXPIRES_IN='30d'; // 30 days

/**
 * Generate access token
 */
export const generateAccessToken=(payload: Omit<JWTPayload, 'iat' | 'exp'>): string=>{
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken=(payload: Omit<JWTPayload, 'iat' | 'exp'>): string=>{
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN
    });
};

/**
 * Verify access token
 */
export const verifyAccessToken=(token: string): JWTPayload | null=>{
    try {
        const decoded=jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch(error){
        console.error('JWT verification failed:', error);
        return null;
    }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken=(token: string): JWTPayload | null=>{
    try {
        const decoded=jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch(error){
        console.error('JWT refresh token verification failed:', error);
        return null;
    }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken=(token: string): JWTPayload | null=>{
    try {
        const decoded=jwt.decode(token) as JWTPayload;
        return decoded;
    } catch(error){
        console.error('JWT decode failed:', error);
        return null;
    }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair=(payload: Omit<JWTPayload, 'iat' | 'exp'>)=>{
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader=(authHeader: string | undefined): string | null=>{
    if(!authHeader){
        return null;
    }
    
    // Format: "Bearer <token>"
    const parts=authHeader.split(' ');
    if(parts.length!==2 || parts[0]!=='Bearer'){
        return null;
    }
    
    return parts[1] || null;
};

