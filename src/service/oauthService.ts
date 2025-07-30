import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { configManager } from '../config/app-config';
import { User } from '../model/userModel';
import { consoleLogger } from '../util/console-logger';
import { sendSuccess, sendError } from '../util/response-formatter';

interface OAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

class OAuthService {
  private googleClientId: string;
  private googleClientSecret: string;
  private facebookAppId: string;
  private facebookAppSecret: string;
  private jwtSecret: string;

  constructor() {
    const securityConfig = configManager.getSecurityConfig();
    this.googleClientId = securityConfig.oauth.google.clientId;
    this.googleClientSecret = securityConfig.oauth.google.clientSecret;
    this.facebookAppId = securityConfig.oauth.facebook.appId;
    this.facebookAppSecret = securityConfig.oauth.facebook.appSecret;
    this.jwtSecret = securityConfig.jwtSecret;
  }

  // Google OAuth
  async handleGoogleAuth(code: string): Promise<any> {
    try {
      consoleLogger.info('oauth', 'Processing Google OAuth', { code: code.substring(0, 10) + '...' });

      // Exchange code for tokens
      const tokens = await this.exchangeGoogleCode(code);
      
      // Get user info from Google
      const userInfo = await this.getGoogleUserInfo(tokens.access_token);
      
      // Find or create user
      const user = await this.findOrCreateUser('google', userInfo);
      
      // Generate JWT tokens
      const authTokens = this.generateAuthTokens(user);
      
      consoleLogger.success('Google OAuth successful', { userId: user._id, email: user.email });
      
      return {
        user,
        tokens: authTokens
      };
    } catch (error) {
      consoleLogger.error('oauth', 'Google OAuth failed', error);
      throw error;
    }
  }

  // Facebook OAuth
  async handleFacebookAuth(code: string): Promise<any> {
    try {
      consoleLogger.info('oauth', 'Processing Facebook OAuth', { code: code.substring(0, 10) + '...' });

      // Exchange code for tokens
      const tokens = await this.exchangeFacebookCode(code);
      
      // Get user info from Facebook
      const userInfo = await this.getFacebookUserInfo(tokens.access_token);
      
      // Find or create user
      const user = await this.findOrCreateUser('facebook', userInfo);
      
      // Generate JWT tokens
      const authTokens = this.generateAuthTokens(user);
      
      consoleLogger.success('Facebook OAuth successful', { userId: user._id, email: user.email });
      
      return {
        user,
        tokens: authTokens
      };
    } catch (error) {
      consoleLogger.error('oauth', 'Facebook OAuth failed', error);
      throw error;
    }
  }

  private async exchangeGoogleCode(code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: `${configManager.getApiConfig().baseUrl}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Google code for tokens');
    }

    return response.json();
  }

  private async exchangeFacebookCode(code: string): Promise<any> {
    const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const url = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    url.searchParams.append('client_id', this.facebookAppId);
    url.searchParams.append('client_secret', this.facebookAppSecret);
    url.searchParams.append('code', code);
    url.searchParams.append('redirect_uri', `${configManager.getApiConfig().baseUrl}/auth/facebook/callback`);

    const response2 = await fetch(url.toString());

    if (!response2.ok) {
      throw new Error('Failed to exchange Facebook code for tokens');
    }

    return response2.json();
  }

  private async getGoogleUserInfo(accessToken: string): Promise<OAuthUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Google user info');
    }

    const userData = await response.json() as any;
    
    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.given_name,
      lastName: userData.family_name,
      avatar: userData.picture
    };
  }

  private async getFacebookUserInfo(accessToken: string): Promise<OAuthUser> {
    const response = await fetch(`https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${accessToken}`);

    if (!response.ok) {
      throw new Error('Failed to get Facebook user info');
    }

    const userData = await response.json() as any;
    
    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      avatar: userData.picture?.data?.url
    };
  }

  private async findOrCreateUser(provider: 'google' | 'facebook', userInfo: OAuthUser): Promise<any> {
    // Check if user exists with this OAuth ID
    let user = await User.findByOAuth(provider, userInfo.id);
    
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();
      return user;
    }

    // Check if user exists with this email
    user = await User.findByEmail(userInfo.email);
    
    if (user) {
      // Link OAuth account to existing user
      user.oauthProvider = provider;
      user.oauthId = userInfo.id;
      user.avatar = userInfo.avatar || user.avatar;
      user.lastLogin = new Date();
      user.loginCount += 1;
      await user.save();
      return user;
    }

    // Create new user
    const newUser = new User({
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      phone: '', // Will be updated later
      avatar: userInfo.avatar,
      oauthProvider: provider,
      oauthId: userInfo.id,
      role: 'customer',
      isActive: true,
      isVerified: true, // OAuth users are pre-verified
      lastLogin: new Date(),
      loginCount: 1
    });

    await newUser.save();
    return newUser;
  }

  private generateAuthTokens(user: any): any {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      oauthProvider: user.oauthProvider
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: configManager.getSecurityConfig().jwtExpiresIn
    });

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: configManager.getSecurityConfig().jwtExpiresIn
    };
  }

  // Generate OAuth URLs
  getGoogleAuthUrl(): string {
    const baseUrl = configManager.getApiConfig().baseUrl;
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: `${baseUrl}/auth/google/callback`,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  getFacebookAuthUrl(): string {
    const baseUrl = configManager.getApiConfig().baseUrl;
    const params = new URLSearchParams({
      client_id: this.facebookAppId,
      redirect_uri: `${baseUrl}/auth/facebook/callback`,
      response_type: 'code',
      scope: 'email public_profile'
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      const authTokens = this.generateAuthTokens(user);
      
      consoleLogger.info('oauth', 'Token refreshed', { userId: user._id });
      
      return {
        user,
        tokens: authTokens
      };
    } catch (error) {
      consoleLogger.error('oauth', 'Token refresh failed', error);
      throw error;
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();

// Express route handlers
export const handleGoogleAuth = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return sendError(res, 'Authorization code required', 400);
    }

    const result = await oauthService.handleGoogleAuth(code);
    
    return sendSuccess(res, result, 'Google authentication successful');
  } catch (error) {
    consoleLogger.error('oauth', 'Google auth handler error', error);
    return sendError(res, 'Google authentication failed', 500);
  }
};

export const handleFacebookAuth = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return sendError(res, 'Authorization code required', 400);
    }

    const result = await oauthService.handleFacebookAuth(code);
    
    return sendSuccess(res, result, 'Facebook authentication successful');
  } catch (error) {
    consoleLogger.error('oauth', 'Facebook auth handler error', error);
    return sendError(res, 'Facebook authentication failed', 500);
  }
};

export const getGoogleAuthUrl = (req: Request, res: Response) => {
  const authUrl = oauthService.getGoogleAuthUrl();
  return sendSuccess(res, { authUrl }, 'Google auth URL generated');
};

export const getFacebookAuthUrl = (req: Request, res: Response) => {
  const authUrl = oauthService.getFacebookAuthUrl();
  return sendSuccess(res, { authUrl }, 'Facebook auth URL generated');
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    const result = await oauthService.refreshToken(refreshToken);
    
    return sendSuccess(res, result, 'Token refreshed successfully');
  } catch (error) {
    consoleLogger.error('oauth', 'Token refresh handler error', error);
    return sendError(res, 'Token refresh failed', 401);
  }
};

export default oauthService; 