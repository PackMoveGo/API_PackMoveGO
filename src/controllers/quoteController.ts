import { Request, Response } from 'express';
import Quote from '../models/quoteModel';
import { consoleLogger } from '../util/console-logger';

// Rate limiting: Track IP addresses and their last submission time
const ipSubmissions=new Map<string, number>();
const SUBMISSION_COOLDOWN=3*24*60*60*1000; // 3 days in milliseconds

/**
 * Submit a quote request
 * POST /v0/quotes/submit
 */
export const submitQuote=async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromZip, toZip, moveDate, rooms, firstName, lastName, phone, email, serviceId, moveType }=req.body;
    const clientIp=req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    
    // Log incoming data for debugging
    consoleLogger.info('quote', 'Quote submission received', {
      fromZip,
      toZip,
      moveDate,
      rooms,
      firstName,
      lastName,
      phone,
      email,
      serviceId,
      ip: clientIp
    });
    
    // Check IP rate limiting
    const lastSubmission=ipSubmissions.get(clientIp);
    if(lastSubmission){
      const timeSinceLastSubmission=Date.now()-lastSubmission;
      if(timeSinceLastSubmission<SUBMISSION_COOLDOWN){
        const remainingTime=SUBMISSION_COOLDOWN-timeSinceLastSubmission;
        const daysRemaining=Math.ceil(remainingTime/(24*60*60*1000));
        
        res.status(429).json({
          success:false,
          message:`You can only submit a quote request once every 3 days. Please try again in ${daysRemaining} day(s).`,
          retryAfter:remainingTime
        });
        return;
      }
    }
    
    // Validation
    const errors: string[]=[];
    
    // Service ID validation (if provided)
    if (serviceId && typeof serviceId !== 'string') {
      errors.push('Invalid service selection');
    }
    
    // Zip code validation - must be exactly 5 digits, no letters or special characters
    if (!fromZip || !/^\d{5}$/.test(String(fromZip).trim())) {
      errors.push('Moving From Zip Code must be exactly 5 digits');
    }
    if (!toZip || !/^\d{5}$/.test(String(toZip).trim())) {
      errors.push('Moving To Zip Code must be exactly 5 digits');
    }
    
    if (!moveDate) {
      errors.push('Move date is required');
    }
    
    // Rooms validation - must be a number between 1 and 50
    const roomsNum = typeof rooms === 'number' ? rooms : parseInt(String(rooms));
    if (rooms === undefined || rooms === null || rooms === '' || isNaN(roomsNum) || roomsNum < 1 || roomsNum > 50) {
      errors.push('Number of rooms must be between 1 and 50');
    }
    
    if (!firstName || String(firstName).trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }
    if (!lastName || String(lastName).trim().length < 2) {
      errors.push('Last name must be at least 2 characters');
    }
    
    // Phone validation - must be 10 digits (formatted as (XXX) XXX-XXXX)
    const phoneDigits = phone ? String(phone).replace(/\D/g, '') : '';
    if (!phone || phoneDigits.length !== 10) {
      errors.push('Phone number must be exactly 10 digits');
    }
    
    if (email && !/^\S+@\S+\.\S+$/.test(String(email))) {
      errors.push('Please provide a valid email address');
    }
    
    if (errors.length > 0) {
      consoleLogger.warn('quote', 'Quote validation failed', { errors, data: req.body });
      res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join(', ')}`,
        errors
      });
      return;
    }
    
    // Create quote request
    const quoteData = {
      fromZip: fromZip?.toString().trim() || '',
      toZip: toZip?.toString().trim() || '',
      moveDate: new Date(moveDate),
      rooms: roomsNum.toString(),
      firstName: firstName?.toString().trim() || '',
      lastName: lastName?.toString().trim() || '',
      phone: phoneDigits, // Store only digits
      email: email?.toString().trim().toLowerCase() || undefined,
      moveType: serviceId || moveType || 'residential',
      status: 'new',
      source: 'website',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent']
    };

    let savedQuote;
    let quoteId;
    
    try {
      // Try to save to MongoDB
      const quote = new Quote(quoteData);
      savedQuote = await quote.save();
      quoteId = savedQuote._id;
      
      consoleLogger.info('quote', 'Quote saved to MongoDB', {
        quoteId,
        fullName: `${quoteData.firstName} ${quoteData.lastName}`
      });
    } catch (dbError) {
      // MongoDB save failed - fallback to JSON file
      consoleLogger.warn('quote', 'MongoDB save failed, using JSON fallback', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
      
      // Save to JSON file as fallback
      const fs = await import('fs/promises');
      const path = await import('path');
      const quotesDir = path.join(process.cwd(), 'src', 'database');
      const quotesFile = path.join(quotesDir, 'quotes.json');
      
      try {
        // Read existing quotes
        let quotes = [];
        try {
          const data = await fs.readFile(quotesFile, 'utf-8');
          quotes = JSON.parse(data);
        } catch {
          // File doesn't exist, create new array
          quotes = [];
        }
        
        // Generate a simple ID
        quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add new quote
        const newQuote = {
          ...quoteData,
          _id: quoteId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        quotes.push(newQuote);
        
        // Save to file
        await fs.writeFile(quotesFile, JSON.stringify(quotes, null, 2), 'utf-8');
        
        consoleLogger.info('quote', 'Quote saved to JSON file', {
          quoteId,
          fullName: `${quoteData.firstName} ${quoteData.lastName}`
        });
      } catch (fileError) {
        consoleLogger.error('quote', 'Failed to save to JSON fallback', fileError);
        throw new Error('Failed to save quote to both MongoDB and JSON file');
      }
    }
    
    // Update IP rate limiting
    ipSubmissions.set(clientIp, Date.now());
    
    res.status(201).json({
      success: true,
      message: 'Thank you! Your quote request has been submitted. We\'ll contact you soon.',
      data: {
        id: quoteId,
        fullName: `${quoteData.firstName} ${quoteData.lastName}`,
        moveDate: quoteData.moveDate
      }
    });
  } catch (error) {
    consoleLogger.error('quote', 'Failed to submit quote request', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quote request. Please try again or contact us directly.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all quote requests (admin only)
 * GET /v0/quotes
 */
export const getAllQuotes=async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit=50, page=1 }=req.query;
    
    const query: any={};
    if (status) {
      query.status=status;
    }
    
    const quotes=await (Quote.find as any)(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();
    
    const total=await Quote.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: quotes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    consoleLogger.error('quote', 'Failed to get quotes', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve quotes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update quote status (admin only)
 * PUT /v0/quotes/:id
 */
export const updateQuoteStatus=async (req: Request, res: Response): Promise<void> => {
  try {
    const { id }=req.params;
    const { status, quoteAmount, notes }=req.body;
    
    const updateData: any={ notes };
    if (status) updateData.status=status;
    if (quoteAmount !== undefined) updateData.quoteAmount=quoteAmount;
    if (status==='contacted') updateData.contactedAt=new Date();
    if (status==='quoted') updateData.quotedAt=new Date();
    if (status==='booked') updateData.bookedAt=new Date();
    
    const quote=await (Quote.findByIdAndUpdate as any)(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!quote) {
      res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Quote updated successfully',
      data: quote
    });
  } catch (error) {
    consoleLogger.error('quote', 'Failed to update quote', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quote',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Check if IP can submit a quote (rate limiting check)
 * GET /v0/quotes/check-limit
 */
export const checkQuoteLimit=async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIp=req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const lastSubmission=ipSubmissions.get(clientIp);
    
    if(!lastSubmission){
      res.status(200).json({
        success:true,
        canSubmit:true,
        message:'You can submit a quote request'
      });
      return;
    }
    
    const timeSinceLastSubmission=Date.now()-lastSubmission;
    const canSubmit=timeSinceLastSubmission>=SUBMISSION_COOLDOWN;
    
    if(!canSubmit){
      const remainingTime=SUBMISSION_COOLDOWN-timeSinceLastSubmission;
      const daysRemaining=Math.ceil(remainingTime/(24*60*60*1000));
      
      res.status(200).json({
        success:true,
        canSubmit:false,
        message:`You can submit another quote in ${daysRemaining} day(s)`,
        retryAfter:remainingTime,
        daysRemaining
      });
    }else{
      res.status(200).json({
        success:true,
        canSubmit:true,
        message:'You can submit a quote request'
      });
    }
  } catch (error) {
    consoleLogger.error('quote', 'Failed to check quote limit', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check submission status'
    });
  }
};

export default {
  submitQuote,
  getAllQuotes,
  updateQuoteStatus,
  checkQuoteLimit
};

