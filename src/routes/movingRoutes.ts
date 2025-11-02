import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error-handler';
import { sendSuccess, sendError, sendValidationError } from '../util/response-formatter';
import { aiService } from '../service/aiService';
import { consoleLogger } from '../util/console-logger';
import { Booking } from '../models/bookingModel';
import { User } from '../models/userModel';

const router = Router();

// === QUOTE & ESTIMATE ROUTES ===

// Get AI-powered moving estimate
router.post('/estimate', asyncHandler(async (req: Request, res: Response) => {
  const { moveType, distance, inventory, specialItems } = req.body;
  
  if (!moveType) {
    return sendValidationError(res, ['Move type is required']);
  }

  try {
    const aiResponse = await aiService.getMovingEstimate({
      moveType,
      distance,
      inventory,
      specialItems
    });

    return sendSuccess(res, aiResponse, 'Moving estimate generated');
  } catch (error) {
    consoleLogger.error('moving', 'Estimate generation failed', error);
    return sendError(res, 'Failed to generate estimate', 500);
  }
}));

// Get packing tips
router.post('/packing-tips', asyncHandler(async (req: Request, res: Response) => {
  const { itemType } = req.body;

  try {
    const aiResponse = await aiService.getPackingTips(itemType);
    return sendSuccess(res, aiResponse, 'Packing tips provided');
  } catch (error) {
    consoleLogger.error('moving', 'Packing tips failed', error);
    return sendError(res, 'Failed to get packing tips', 500);
  }
}));

// Get service information
router.get('/services/:serviceType', asyncHandler(async (req: Request, res: Response) => {
  const { serviceType } = req.params;

  try {
    const aiResponse = await aiService.getServiceInformation(serviceType);
    return sendSuccess(res, aiResponse, 'Service information provided');
  } catch (error) {
    consoleLogger.error('moving', 'Service info failed', error);
    return sendError(res, 'Failed to get service information', 500);
  }
}));

// === BOOKING ROUTES ===

// Create a new booking/quote request
router.post('/bookings', asyncHandler(async (req: Request, res: Response) => {
  const {
    serviceType,
    moveType,
    pickupAddress,
    deliveryAddress,
    moveDate,
    estimatedDuration,
    inventory,
    customerId
  } = req.body;

  // Validate required fields
  const errors = [];
  if (!serviceType) errors.push('Service type is required');
  if (!moveType) errors.push('Move type is required');
  if (!pickupAddress) errors.push('Pickup address is required');
  if (!deliveryAddress) errors.push('Delivery address is required');
  if (!moveDate) errors.push('Move date is required');
  if (!estimatedDuration) errors.push('Estimated duration is required');
  if (!customerId) errors.push('Customer ID is required');

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    // Calculate distance (simplified - in production, use Google Maps API)
    const distance = calculateDistance(pickupAddress, deliveryAddress);
    
    // Calculate rough quote amount
    const quoteAmount = calculateQuoteAmount(serviceType, distance, inventory);

    const booking = new Booking({
      customerId,
      serviceType,
      moveType,
      pickupAddress,
      deliveryAddress,
      moveDate: new Date(moveDate),
      estimatedDuration,
      distance,
      inventory,
      quoteAmount
    });

    await booking.save();

    consoleLogger.info('moving', 'New booking created', { bookingId: booking.bookingId });

    return sendSuccess(res, booking, 'Booking created successfully', 201);
  } catch (error) {
    consoleLogger.error('moving', 'Booking creation failed', error);
    return sendError(res, 'Failed to create booking', 500);
  }
}));

// Get customer's bookings
router.get('/bookings/customer/:customerId', asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  try {
    let query: any = { customerId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('customerId', 'firstName lastName email')
      .populate('moverId', 'firstName lastName moverInfo');

    const total = await Booking.countDocuments(query);

    return sendSuccess(res, bookings, 'Customer bookings retrieved', 200, {
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total
      }
    });
  } catch (error) {
    consoleLogger.error('moving', 'Get customer bookings failed', error);
    return sendError(res, 'Failed to get bookings', 500);
  }
}));

// Get booking by ID
router.get('/bookings/:bookingId', asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    await booking.populate('customerId', 'firstName lastName email phone');
    await booking.populate('moverId', 'firstName lastName moverInfo');

    return sendSuccess(res, booking, 'Booking retrieved successfully');
  } catch (error) {
    consoleLogger.error('moving', 'Get booking failed', error);
    return sendError(res, 'Failed to get booking', 500);
  }
}));

// Update booking status
router.patch('/bookings/:bookingId/status', asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { status, notes, updatedBy } = req.body;

  if (!status) {
    return sendValidationError(res, ['Status is required']);
  }

  try {
    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    await booking.updateStatus(status, notes, updatedBy);

    return sendSuccess(res, booking, 'Booking status updated');
  } catch (error) {
    consoleLogger.error('moving', 'Update booking status failed', error);
    return sendError(res, 'Failed to update booking status', 500);
  }
}));

// === TRACKING ROUTES ===

// Update booking location (for movers)
router.patch('/bookings/:bookingId/location', asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { latitude, longitude, address } = req.body;

  if (!latitude || !longitude) {
    return sendValidationError(res, ['Latitude and longitude are required']);
  }

  try {
    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    await booking.updateLocation(latitude, longitude, address);

    return sendSuccess(res, booking, 'Location updated successfully');
  } catch (error) {
    consoleLogger.error('moving', 'Update location failed', error);
    return sendError(res, 'Failed to update location', 500);
  }
}));

// Add checkpoint to booking
router.post('/bookings/:bookingId/checkpoints', asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { location, status, notes } = req.body;

  if (!location) {
    return sendValidationError(res, ['Location is required']);
  }

  try {
    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    await booking.addCheckpoint(location, status, notes);

    return sendSuccess(res, booking, 'Checkpoint added successfully');
  } catch (error) {
    consoleLogger.error('moving', 'Add checkpoint failed', error);
    return sendError(res, 'Failed to add checkpoint', 500);
  }
}));

// === MESSAGING ROUTES ===

// Add message to booking
router.post('/bookings/:bookingId/messages', asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { senderId, senderType, message, attachments } = req.body;

  if (!senderId || !senderType || !message) {
    return sendValidationError(res, ['Sender ID, sender type, and message are required']);
  }

  try {
    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    await booking.addMessage(senderId, senderType, message, attachments);

    return sendSuccess(res, booking, 'Message added successfully');
  } catch (error) {
    consoleLogger.error('moving', 'Add message failed', error);
    return sendError(res, 'Failed to add message', 500);
  }
}));

// === AI ASSISTANT ROUTES ===

// Ask AI assistant
router.post('/ai/ask', asyncHandler(async (req: Request, res: Response) => {
  const { question, context } = req.body;

  if (!question) {
    return sendValidationError(res, ['Question is required']);
  }

  try {
    const aiResponse = await aiService.processQuery({ question, context });
    return sendSuccess(res, aiResponse, 'AI response generated');
  } catch (error) {
    consoleLogger.error('moving', 'AI query failed', error);
    return sendError(res, 'Failed to process AI query', 500);
  }
}));

// Get AI service status
router.get('/ai/status', (req: Request, res: Response) => {
  const status = aiService.getStatus();
  return sendSuccess(res, status, 'AI service status retrieved');
});

// === MOVER ROUTES ===

// Get available movers
router.get('/movers/available', asyncHandler(async (req: Request, res: Response) => {
  try {
    const movers = await User.findAvailableMovers();
    const populatedMovers = await User.populate(movers, {
      path: 'moverInfo',
      select: 'rating totalJobs currentLocation'
    });

    return sendSuccess(res, populatedMovers, 'Available movers retrieved');
  } catch (error) {
    consoleLogger.error('moving', 'Get available movers failed', error);
    return sendError(res, 'Failed to get available movers', 500);
  }
}));

// Update mover location
router.patch('/movers/:moverId/location', asyncHandler(async (req: Request, res: Response) => {
  const { moverId } = req.params;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return sendValidationError(res, ['Latitude and longitude are required']);
  }

  try {
    const mover = await User.findById(moverId);
    if (!mover || mover.role !== 'mover') {
      return sendError(res, 'Mover not found', 404);
    }

    await mover.updateLocation(latitude, longitude);

    return sendSuccess(res, mover, 'Mover location updated');
  } catch (error) {
    consoleLogger.error('moving', 'Update mover location failed', error);
    return sendError(res, 'Failed to update mover location', 500);
  }
}));

// === RATING ROUTES ===

// Rate a booking
router.post('/bookings/:bookingId/rate', asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { overall, communication, punctuality, care, value, comment } = req.body;

  if (!overall || !communication || !punctuality || !care || !value) {
    return sendValidationError(res, ['All rating fields are required']);
  }

  try {
    const booking = await Booking.findByBookingId(bookingId);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    if (booking.status !== 'completed') {
      return sendError(res, 'Can only rate completed bookings', 400);
    }

    await booking.setRating({
      overall,
      communication,
      punctuality,
      care,
      value,
      comment
    });

    // Update mover rating if booking has a mover
    if (booking.moverId) {
      const mover = await User.findById(booking.moverId);
      if (mover) {
        await mover.updateRating(overall);
      }
    }

    return sendSuccess(res, booking, 'Rating submitted successfully');
  } catch (error) {
    consoleLogger.error('moving', 'Submit rating failed', error);
    return sendError(res, 'Failed to submit rating', 500);
  }
}));

// === UTILITY FUNCTIONS ===

function calculateDistance(pickup: any, delivery: any): number {
  // Simplified distance calculation
  // In production, use Google Maps API or similar
  const lat1 = pickup.coordinates?.latitude || 0;
  const lon1 = pickup.coordinates?.longitude || 0;
  const lat2 = delivery.coordinates?.latitude || 0;
  const lon2 = delivery.coordinates?.longitude || 0;

  if (lat1 && lon1 && lat2 && lon2) {
    // Haversine formula for distance calculation
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  }

  return 0; // Default distance if coordinates not available
}

function calculateQuoteAmount(serviceType: string, distance: number, inventory: any[]): number {
  // Simplified pricing calculation
  // In production, use more sophisticated pricing logic
  let basePrice = 0;

  switch (serviceType) {
    case 'local':
      basePrice = 200;
      break;
    case 'long-distance':
      basePrice = 500 + (distance * 2);
      break;
    case 'international':
      basePrice = 2000 + (distance * 5);
      break;
    case 'storage':
      basePrice = 150;
      break;
    case 'packing':
      basePrice = 300;
      break;
    default:
      basePrice = 250;
  }

  // Add inventory-based pricing
  let inventoryPrice = 0;
  if (inventory && inventory.length > 0) {
    inventoryPrice = inventory.reduce((total, item) => {
      const itemPrice = (item.weight || 10) * 0.5; // $0.50 per pound
      return total + (itemPrice * item.quantity);
    }, 0);
  }

  return Math.round(basePrice + inventoryPrice);
}

export default router; 