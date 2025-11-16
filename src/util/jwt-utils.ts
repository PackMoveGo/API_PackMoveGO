import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import TokenBlacklist from '../models/tokenBlacklistModel';

export interface JWTPayload {
  userId: string;
  email?: string;
  phone?: string;
  username?: string;
  role: string;
  permissions?: string[];
  fingerprint?: string; // Device fingerprint for additional security
  tokenFamily?: string; // For refresh token rotation
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  fingerprint: string;
}

export class JWTUtils {
  // Enforce environment variables - no fallbacks for security
  private static readonly ACCESS_SECRET = process.env['JWT_ACCESS_SECRET'] || process.env['JWT_SECRET'];
  private static readonly REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || process.env['JWT_SECRET'];
  private static readonly ACCESS_EXPIRES_IN = '15m'; // Short-lived access tokens
  private static readonly REFRESH_EXPIRES_IN = '7d'; // Long-lived refresh tokens

  // Validate secrets on class initialization
  static {
    if (!this.ACCESS_SECRET || this.ACCESS_SECRET.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be set and at least 32 characters long');
    }
    if (!this.REFRESH_SECRET || this.REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
    }
  }

  /**
   * Generate device fingerprint from user agent and IP
   */
  static generateFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate token family ID for refresh token rotation
   */
  static generateTokenFamily(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate an access token for a user
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    if (!this.ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
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
    if (!this.REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRES_IN,
      issuer: 'packmovego-api',
      audience: 'packmovego-frontend',
      algorithm: 'HS256'
    });
  }

  /**
   * Generate both access and refresh tokens with fingerprinting
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>, userAgent?: string, ipAddress?: string): TokenPair {
    const tokenFamily = payload.tokenFamily || this.generateTokenFamily();
    const fingerprint = (userAgent && ipAddress) ? this.generateFingerprint(userAgent, ipAddress) : '';
    
    const enhancedPayload = {
      ...payload,
      tokenFamily,
      fingerprint
    };

    const accessToken = this.generateAccessToken(enhancedPayload);
    const refreshToken = this.generateRefreshToken(enhancedPayload);
    const tokenId = crypto.randomBytes(16).toString('hex');

    return {
      accessToken,
      refreshToken,
      tokenId,
      fingerprint
    };
  }

  /**
   * Verify an access token and check blacklist
   */
  static async verifyAccessToken(token: string, checkBlacklist: boolean = true): Promise<JWTPayload | null> {
    try {
      if (!this.ACCESS_SECRET) {
        return null;
      }

      const decoded = jwt.verify(token, this.ACCESS_SECRET, {
        issuer: 'packmovego-api',
        audience: 'packmovego-frontend',
        algorithms: ['HS256']
      }) as JWTPayload;
      
      // Check if token is blacklisted
      if (checkBlacklist) {
        const tokenHash = this.hashToken(token);
        const isBlacklisted = await TokenBlacklist.isBlacklisted(tokenHash);
        if (isBlacklisted) {
          return null;
        }
      }
      
      return decoded;
    } catch (error) {
      // Silently fail for optional auth - no need to log every invalid token
      return null;
    }
  }

  /**
   * Verify a refresh token and check blacklist
   */
  static async verifyRefreshToken(token: string, checkBlacklist: boolean = true): Promise<JWTPayload | null> {
    try {
      if (!this.REFRESH_SECRET) {
        return null;
      }

      const decoded = jwt.verify(token, this.REFRESH_SECRET, {
        issuer: 'packmovego-api',
        audience: 'packmovego-frontend',
        algorithms: ['HS256']
      }) as JWTPayload;
      
      // Check if token is blacklisted
      if (checkBlacklist) {
        const tokenHash = this.hashToken(token);
        const isBlacklisted = await TokenBlacklist.isBlacklisted(tokenHash);
        if (isBlacklisted) {
          return null;
        }
      }
      
      return decoded;
    } catch (error) {
      // Silently fail for optional auth - no need to log every invalid token
      return null;
    }
  }

  /**
   * Verify any JWT token (legacy support) - async version
   */
  static async verifyToken(token: string, checkBlacklist: boolean = true): Promise<JWTPayload | null> {
    // Try access token first
    let decoded = await this.verifyAccessToken(token, checkBlacklist);
    if (decoded) return decoded;

    // Try refresh token
    decoded = await this.verifyRefreshToken(token, checkBlacklist);
    if (decoded) return decoded;

    // Try with legacy secret (no fallback)
    try {
      if (!process.env['JWT_SECRET']) {
        return null;
      }
      const legacyDecoded = jwt.verify(token, process.env['JWT_SECRET']) as JWTPayload;
      
      // Check blacklist for legacy tokens too
      if (checkBlacklist) {
        const tokenHash = this.hashToken(token);
        const isBlacklisted = await TokenBlacklist.isBlacklisted(tokenHash);
        if (isBlacklisted) {
          return null;
        }
      }
      
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
   * Refresh an access token using a refresh token with rotation
   */
  static async refreshAccessToken(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<TokenPair | null> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    if (!decoded) return null;

    // Verify fingerprint if provided
    if (decoded.fingerprint && userAgent && ipAddress) {
      const currentFingerprint = this.generateFingerprint(userAgent, ipAddress);
      if (decoded.fingerprint !== currentFingerprint) {
        // Suspicious activity - fingerprint mismatch
        // Blacklist the old refresh token
        const tokenHash = this.hashToken(refreshToken);
        const expiration = this.getTokenExpiration(refreshToken);
        if (expiration) {
          await TokenBlacklist.blacklistToken(tokenHash, decoded.userId, 'security', expiration);
        }
        return null;
      }
    }

    // Blacklist old refresh token (rotation)
    const oldTokenHash = this.hashToken(refreshToken);
    const expiration = this.getTokenExpiration(refreshToken);
    if (expiration) {
      await TokenBlacklist.blacklistToken(oldTokenHash, decoded.userId, 'revoked', expiration);
    }

    // Generate new token pair with same family
    return this.generateTokenPair({
      userId: decoded.userId,
      email: decoded.email,
      phone: decoded.phone,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions,
      tokenFamily: decoded.tokenFamily
    }, userAgent, ipAddress);
  }

  /**
   * Blacklist a token (for logout/security)
   */
  static async blacklistToken(token: string, userId: string, reason: string = 'logout'): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiration = this.getTokenExpiration(token);
    if (expiration && expiration > new Date()) {
      await TokenBlacklist.blacklistToken(tokenHash, userId, reason, expiration);
    }
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId: string, reason: string = 'security'): Promise<number> {
    return await TokenBlacklist.revokeUserTokens(userId, reason);
  }

  /**
   * Verify fingerprint matches
   */
  static verifyFingerprint(token: string, userAgent: string, ipAddress: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.fingerprint) return true; // No fingerprint to verify
      
      const currentFingerprint = this.generateFingerprint(userAgent, ipAddress);
      return decoded.fingerprint === currentFingerprint;
    } catch (error) {
      return false;
    }
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
   * Get token type (access, refresh, or unknown) - async version
   */
  static async getTokenType(token: string): Promise<'access' | 'refresh' | 'unknown'> {
    if (await this.verifyAccessToken(token, false)) return 'access';
    if (await this.verifyRefreshToken(token, false)) return 'refresh';
    return 'unknown';
  }

  /**
   * Verify token hash (for password reset, email verification)
   */
  static verifyTokenHash(token: string, hash: string): boolean {
    return this.hashToken(token) === hash;
  }

  /**
   * Generate OAuth state token
   */
  static generateOAuthStateToken(): string {
    return this.generateSecureToken(32);
  }
}

export default JWTUtils; 