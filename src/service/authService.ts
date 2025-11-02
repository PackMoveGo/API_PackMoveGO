import User, { IUser } from '../models/userModel';
import JWTUtils from '../util/jwt-utils';
import OAuthService, { oauthService } from './oauthService';
import crypto from 'crypto';

export interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new User({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      password: data.password,
      phone: data.phone,
      role: 'user',
      isEmailVerified: false,
      isPhoneVerified: false
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // TODO: Send verification email
    console.log(`Email verification token: ${verificationToken}`);

    // Generate tokens
    const { accessToken, refreshToken, tokenId } = JWTUtils.generateTokenPair({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role
    });

    // Store refresh token
    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(JWTUtils.hashToken(refreshToken));
    await user.save();

    return { user, accessToken, refreshToken };
  }

  /**
   * Login user with email and password
   */
  static async login(data: LoginData): Promise<AuthResult> {
    // Find user with password included
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new Error('Account is temporarily locked due to too many failed login attempts');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(data.password);
    if (!isValidPassword) {
      // Increment login attempts
      await user.incrementLoginAttempts();
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const { accessToken, refreshToken, tokenId } = JWTUtils.generateTokenPair({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role
    });

    // Store refresh token
    if (!user.refreshTokens) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(JWTUtils.hashToken(refreshToken));
    await user.save();

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);
      
      // Find user
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }
      const user = await User.findById(decoded.userId).select('+refreshTokens');
      if (!user) {
        throw new Error('User not found');
      }

      // Check if refresh token exists in user's tokens
      const tokenHash = JWTUtils.hashToken(refreshToken);
      const tokenExists = user.refreshTokens.some(token => 
        JWTUtils.verifyTokenHash(refreshToken, token)
      );

      if (!tokenExists) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = JWTUtils.generateAccessToken({
        userId: (user._id as any).toString(),
        email: user.email,
        role: user.role
      });

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user and invalidate refresh token
   */
  static async logout(userId: string, refreshToken: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
      throw new Error('User not found');
    }

    // Remove refresh token from user's tokens
    const tokenHash = JWTUtils.hashToken(refreshToken);
    user.refreshTokens = user.refreshTokens.filter(token => 
      !JWTUtils.verifyTokenHash(refreshToken, token)
    );
    await user.save();
  }

  /**
   * Logout user from all devices
   */
  static async logoutAllDevices(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Clear all refresh tokens
    user.refreshTokens = [];
    await user.save();
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<string> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return 'If an account with this email exists, a password reset link has been sent.';
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send password reset email
    console.log(`Password reset token: ${resetToken}`);

    return 'If an account with this email exists, a password reset link has been sent.';
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired password reset token');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  }

  /**
   * Verify email using token
   */
  static async verifyEmail(token: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired email verification token');
    }

    // Mark email as verified
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(email: string): Promise<string> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return 'If an account with this email exists, a verification link has been sent.';
    }

    if (user.isEmailVerified()) {
      return 'Email is already verified.';
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // TODO: Send verification email
    console.log(`Email verification token: ${verificationToken}`);

    return 'If an account with this email exists, a verification link has been sent.';
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updates: Partial<IUser>): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update allowed fields
    if (updates.firstName) user.firstName = updates.firstName;
    if (updates.lastName) user.lastName = updates.lastName;
    if (updates.phone) user.phone = updates.phone;

    await user.save();
    return user;
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Password is incorrect');
    }

    // Delete user
    await User.findByIdAndDelete(userId);
  }

  /**
   * Handle OAuth login
   */
  static async oauthLogin(provider: string, code: string): Promise<AuthResult> {
    if (provider === 'google') {
      const result = await oauthService.handleGoogleAuth(code);
      return result;
    } else if (provider === 'facebook') {
      const result = await oauthService.handleFacebookAuth(code);
      return result;
    }
    throw new Error('Unsupported OAuth provider');
  }

  /**
   * Get OAuth URL
   */
  static getOAuthUrl(provider: string): { url: string; state: string } {
    const state = JWTUtils.generateOAuthStateToken();
    let url: string;
    if (provider === 'google') {
      url = oauthService.getGoogleAuthUrl();
    } else if (provider === 'facebook') {
      url = oauthService.getFacebookAuthUrl();
    } else {
      throw new Error('Unsupported OAuth provider');
    }
    return { url, state };
  }
}

export default AuthService; 