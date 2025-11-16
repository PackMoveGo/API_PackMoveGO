import{Request,Response} from 'express';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import{log} from '../util/console-logger';
import{PaymentError} from '../util/errors';
import AuditLogger from '../util/audit-logger';

/**
 * PCI DSS COMPLIANCE NOTES:
 * - Never store full card numbers (handled by Stripe)
 * - Never store CVV/CVC codes (handled by Stripe)
 * - Never store PIN numbers (handled by Stripe)
 * - All card data handled by Stripe.js on client side
 * - Only store Stripe payment intent IDs and metadata
 * - Validate webhook signatures to prevent tampering
 * - Use idempotency keys to prevent duplicate charges
 * - Log all payment operations for audit trail
 * - Encrypt sensitive payment metadata
 */

interface Payment{
  id:string;
  bookingId:string;
  amount:number;
  currency:string;
  method:string;
  status:'pending'|'paid'|'failed'|'refunded';
  stripePaymentIntentId?:string;
  idempotencyKey?:string; // Prevent duplicate charges
  createdAt:string;
  processedAt?:string;
  refundedAt?:string;
  metadata?:Record<string,any>;
}

class PaymentController{
  private stripe:Stripe | null;
  private dataPath:string;

  constructor(){
    // Initialize Stripe if key is available (optional for services that don't use payments)
    const stripeKey = process.env['STRIPE_SECRET_KEY'];
    if(stripeKey){
      this.stripe=new Stripe(stripeKey,{
        apiVersion:'2023-10-16',
        typescript:true
      });
    } else {
      log.warn('payment', 'STRIPE_SECRET_KEY not configured - payment features will be disabled');
      this.stripe = null as any; // Type assertion to allow optional usage
    }
    this.dataPath=path.join(__dirname,'../data/bookings.json');
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

  // Create payment intent (PCI DSS compliant)
  async createPaymentIntent(req:Request,res:Response):Promise<void>{
    try{
      const{bookingId,amount,currency='usd',paymentMethod}=req.body;
      const userId=(req as any).user?.userId;

      if(!bookingId||!amount){
        throw new PaymentError('Booking ID and amount are required');
      }

      // Validate amount
      if(amount<=0||amount>1000000){
        throw new PaymentError('Invalid payment amount');
      }

      const data=this.loadData();
      const booking=data.bookings.find((b:any)=>b.id===bookingId);

      if(!booking){
        throw new PaymentError('Booking not found');
      }

      // Check if Stripe is configured
      if(!this.stripe){
        res.status(503).json({
          error:'Payment service unavailable',
          message:'Stripe is not configured. Please contact support.'
        });
        return;
      }

      // Generate idempotency key to prevent duplicate charges
      const idempotencyKey=`payment_${bookingId}_${Date.now()}`;

      // Create payment intent with Stripe (PCI DSS: card data never touches our servers)
      const paymentIntent=await this.stripe.paymentIntents.create({
        amount:Math.round(amount*100), // Convert to cents
        currency,
        payment_method_types:['card'],
        metadata:{
          bookingId,
          customerId:booking.customerId,
          environment:process.env['NODE_ENV']||'development'
        },
        description:`Payment for booking ${bookingId}`
      },{
        idempotencyKey // Prevent duplicate charges
      });

      // Create payment record (never store card data)
      const payment:Payment={
        id:`payment_${Date.now()}`,
        bookingId,
        amount,
        currency,
        method:paymentMethod||'credit_card',
        status:'pending',
        stripePaymentIntentId:paymentIntent.id,
        idempotencyKey,
        createdAt:new Date().toISOString()
      };

      data.payments.push(payment);
      this.saveData(data);

      // Audit log
      if(userId){
        await AuditLogger.log(
          {userId,userEmail:(req as any).user?.email,userRole:(req as any).user?.role||'customer',ipAddress:req.ip||'',userAgent:req.get('User-Agent')||''},
          {action:'create' as any,resourceType:'Payment',resourceId:payment.id,success:true}
        );
      }

      log.info('payment','Payment intent created',{bookingId,amount,paymentIntentId:paymentIntent.id});
      
      // Only send client secret (PCI DSS: no sensitive data in response)
      res.status(200).json({
        success:true,
        clientSecret:paymentIntent.client_secret,
        paymentIntentId:paymentIntent.id,
        payment:{
          id:payment.id,
          status:payment.status,
          amount:payment.amount,
          currency:payment.currency
        }
      });
    }catch(error){
      log.error('payment','Error creating payment intent',error);
      if(error instanceof PaymentError){
        res.status(error.statusCode).json(error.toJSON());
      }else{
        res.status(500).json({error:'Failed to create payment intent'});
      }
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

      // Check if Stripe is configured
      if(!this.stripe){
        res.status(503).json({
          error:'Payment service unavailable',
          message:'Stripe is not configured. Please contact support.'
        });
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
      if (payment.stripePaymentIntentId && this.stripe) {
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

  // Refund payment (PCI DSS: proper authorization required)
  async refundPayment(req:Request,res:Response):Promise<void>{
    try{
      const{paymentId,amount,reason='requested_by_customer'}=req.body;
      const userId=(req as any).user?.userId;
      const userRole=(req as any).user?.role;

      if(!paymentId){
        throw new PaymentError('Payment ID is required');
      }

      // Only admin and manager can refund
      if(userRole!=='admin' && userRole!=='manager'){
        res.status(403).json({error:'Only admins and managers can process refunds'});
        return;
      }

      const data=this.loadData();
      const payment=data.payments.find((p:Payment)=>p.id===paymentId);

      if(!payment){
        throw new PaymentError('Payment not found');
      }

      if(payment.status!=='paid'){
        throw new PaymentError('Payment must be paid to refund');
      }

      if(!payment.stripePaymentIntentId){
        throw new PaymentError('Payment has no Stripe reference');
      }

      // Check if Stripe is configured
      if(!this.stripe){
        res.status(503).json({
          error:'Payment service unavailable',
          message:'Stripe is not configured. Please contact support.'
        });
        return;
      }

      // Generate idempotency key for refund
      const idempotencyKey=`refund_${paymentId}_${Date.now()}`;

      // Create refund in Stripe
      const refund=await this.stripe.refunds.create({
        payment_intent:payment.stripePaymentIntentId,
        amount:amount?Math.round(amount*100):undefined, // Partial refund if amount specified
        reason:reason as any,
        metadata:{
          paymentId,
          bookingId:payment.bookingId,
          refundedBy:userId
        }
      },{
        idempotencyKey
      });

      // Update payment status
      payment.status='refunded';
      payment.refundedAt=new Date().toISOString();
      payment.metadata={...payment.metadata,refundId:refund.id,refundReason:reason};
      this.saveData(data);

      // Audit log
      if(userId){
        await AuditLogger.log(
          {userId,userRole,ipAddress:req.ip||'',userAgent:req.get('User-Agent')||''},
          {action:'update' as any,resourceType:'Payment',resourceId:paymentId,success:true,metadata:{refundId:refund.id,amount:refund.amount}}
        );
      }

      log.info('payment','Payment refunded',{paymentId,refundId:refund.id,refundedBy:userId});
      
      res.status(200).json({
        success:true,
        refund:{
          id:refund.id,
          amount:refund.amount/100,
          status:refund.status
        },
        payment:{
          id:payment.id,
          status:payment.status
        },
        message:'Payment refunded successfully'
      });
    }catch(error){
      log.error('payment','Error refunding payment',error);
      if(error instanceof PaymentError){
        res.status(error.statusCode).json(error.toJSON());
      }else{
        res.status(500).json({error:'Failed to refund payment'});
      }
    }
  }

  // Webhook handler for Stripe events (PCI DSS: signature verification required)
  async handleWebhook(req:Request,res:Response):Promise<void>{
    const sig=req.headers['stripe-signature'];
    const endpointSecret=process.env['STRIPE_WEBHOOK_SECRET'];

    // PCI DSS: Validate webhook signature
    if(!sig||!endpointSecret){
      log.error('payment','Webhook signature or secret missing',{hasSignature:!!sig,hasSecret:!!endpointSecret});
      res.status(400).json({error:'Missing signature or webhook secret'});
      return;
    }

    // Check if Stripe is configured
    if(!this.stripe){
      log.error('payment','Stripe not configured for webhook');
      res.status(503).json({error:'Payment service unavailable'});
      return;
    }

    try{
      // Verify webhook signature (prevents tampering)
      const event=this.stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        endpointSecret
      );

      const data=this.loadData();

      // Process webhook events
      switch(event.type){
        case 'payment_intent.succeeded':{
          const paymentIntent=event.data.object as Stripe.PaymentIntent;
          const payment=data.payments.find((p:Payment)=>p.stripePaymentIntentId===paymentIntent.id);
          
          if(payment){
            payment.status='paid';
            payment.processedAt=new Date().toISOString();
            
            // Update booking payment status
            const booking=data.bookings.find((b:any)=>b.id===payment.bookingId);
            if(booking){
              booking.paymentStatus='paid';
            }
            
            this.saveData(data);
            log.info('payment','Payment succeeded via webhook',{paymentIntentId:paymentIntent.id});

            // Audit log
            await AuditLogger.log(
              {userId:payment.bookingId,userRole:'system',ipAddress:'stripe',userAgent:'stripe-webhook'},
              {action:'update' as any,resourceType:'Payment',resourceId:payment.id,success:true,metadata:{event:event.type}}
            );
          }
          break;
        }

        case 'payment_intent.payment_failed':{
          const failedPaymentIntent=event.data.object as Stripe.PaymentIntent;
          const failedPayment=data.payments.find((p:Payment)=>p.stripePaymentIntentId===failedPaymentIntent.id);
          
          if(failedPayment){
            failedPayment.status='failed';
            this.saveData(data);
            log.info('payment','Payment failed via webhook',{paymentIntentId:failedPaymentIntent.id});
          }
          break;
        }

        case 'charge.refunded':{
          const charge=event.data.object as Stripe.Charge;
          const refundedPayment=data.payments.find((p:Payment)=>
            p.stripePaymentIntentId===charge.payment_intent
          );
          
          if(refundedPayment){
            refundedPayment.status='refunded';
            refundedPayment.refundedAt=new Date().toISOString();
            this.saveData(data);
            log.info('payment','Payment refunded via webhook',{chargeId:charge.id});
          }
          break;
        }

        default:
          log.info('payment','Unhandled webhook event',{type:event.type});
      }

      // Always return 200 to acknowledge receipt
      res.status(200).json({received:true,eventType:event.type});
    }catch(error){
      // Log webhook verification failure (potential security issue)
      log.error('payment','Webhook signature verification failed',{
        error:error instanceof Error?error.message:'Unknown',
        hasSignature:!!sig,
        hasSecret:!!endpointSecret
      });
      
      res.status(400).json({error:'Webhook signature verification failed'});
    }
  }
}

export default new PaymentController(); 