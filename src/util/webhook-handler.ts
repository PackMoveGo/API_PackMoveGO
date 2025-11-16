import { Request, Response } from 'express';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

interface WebhookConfig {
  secret: string;
  allowedEvents: string[];
  verifySignature: boolean;
}

class WebhookHandler {
  private config: WebhookConfig;
  
  constructor() {
    this.config = {
      secret: process.env['WEBHOOK_SECRET'] || 'default-webhook-secret',
      allowedEvents: [
        'deployment.started',
        'deployment.completed', 
        'deployment.failed',
        'health.check',
        'performance.alert',
        'security.alert',
        'backup.completed',
        'rate.limit.exceeded'
      ],
      verifySignature: process.env['NODE_ENV'] === 'production'
    };
  }

  // Verify webhook signature
  private verifySignature(payload: string, signature: string): boolean {
    if (!this.config.verifySignature) return true;
    
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Handle incoming webhooks
  handleWebhook = async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-webhook-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      // Verify signature if required
      if (this.config.verifySignature && !this.verifySignature(payload, signature)) {
        console.warn('🚫 Webhook signature verification failed');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          timestamp: new Date().toISOString()
        });
      }

      const webhookData: WebhookPayload = req.body;
      
      // Validate event type
      if (!this.config.allowedEvents.includes(webhookData.event)) {
        console.warn(`🚫 Unknown webhook event: ${webhookData.event}`);
        return res.status(400).json({
          success: false,
          error: 'Unknown event type',
          allowedEvents: this.config.allowedEvents,
          timestamp: new Date().toISOString()
        });
      }

      // Process the webhook
      await this.processWebhook(webhookData);
      
      console.log(`✅ Webhook processed: ${webhookData.event}`);
      return res.json({
        success: true,
        event: webhookData.event,
        processed: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Process different webhook events
  private async processWebhook(webhook: WebhookPayload) {
    switch (webhook.event) {
      case 'deployment.started':
        await this.handleDeploymentStarted(webhook.data);
        break;
        
      case 'deployment.completed':
        await this.handleDeploymentCompleted(webhook.data);
        break;
        
      case 'deployment.failed':
        await this.handleDeploymentFailed(webhook.data);
        break;
        
      case 'health.check':
        await this.handleHealthCheck(webhook.data);
        break;
        
      case 'performance.alert':
        await this.handlePerformanceAlert(webhook.data);
        break;
        
      case 'security.alert':
        await this.handleSecurityAlert(webhook.data);
        break;
        
      case 'backup.completed':
        await this.handleBackupCompleted(webhook.data);
        break;
        
      case 'rate.limit.exceeded':
        await this.handleRateLimitExceeded(webhook.data);
        break;
        
      default:
        console.log(`📝 Unhandled webhook event: ${webhook.event}`);
    }
  }

  private async handleDeploymentStarted(data: any) {
    console.log('🚀 Deployment started:', data);
    // Could trigger notifications, status updates, etc.
  }

  private async handleDeploymentCompleted(data: any) {
    console.log('✅ Deployment completed:', data);
    // Could trigger success notifications, cache clearing, etc.
  }

  private async handleDeploymentFailed(data: any) {
    console.log('❌ Deployment failed:', data);
    // Could trigger alerts, rollback procedures, etc.
  }

  private async handleHealthCheck(data: any) {
    console.log('💓 Health check received:', data);
    // Could update monitoring systems, dashboards, etc.
  }

  private async handlePerformanceAlert(data: any) {
    console.log('⚡ Performance alert:', data);
    // Could trigger scaling, optimization, etc.
  }

  private async handleSecurityAlert(data: any) {
    console.log('🔒 Security alert:', data);
    // Could trigger security responses, IP blocking, etc.
  }

  private async handleBackupCompleted(data: any) {
    console.log('💾 Backup completed:', data);
    // Could update backup status, send confirmations, etc.
  }

  private async handleRateLimitExceeded(data: any) {
    console.log('🛡️ Rate limit exceeded:', data);
    // Could trigger temporary blocks, alerts, etc.
  }

  // Send webhook to external services
  async sendWebhook(url: string, event: string, data: any): Promise<boolean> {
    try {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', this.config.secret)
        .update(payloadString)
        .digest('hex');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'PackMoveGO-Webhook/1.0'
        },
        body: payloadString
      });

      if (response.ok) {
        console.log(`✅ Webhook sent successfully: ${event} -> ${url}`);
        return true;
      } else {
        console.warn(`❌ Webhook failed: ${event} -> ${url} (${response.status})`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Webhook error: ${event} -> ${url}:`, error);
      return false;
    }
  }

  // Get webhook configuration
  getConfig() {
    return {
      allowedEvents: this.config.allowedEvents,
      verifySignature: this.config.verifySignature,
      secretConfigured: !!this.config.secret
    };
  }
}

// Singleton instance
export const webhookHandler = new WebhookHandler();

// Export handler function
export const handleWebhook = webhookHandler.handleWebhook; 