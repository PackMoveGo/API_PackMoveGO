import { Router } from 'express';
import type { Request, Response } from 'express';

const router=Router();

// Geolocation API endpoints configuration
const GEOLOCATION_APIS=[
  {
    name: 'ipapi.co',
    url: 'https://ipapi.co/json/',
    parseResponse: (data: any) => ({
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      region: data.region,
      country: data.country_name,
      source: 'ipapi.co'
    })
  },
  {
    name: 'ip-api.com',
    url: 'https://ip-api.com/json/?fields=status,message,lat,lon,city,region,country',
    parseResponse: (data: any) => ({
      latitude: data.lat,
      longitude: data.lon,
      city: data.city,
      region: data.region || data.regionName,
      country: data.country,
      source: 'ip-api.com'
    })
  },
  {
    name: 'freeipapi.com',
    url: 'https://freeipapi.com/api/json/',
    parseResponse: (data: any) => ({
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.cityName,
      region: data.regionName,
      country: data.countryName,
      source: 'freeipapi.com'
    })
  }
];

// Fallback response for when all APIs fail
const FALLBACK_RESPONSE={
  latitude: 37.7749,
  longitude: -122.4194,
  city: 'San Francisco',
  region: 'California',
  country: 'United States',
  source: 'fallback',
  message: 'Using default location (San Francisco, CA)'
};

/**
 * GET /v0/geolocation
 * Proxies IP geolocation requests to external APIs
 * Tries multiple APIs in sequence until one succeeds
 */
router.get('/geolocation', async (req: Request, res: Response) => {
  // Set CORS headers
  const origin=req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  console.log('🌍 [GEOLOCATION] Backend proxy request received');
  
  // Try each API in sequence
  for (const api of GEOLOCATION_APIS) {
    try {
      console.log(`🌍 [GEOLOCATION] Trying ${api.name}...`);
      
      const response=await fetch(api.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PackMoveGo/1.0'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        console.log(`⚠️  [GEOLOCATION] ${api.name} returned ${response.status}`);
        continue;
      }
      
      const data=await response.json();
      const parsedData=api.parseResponse(data);
      
      console.log(`✅ [GEOLOCATION] Success with ${api.name}`);
      return res.status(200).json({
        success: true,
        ...parsedData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.log(`❌ [GEOLOCATION] ${api.name} failed:`, error.message);
      continue;
    }
  }
  
  // All APIs failed, return fallback
  console.log('⚠️  [GEOLOCATION] All APIs failed, using fallback location');
  return res.status(200).json({
    success: true,
    ...FALLBACK_RESPONSE,
    timestamp: new Date().toISOString()
  });
});

// Handle OPTIONS preflight for CORS
router.options('/geolocation', (req: Request, res: Response) => {
  const origin=req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.status(200).end();
});

export default router;

