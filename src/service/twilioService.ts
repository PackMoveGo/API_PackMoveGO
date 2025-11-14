import { config } from '../../config/env';

/**
 * Twilio Service for SMS Authentication and Notifications
 * Handles phone verification, 2FA codes, and service notifications
 */

interface SendSMSParams {
  to: string;
  message: string;
}

interface SendVerificationCodeParams {
  phone: string;
  code: string;
}

class TwilioService {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private isConfigured: boolean;

  constructor() {
    this.accountSid=config.TWILIO_ACCOUNT_SID;
    this.authToken=config.TWILIO_AUTH_TOKEN;
    this.phoneNumber=config.TWILIO_PHONE_NUMBER;
    this.isConfigured=!!(this.accountSid && this.authToken);

    if(!this.isConfigured){
      console.warn('⚠️ Twilio not configured. SMS features will be disabled.');
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS({ to, message }: SendSMSParams): Promise<boolean> {
    if(!this.isConfigured){
      console.warn('⚠️ Twilio not configured. Skipping SMS to:', to);
      return false;
    }

    try {
      // Using Twilio REST API directly
      const url=`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const params=new URLSearchParams();
      params.append('To', to);
      params.append('From', this.phoneNumber || 'PackMoveGo');
      params.append('Body', message);

      const response=await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if(!response.ok){
        const error=await response.text();
        console.error('❌ Twilio SMS failed:', error);
        return false;
      }

      const result=await response.json() as any;
      console.log('✅ SMS sent successfully:', result.sid || 'SMS sent');
      return true;
    }catch(error){
      console.error('❌ Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode({ phone, code }: SendVerificationCodeParams): Promise<boolean> {
    const message=`Your PackMoveGo verification code is: ${code}. This code expires in 10 minutes.`;
    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send login notification via SMS
   */
  async sendLoginNotification(phone: string, location?: string): Promise<boolean> {
    const locationText=location ? ` from ${location}` : '';
    const message=`New login to your PackMoveGo account${locationText}. If this wasn't you, please contact support immediately.`;
    return this.sendSMS({ to: phone, message });
  }

  /**
   * Send booking confirmation via SMS
   */
  async sendBookingConfirmation(phone: string, bookingId: string, date: string): Promise<boolean> {
    const message=`Your PackMoveGo booking #${bookingId} is confirmed for ${date}. We'll send you updates as your move date approaches.`;
    return this.sendSMS({ to: phone, message });
  }

  /**
   * Generate random 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random()*900000).toString();
  }

  /**
   * Check if Twilio is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const twilioService=new TwilioService();
export default twilioService;

