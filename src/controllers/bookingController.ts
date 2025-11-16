import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { log } from '../util/console-logger';

interface Booking {
  id: string;
  customerId: string;
  moverId?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  type: 'residential' | 'commercial';
  pickupAddress: Address;
  deliveryAddress: Address;
  items: Item[];
  estimatedCost: number;
  finalCost?: number;
  distance: number;
  estimatedDuration: number;
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  specialInstructions?: string;
  trackingCode: string;
}

interface Quote {
  id: string;
  customerId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  type: 'residential' | 'commercial';
  pickupAddress: Address;
  deliveryAddress: Address;
  items: Item[];
  estimatedCost: number;
  distance: number;
  estimatedDuration: number;
  requestedDate: string;
  createdAt: string;
  expiresAt: string;
  specialInstructions?: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Item {
  name: string;
  quantity: number;
  weight: number;
  fragile: boolean;
}

interface Mover {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: {
    type: string;
    capacity: number;
    licensePlate: string;
  };
  rating: number;
  totalMoves: number;
  isAvailable: boolean;
  currentLocation: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  specialties: string[];
  hourlyRate: number;
}

interface Tracking {
  bookingId: string;
  status: 'pending' | 'pickup' | 'in_transit' | 'delivery' | 'completed';
  location: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  estimatedArrival: string;
  lastUpdate: string;
}

class BookingController {
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(__dirname, '../data/bookings.json');
  }

  private loadData(): any {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      log.error('booking', 'Failed to load bookings data', error);
      return { bookings: [], quotes: [], movers: [], tracking: [], payments: [] };
    }
  }

  private saveData(data: any): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      log.error('booking', 'Failed to save bookings data', error);
    }
  }

  // Create a new quote request
  async createQuote(req: Request, res: Response): Promise<void> {
    try {
      const { customerId, type, pickupAddress, deliveryAddress, items, requestedDate, specialInstructions } = req.body;

      if (!customerId || !pickupAddress || !deliveryAddress || !items) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const data = this.loadData();
      const quoteId = `quote_${Date.now()}`;
      
      // Calculate distance and estimated cost
      const distance = this.calculateDistance(pickupAddress.coordinates, deliveryAddress.coordinates);
      const estimatedCost = this.calculateEstimatedCost(items, distance, type);
      const estimatedDuration = this.calculateEstimatedDuration(items, distance);

      const quote: Quote = {
        id: quoteId,
        customerId,
        status: 'pending',
        type,
        pickupAddress,
        deliveryAddress,
        items,
        estimatedCost,
        distance,
        estimatedDuration,
        requestedDate,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        specialInstructions
      };

      data.quotes.push(quote);
      this.saveData(data);

      log.info('booking', 'Quote created', { quoteId, customerId: String(customerId), estimatedCost });
      res.status(201).json({
        success: true,
        quote,
        message: 'Quote created successfully'
      });
    } catch (error) {
      log.error('booking', 'Error creating quote', error);
      res.status(500).json({ error: 'Failed to create quote' });
    }
  }

  // Get all quotes for a customer
  async getCustomerQuotes(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const data = this.loadData();
      
      const quotes = data.quotes.filter((quote: Quote) => quote.customerId === customerId);
      
      res.status(200).json({
        success: true,
        quotes
      });
    } catch (error) {
      log.error('booking', 'Error getting customer quotes', error);
      res.status(500).json({ error: 'Failed to get quotes' });
    }
  }

  // Create a booking from a quote
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const { quoteId, customerId, paymentMethod, specialInstructions } = req.body;

      const data = this.loadData();
      const quote = data.quotes.find((q: Quote) => q.id === quoteId);

      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      if (quote.status !== 'pending') {
        res.status(400).json({ error: 'Quote is not available for booking' });
        return;
      }

      // Find available mover
      const availableMover = data.movers.find((mover: Mover) => 
        mover.isAvailable && mover.specialties.includes(quote.type)
      );

      if (!availableMover) {
        res.status(400).json({ error: 'No available movers for this request' });
        return;
      }

      const bookingId = `booking_${Date.now()}`;
      const trackingCode = `PMG-${new Date().getFullYear()}-${String(bookingId).slice(-3)}`;

      const booking: Booking = {
        id: bookingId,
        customerId,
        moverId: availableMover.id,
        status: 'pending',
        type: quote.type,
        pickupAddress: quote.pickupAddress,
        deliveryAddress: quote.deliveryAddress,
        items: quote.items,
        estimatedCost: quote.estimatedCost,
        distance: quote.distance,
        estimatedDuration: quote.estimatedDuration,
        scheduledDate: quote.requestedDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentStatus: 'pending',
        paymentMethod,
        specialInstructions,
        trackingCode
      };

      // Create tracking entry
      const tracking: Tracking = {
        bookingId,
        status: 'pending',
        location: availableMover.currentLocation,
        estimatedArrival: quote.requestedDate,
        lastUpdate: new Date().toISOString()
      };

      // Update quote status
      quote.status = 'accepted';

      // Update mover availability
      availableMover.isAvailable = false;

      data.bookings.push(booking);
      data.tracking.push(tracking);
      this.saveData(data);

      log.info('booking', 'Booking created', { bookingId, customerId, trackingCode });
      res.status(201).json({
        success: true,
        booking,
        tracking,
        message: 'Booking created successfully'
      });
    } catch (error) {
      log.error('booking', 'Error creating booking', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }

  // Get booking details
  async getBooking(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const data = this.loadData();
      
      const booking = data.bookings.find((b: Booking) => b.id === bookingId);
      const tracking = data.tracking.find((t: Tracking) => t.bookingId === bookingId);

      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      res.status(200).json({
        success: true,
        booking,
        tracking
      });
    } catch (error) {
      log.error('booking', 'Error getting booking', error);
      res.status(500).json({ error: 'Failed to get booking' });
    }
  }

  // Update booking status
  async updateBookingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;

      const data = this.loadData();
      const booking = data.bookings.find((b: Booking) => b.id === bookingId);
      const tracking = data.tracking.find((t: Tracking) => t.bookingId === bookingId);

      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      booking.status = status;
      booking.updatedAt = new Date().toISOString();

      if (tracking) {
        tracking.status = status;
        tracking.lastUpdate = new Date().toISOString();
      }

      this.saveData(data);

      log.info('booking', 'Booking status updated', { bookingId, status });
      res.status(200).json({
        success: true,
        booking,
        tracking,
        message: 'Booking status updated successfully'
      });
    } catch (error) {
      log.error('booking', 'Error updating booking status', error);
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  }

  // Update tracking location
  async updateTrackingLocation(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const { lat, lng, estimatedArrival } = req.body;

      const data = this.loadData();
      const tracking = data.tracking.find((t: Tracking) => t.bookingId === bookingId);

      if (!tracking) {
        res.status(404).json({ error: 'Tracking not found' });
        return;
      }

      tracking.location = { lat, lng, timestamp: new Date().toISOString() };
      tracking.lastUpdate = new Date().toISOString();
      
      if (estimatedArrival) {
        tracking.estimatedArrival = estimatedArrival;
      }

      this.saveData(data);

      log.info('booking', 'Tracking location updated', { bookingId, lat, lng });
      res.status(200).json({
        success: true,
        tracking,
        message: 'Tracking location updated successfully'
      });
    } catch (error) {
      log.error('booking', 'Error updating tracking location', error);
      res.status(500).json({ error: 'Failed to update tracking location' });
    }
  }

  // Get available movers
  async getAvailableMovers(_req: Request, res: Response): Promise<void> {
    try {
      const data = this.loadData();
      const availableMovers = data.movers.filter((mover: Mover) => mover.isAvailable);

      res.status(200).json({
        success: true,
        movers: availableMovers
      });
    } catch (error) {
      log.error('booking', 'Error getting available movers', error);
      res.status(500).json({ error: 'Failed to get available movers' });
    }
  }

  // Calculate distance between two points
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Calculate estimated cost
  private calculateEstimatedCost(items: Item[], distance: number, type: string): number {
    const baseRate = type === 'commercial' ? 75 : 50; // per hour
    const distanceRate = 2.5; // per mile
    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const weightRate = totalWeight > 500 ? 0.1 : 0.05; // per pound for heavy items
    
    const estimatedHours = Math.max(2, distance / 15 + totalWeight / 200); // minimum 2 hours
    const baseCost = baseRate * estimatedHours;
    const distanceCost = distance * distanceRate;
    const weightCost = totalWeight * weightRate;
    
    return Math.round((baseCost + distanceCost + weightCost) * 100) / 100;
  }

  // Calculate estimated duration
  private calculateEstimatedDuration(items: Item[], distance: number): number {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const baseTime = 60; // 1 hour base
    const distanceTime = distance * 5; // 5 minutes per mile
    const weightTime = totalWeight * 0.1; // 0.1 minutes per pound
    
    return Math.round(baseTime + distanceTime + weightTime);
  }
}

export default new BookingController(); 