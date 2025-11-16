import { config } from '../../config/env';

/**
 * Email Service for notifications
 * Sends email notifications for signin, booking confirmations, etc.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SigninNotificationParams {
  email: string;
  phone: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

class EmailService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured=!!(config.EMAIL_USER && config.EMAIL_PASSWORD);

    if(!this.isConfigured){
      console.warn('⚠️ Email not configured. Email notifications will be disabled.');
      console.warn('   Set EMAIL_USER and EMAIL_PASSWORD in .env to enable emails');
    }
  }

  /**
   * Send email (placeholder - requires nodemailer or similar)
   */
  async sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
    if(!this.isConfigured){
      console.warn('⚠️ Email not configured. Skipping email to:', to);
      console.log('📧 [WOULD SEND EMAIL]');
      console.log('   To:', to);
      console.log('   Subject:', subject);
      console.log('   Body:', text || html.substring(0, 100));
      return false;
    }

    try {
      // TODO: Implement actual email sending with nodemailer
      // For now, just log
      console.log('📧 [EMAIL] Would send to:', to);
      console.log('   Subject:', subject);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Send signin notification email
   */
  async sendSigninNotification({ email, phone, timestamp, ipAddress, userAgent }: SigninNotificationParams): Promise<boolean> {
    if(!email){
      console.log('📧 [EMAIL] No email address provided for signin notification');
      return false;
    }

    const subject='New Signin to Your PackMoveGo Account';
    const html=`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Signin Detected</h2>
        <p>Hi there,</p>
        <p>We detected a new signin to your PackMoveGo account:</p>
        <ul style="line-height: 1.8;">
          <li><strong>Time:</strong> ${timestamp.toLocaleString()}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          ${ipAddress ? `<li><strong>IP Address:</strong> ${ipAddress}</li>` : ''}
          ${userAgent ? `<li><strong>Device:</strong> ${userAgent}</li>` : ''}
        </ul>
        <p>If this wasn't you, please contact us immediately at:</p>
        <p><strong>(949) 414-5282</strong> or <a href="mailto:contact@packmovego.com">contact@packmovego.com</a></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated security notification from PackMoveGo.<br>
          You're receiving this because you signed in to your account.
        </p>
      </div>
    `;

    const text=`
New Signin to Your PackMoveGo Account

Time: ${timestamp.toLocaleString()}
Phone: ${phone}
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${userAgent ? `Device: ${userAgent}` : ''}

If this wasn't you, please contact us immediately at (949) 414-5282 or contact@packmovego.com
    `;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send verification code via email (as backup to SMS)
   */
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const subject='Your PackMoveGo Verification Code';
    const html=`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verification Code</h2>
        <p>Your PackMoveGo verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; color: #1f2937; margin: 0;">${code}</h1>
        </div>
        <p>This code expires in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    const text=`Your PackMoveGo verification code is: ${code}\n\nThis code expires in 10 minutes.`;

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService=new EmailService();
export default emailService;

