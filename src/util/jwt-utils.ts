import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

export class JWTUtils {
  private static readonly ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'fallback_access_secret';
  private static readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback_refresh_secret';
  private static readonly ACCESS_EXPIRES_IN = '15m'; // Short-lived access tokens
  private static readonly REFRESH_EXPIRES_IN = '7d'; // Long-lived refresh tokens

  /**
   * Generate an access token for a user
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRES_IN,
      issuer: 'packmovego-api',
      audience: 'packmovego-frontend',
      algorithm: 'HS256'
    });
  }

  /**
   * Generate a refresh token for a user
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRES_IN,
      issuer: 'packmovego-api',
      audience: 'packmovego-frontend',
      algorithm: 'HS256'
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    const tokenId = crypto.randomBytes(16).toString('hex');

    return {
      accessToken,
      refreshToken,
      tokenId
    };
  }

  /**
   * Verify an access token
   */
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.ACCESS_SECRET, {
        issuer: 'packmovego-api',
        audience: 'packmovego-frontend',
        algorithms: ['HS256']
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      // Silently fail for optional auth - no need to log every invalid token
      return null;
    }
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.REFRESH_SECRET, {
        issuer: 'packmovego-api',
        audience: 'packmovego-frontend',
        algorithms: ['HS256']
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      // Silently fail for optional auth - no need to log every invalid token
      return null;
    }
  }

  /**
   * Verify any JWT token (legacy support)
   */
  static verifyToken(token: string): JWTPayload | null {
    // Try access token first
    let decoded = this.verifyAccessToken(token);
    if (decoded) return decoded;

    // Try refresh token
    decoded = this.verifyRefreshToken(token);
    if (decoded) return decoded;

    // Try with legacy secret
    try {
      const legacySecret = process.env.JWT_SECRET || 'fallback_secret';
      const legacyDecoded = jwt.verify(token, legacySecret) as JWTPayload;
      return legacyDecoded;
    } catch (error) {
      // Silently fail for optional auth - no need to log every invalid token
      return null;
    }
  }

  /**
   * Hash a token for storage (for refresh token tracking)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Check if a token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  static refreshAccessToken(refreshToken: string): string | null {
    const decoded = this.verifyRefreshToken(refreshToken);
    if (!decoded) return null;

    // Generate new access token
    return this.generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    });
  }

  /**
   * Decode token without verification (for logging purposes)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get token type (access, refresh, or unknown)
   */
  static getTokenType(token: string): 'access' | 'refresh' | 'unknown' {
    if (this.verifyAccessToken(token)) return 'access';
    if (this.verifyRefreshToken(token)) return 'refresh';
    return 'unknown';
  }
}

export default JWTUtils; 