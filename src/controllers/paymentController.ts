import { Request, Response } from 'express';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { log } from '../util/console-logger';

interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'paid' | 'failed';
  stripePaymentIntentId?: string;
  createdAt: string;
  processedAt?: string;
}

class PaymentController {
  private stripe: Stripe;
  private dataPath: string;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });
    this.dataPath = path.join(__dirname, '../data/bookings.json');
  }

  private loadData(): any {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      log.error('payment', 'Failed to load bookings data', error);
      return { bookings: [], payments: [] };
    }
  }

  private saveData(data: any): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.error('payment', 'Failed to save bookings data', error);
    }
  }

  // Create payment intent
  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId, amount, currency = 'usd', paymentMethod } = req.body;

      if (!bookingId || !amount) {
        res.status(400).json({ error: 'Booking ID and amount are required' });
        return;
      }

      const data = this.loadData();
      const booking = data.bookings.find((b: any) => b.id === bookingId);

      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      // Create payment intent with Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        payment_method_types: ['card'],
        metadata: {
          bookingId,
          customerId: booking.customerId
        }
      });

      // Create payment record
      const payment: Payment = {
        id: `payment_${Date.now()}`,
        bookingId,
        amount,
        currency,
        method: paymentMethod || 'credit_card',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        createdAt: new Date().toISOString()
      };

      data.payments.push(payment);
      this.saveData(data);

      log.info('payment', 'Payment intent created', { bookingId, amount, paymentIntentId: paymentIntent.id });
      res.status(200).json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        payment
      });
    } catch (error) {
      log.error('payment', 'Error creating payment intent', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }

  // Confirm payment
  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({ error: 'Payment intent ID is required' });
        return;
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const data = this.loadData();
        const payment = data.payments.find((p: Payment) => p.stripePaymentIntentId === paymentIntentId);

        if (payment) {
          payment.status = 'paid';
          payment.processedAt = new Date().toISOString();

          // Update booking payment status
          const booking = data.bookings.find((b: any) => b.id === payment.bookingId);
          if (booking) {
            booking.paymentStatus = 'paid';
          }

          this.saveData(data);

          log.info('payment', 'Payment confirmed', { paymentIntentId, bookingId: payment.bookingId });
          res.status(200).json({
            success: true,
            payment,
            message: 'Payment confirmed successfully'
          });
        } else {
          res.status(404).json({ error: 'Payment record not found' });
        }
      } else {
        res.status(400).json({ error: 'Payment not successful', status: paymentIntent.status });
      }
    } catch (error) {
      log.error('payment', 'Error confirming payment', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
  }

  // Get payment status
  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const data = this.loadData();
      
      const payment = data.payments.find((p: Payment) => p.id === paymentId);

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      // If payment has Stripe ID, get latest status
      if (payment.stripePaymentIntentId) {
        try {
          const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
          payment.status = paymentIntent.status === 'succeeded' ? 'paid' : payment.status;
        } catch (stripeError) {
          log.error('payment', 'Error retrieving Stripe payment intent', stripeError);
        }
      }

      res.status(200).json({
        success: true,
        payment
      });
    } catch (error) {
      log.error('payment', 'Error getting payment status', error);
      res.status(500).json({ error: 'Failed to get payment status' });
    }
  }

  // Get booking payments
  async getBookingPayments(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const data = this.loadData();
      
      const payments = data.payments.filter((p: Payment) => p.bookingId === bookingId);

      res.status(200).json({
        success: true,
        payments
      });
    } catch (error) {
      log.error('payment', 'Error getting booking payments', error);
      res.status(500).json({ error: 'Failed to get booking payments' });
    }
  }

  // Refund payment
  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId, reason = 'requested_by_customer' } = req.body;

      if (!paymentId) {
        res.status(400).json({ error: 'Payment ID is required' });
        return;
      }

      const data = this.loadData();
      const payment = data.payments.find((p: Payment) => p.id === paymentId);

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      if (payment.status !== 'paid') {
        res.status(400).json({ error: 'Payment must be paid to refund' });
        return;
      }

      if (payment.stripePaymentIntentId) {
        // Create refund in Stripe
        const refund = await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason
        });

        // Update payment status
        payment.status = 'refunded';
        this.saveData(data);

        log.info('payment', 'Payment refunded', { paymentId, refundId: refund.id });
        res.status(200).json({
          success: true,
          refund,
          payment,
          message: 'Payment refunded successfully'
        });
      } else {
        res.status(400).json({ error: 'Payment has no Stripe reference' });
      }
    } catch (error) {
      log.error('payment', 'Error refunding payment', error);
      res.status(500).json({ error: 'Failed to refund payment' });
    }
  }

  // Webhook handler for Stripe events
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      res.status(400).json({ error: 'Missing signature or webhook secret' });
      return;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      const data = this.loadData();

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const payment = data.payments.find((p: Payment) => p.stripePaymentIntentId === paymentIntent.id);
          
          if (payment) {
            payment.status = 'paid';
            payment.processedAt = new Date().toISOString();
            
            // Update booking payment status
            const booking = data.bookings.find((b: any) => b.id === payment.bookingId);
            if (booking) {
              booking.paymentStatus = 'paid';
            }
            
            this.saveData(data);
            log.info('payment', 'Payment succeeded via webhook', { paymentIntentId: paymentIntent.id });
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          const failedPayment = data.payments.find((p: Payment) => p.stripePaymentIntentId === failedPaymentIntent.id);
          
          if (failedPayment) {
            failedPayment.status = 'failed';
            this.saveData(data);
            log.info('payment', 'Payment failed via webhook', { paymentIntentId: failedPaymentIntent.id });
          }
          break;

        default:
          log.info('payment', 'Unhandled webhook event', { type: event.type });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      log.error('payment', 'Webhook signature verification failed', error);
      res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  }
}

export default new PaymentController(); 