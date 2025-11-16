import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { sendSuccess, createPaginationResponse, sendNotFoundError } from '../util/response-formatter';

interface Service {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: string;
  price: {
    starting: number;
    currency: string;
    display: string;
    perHour: number;
  };
  duration: {
    min: number;
    max: number;
    unit: string;
    display: string;
  };
  features: string[];
  availability: {
    status: string;
    leadTime: string;
  };
  image: string;
  slug: string;
  link: string;
  meta: {
    popularity: number;
    rating: number;
    reviewCount: number;
    featured: boolean;
  };
}

interface ServicesData {
  services: Service[];
}

interface QuoteRequest {
  fromZip: string;
  toZip: string;
  moveDate: string;
  rooms?: number;
  additionalServices?: string[];
  urgency?: 'standard' | 'rush' | 'flexible';
}

interface QuoteResponse {
  serviceId: string;
  quote: {
    basePrice: number;
    distanceMultiplier: number;
    seasonalAdjustment: number;
    additionalServices: Record<string, number>;
    totalPrice: number;
    breakdown: {
      baseService: number;
      distance: number;
      seasonal: number;
      addons: number;
    };
    validUntil: string;
    availability: {
      availableSlots: string[];
    };
  };
  recommendations: Array<{
    serviceId: string;
    title: string;
    reason: string;
    price: number;
  }>;
}

interface AnalyticsData {
  overview: {
    totalServices: number;
    activeServices: number;
    totalBookings: number;
    revenue: number;
    avgRating: number;
  };
  popularServices: Array<{
    serviceId: string;
    title: string;
    bookings: number;
    revenue: number;
    rating: number;
    growth: number;
  }>;
  performance: {
    conversionRate: number;
    avgBookingValue: number;
    customerSatisfaction: number;
    responseTime: string;
  };
  trends: {
    monthlyBookings: number[];
    revenueGrowth: number;
    seasonalPeaks: string[];
  };
  customerInsights: {
    topZipCodes: string[];
    popularMoveDates: string[];
    commonAddons: string[];
  };
}

const dataDir = path.join(__dirname, '../data');

// Load services data
const loadServicesData = (): ServicesData => {
  const filePath = path.join(dataDir, 'services.json');
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

// Calculate distance between zip codes (simplified)
const calculateDistance = (fromZip: string, toZip: string): number => {
  // Simplified distance calculation - in real implementation, use a proper geocoding service
  const fromNum = parseInt(fromZip.substring(0, 3));
  const toNum = parseInt(toZip.substring(0, 3));
  return Math.abs(fromNum - toNum) * 2; // Rough miles calculation
};

// Calculate seasonal adjustment
const calculateSeasonalAdjustment = (moveDate: string): number => {
  const date = new Date(moveDate);
  const month = date.getMonth();
  
  // Peak season (May-September)
  if (month >= 4 && month <= 8) {
    return 1.2;
  }
  // Off-peak season (October-April)
  return 1.0;
};

// Calculate urgency multiplier
const calculateUrgencyMultiplier = (urgency: string): number => {
  switch (urgency) {
    case 'rush':
      return 1.5;
    case 'flexible':
      return 0.9;
    default:
      return 1.0;
  }
};

// Enhanced services API with filtering and search
export const getServices = (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      sort = 'popularity',
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      duration
    } = req.query;

    const servicesData = loadServicesData();
    let filteredServices = [...servicesData.services];

    // Search functionality
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      filteredServices = filteredServices.filter(service =>
        service.title.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.category.toLowerCase().includes(searchTerm)
      );
    }

    // Category filtering
    if (category && typeof category === 'string') {
      filteredServices = filteredServices.filter(service =>
        service.category === category
      );
    }

    // Price filtering
    if (minPrice && typeof minPrice === 'string') {
      const min = parseInt(minPrice);
      filteredServices = filteredServices.filter(service =>
        service.price.starting >= min
      );
    }

    if (maxPrice && typeof maxPrice === 'string') {
      const max = parseInt(maxPrice);
      filteredServices = filteredServices.filter(service =>
        service.price.starting <= max
      );
    }

    // Duration filtering
    if (duration && typeof duration === 'string') {
      const parts = duration.split('-').map(d => parseInt(d));
      const min = parts[0];
      const max = parts[1];
      if (min !== undefined && max !== undefined) {
        filteredServices = filteredServices.filter(service =>
          service.duration.min >= min && service.duration.max <= max
        );
      }
    }

    // Sorting
    const sortType = sort as string;
    filteredServices.sort((a, b) => {
      switch (sortType) {
        case 'price':
          return a.price.starting - b.price.starting;
        case 'rating':
          return b.meta.rating - a.meta.rating;
        case 'popularity':
          return b.meta.popularity - a.meta.popularity;
        case 'duration':
          return a.duration.min - b.duration.min;
        default:
          return b.meta.popularity - a.meta.popularity;
      }
    });

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedServices = filteredServices.slice(startIndex, endIndex);

    // Generate filters for frontend (unused - for future feature)
    // @ts-ignore - Reserved for future filter feature
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _categories = [...new Set(servicesData.services.map(s => s.category))];
    // @ts-ignore - Reserved for future filter feature
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _priceRanges = ['0-500', '500-1000', '1000+'];
    // @ts-ignore - Reserved for future filter feature
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _durations = ['1-3 hours', '3-6 hours', '6+ hours'];

    createPaginationResponse(
      res,
      paginatedServices,
      pageNum,
      limitNum,
      filteredServices.length,
      'Services retrieved successfully',
      { requestId: req.headers['x-request-id'] as string }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving services',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get service by ID
export const getServiceById = (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const servicesData = loadServicesData();
    
    const service = servicesData.services.find(s => s.id === serviceId);
    
    if (!service) {
      return sendNotFoundError(res, 'Service', { requestId: req.headers['x-request-id'] as string });
    }

    sendSuccess(res, service, 'Service retrieved successfully', 200, {
      requestId: req.headers['x-request-id'] as string
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving service',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

// Dynamic pricing and quote generation
export const generateQuote = (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const quoteRequest: QuoteRequest = req.body;

    // Validate required fields
    if (!quoteRequest.fromZip || !quoteRequest.toZip || !quoteRequest.moveDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fromZip, toZip, moveDate',
        timestamp: new Date().toISOString()
      });
    }

    const servicesData = loadServicesData();
    const service = servicesData.services.find(s => s.id === serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate pricing components
    const distance = calculateDistance(quoteRequest.fromZip, quoteRequest.toZip);
    const distanceMultiplier = Math.max(1, distance / 50); // 50 miles = 1x multiplier
    const seasonalAdjustment = calculateSeasonalAdjustment(quoteRequest.moveDate);
    const urgencyMultiplier = calculateUrgencyMultiplier(quoteRequest.urgency || 'standard');

    // Base price calculation
    const basePrice = service.price.starting;
    const distanceCost = basePrice * (distanceMultiplier - 1);
    const seasonalCost = basePrice * (seasonalAdjustment - 1);
    const urgencyCost = basePrice * (urgencyMultiplier - 1);

    // Additional services pricing
    const additionalServices: Record<string, number> = {};
    let addonsTotal = 0;

    if (quoteRequest.additionalServices) {
      quoteRequest.additionalServices.forEach(addon => {
        switch (addon) {
          case 'packing':
            additionalServices.packing = 150;
            addonsTotal += 150;
            break;
          case 'storage':
            additionalServices.storage = 75;
            addonsTotal += 75;
            break;
          case 'furniture-assembly':
            additionalServices['furniture-assembly'] = 60;
            addonsTotal += 60;
            break;
        }
      });
    }

    const totalPrice = basePrice + distanceCost + seasonalCost + urgencyCost + addonsTotal;

    // Generate recommendations
    const recommendations: Array<{
      serviceId: string;
      title: string;
      reason: string;
      price: number;
    }> = [];
    if (quoteRequest.rooms && quoteRequest.rooms > 2) {
      recommendations.push({
        serviceId: 'packing-service',
        title: 'Professional Packing',
        reason: 'Based on your multi-room move',
        price: 150
      });
    }

    if (distance > 100) {
      recommendations.push({
        serviceId: 'storage-service',
        title: 'Storage Solutions',
        reason: 'For long-distance moves',
        price: 75
      });
    }

    // Generate available time slots (simplified)
    const availableSlots: string[] = [];
    const moveDate = new Date(quoteRequest.moveDate);
    for (let i = 8; i <= 16; i += 2) {
      const slot = new Date(moveDate);
      slot.setHours(i, 0, 0, 0);
      availableSlots.push(slot.toISOString());
    }

    const quoteResponse: QuoteResponse = {
      serviceId: serviceId || '',
      quote: {
        basePrice,
        distanceMultiplier,
        seasonalAdjustment,
        additionalServices,
        totalPrice,
        breakdown: {
          baseService: basePrice,
          distance: distanceCost,
          seasonal: seasonalCost,
          addons: addonsTotal
        },
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        availability: {
          availableSlots
        }
      },
      recommendations
    };

    res.status(200).json({
      success: true,
      data: quoteResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating quote',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
  return; // Explicit return for TypeScript
};

// Service analytics and performance
export const getServiceAnalytics = (req: Request, res: Response) => {
  try {
    // @ts-ignore - Reserved for future analytics feature
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { period: _period = '30d', groupBy: _groupBy = 'category' } = req.query;
    const servicesData = loadServicesData();

    // Calculate analytics (simplified - in real implementation, this would come from database)
    const totalServices = servicesData.services.length;
    const activeServices = servicesData.services.filter(s => s.availability.status === 'available').length;
    
    // Mock analytics data
    const analyticsData: AnalyticsData = {
      overview: {
        totalServices,
        activeServices,
        totalBookings: 1450,
        revenue: 125000,
        avgRating: 4.7
      },
      popularServices: servicesData.services
        .sort((a, b) => b.meta.popularity - a.meta.popularity)
        .slice(0, 5)
        .map(service => ({
          serviceId: service.id,
          title: service.title,
          bookings: Math.floor(service.meta.popularity * 5),
          revenue: Math.floor(service.meta.popularity * 50),
          rating: service.meta.rating,
          growth: Math.random() * 20 + 5
        })),
      performance: {
        conversionRate: 0.23,
        avgBookingValue: 862,
        customerSatisfaction: 4.7,
        responseTime: '2.3 hours'
      },
      trends: {
        monthlyBookings: [120, 135, 142, 158, 145, 162, 178, 165, 189, 201, 195, 210],
        revenueGrowth: 12.5,
        seasonalPeaks: ['May', 'August', 'December']
      },
      customerInsights: {
        topZipCodes: ['92614', '92620', '92626', '92627', '92630'],
        popularMoveDates: ['15th', '30th', '1st', '15th', '28th'],
        commonAddons: ['packing', 'storage', 'furniture-assembly']
      }
    };

    res.status(200).json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
  return; // Explicit return for TypeScript
}; 