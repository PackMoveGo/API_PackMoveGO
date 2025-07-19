import { Request, Response, NextFunction } from 'express';

// Configuration
const SECURITY_CONFIG = {
  // Enable IP whitelisting (set to true to enable strict mode)
  ENABLE_IP_WHITELIST: process.env.ENABLE_IP_WHITELIST === 'true',
  
  // Allowed IPs from environment variable
  ALLOWED_IPS: (process.env.ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean),
  
  // Redirect URL for unauthorized access
  REDIRECT_URL: process.env.REDIRECT_URL || 'https://www.packmovego.com',
  
  // Logging configuration
  LOG_BLOCKED_REQUESTS: process.env.LOG_BLOCKED_REQUESTS !== 'false',
  
  // Development mode (allows all requests)
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development'
};

// Trusted IP ranges for various services
const TRUSTED_IP_RANGES = {
  // Render's internal IPs
  RENDER: [
    '10.0.0.0/8',      // Private network
    '172.16.0.0/12',   // Private network
    '172.58.0.0/16',   // Render specific
    '192.168.0.0/16',  // Private network
    '127.0.0.1',       // Localhost
    '::1',             // IPv6 localhost
    '::ffff:127.0.0.1' // IPv6 localhost
  ],
  
  // Vercel IP ranges (if you're using Vercel)
  VERCEL: [
    '76.76.21.0/24',   // Vercel's main range
    '76.76.21.21',     // Specific Vercel IPs
    '76.76.21.22',
    '76.76.21.23',
    '76.76.21.24',
    '76.76.21.25',
    '76.76.21.26',
    '76.76.21.27',
    '76.76.21.28',
    '76.76.21.29',
    '76.76.21.30'
  ],
  
  // Cloudflare IPs (if using Cloudflare)
  CLOUDFLARE: [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22'
  ]
};

// Debug logging on startup
console.log('🔐 === IP Security Configuration ===');
console.log(`Security Mode: ${SECURITY_CONFIG.ENABLE_IP_WHITELIST ? '🔒 STRICT (IP Whitelist Enabled)' : '🌐 PUBLIC (IP Whitelist Disabled)'}`);
console.log(`Environment: ${SECURITY_CONFIG.IS_DEVELOPMENT ? '🛠️ Development' : '🚀 Production'}`);
console.log(`Redirect URL: ${SECURITY_CONFIG.REDIRECT_URL}`);
console.log(`Allowed IPs: ${SECURITY_CONFIG.ALLOWED_IPS.length > 0 ? SECURITY_CONFIG.ALLOWED_IPS.join(', ') : 'None configured'}`);
console.log(`Log Blocked: ${SECURITY_CONFIG.LOG_BLOCKED_REQUESTS ? '✅ Enabled' : '❌ Disabled'}`);
console.log('=====================================');

// Function to check if an IP is in a CIDR range
function isIpInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  
  const [range, bits = '32'] = cidr.split('/');
  const ipAddr = ipToLong(ip);
  const rangeAddr = ipToLong(range);
  const mask = ~(2 ** (32 - Number(bits)) - 1);
  return (ipAddr & mask) === (rangeAddr & mask);
}

// Convert IP to long integer
function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Get real client IP from various headers
function getClientIp(req: Request): string {
  let clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                 req.headers['x-real-ip']?.toString() || 
                 req.headers['cf-connecting-ip']?.toString() ||
                 req.headers['x-client-ip']?.toString() ||
                 req.socket.remoteAddress || '';
  
  // Remove IPv6 prefix if present
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }
  
  return clientIp;
}

// Check if IP is in trusted ranges
function isTrustedIp(ip: string): boolean {
  // Check Render IPs
  if (TRUSTED_IP_RANGES.RENDER.some(range => isIpInRange(ip, range))) {
    return true;
  }
  
  // Check Vercel IPs
  if (TRUSTED_IP_RANGES.VERCEL.some(range => isIpInRange(ip, range))) {
    return true;
  }
  
  // Check Cloudflare IPs
  if (TRUSTED_IP_RANGES.CLOUDFLARE.some(range => isIpInRange(ip, range))) {
    return true;
  }
  
  return false;
}

// Main IP whitelist middleware
export function ipWhitelist(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req);
  const requestPath = req.path;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Always allow health checks
  if (requestPath === '/api/health' || requestPath === '/api/health/simple' || requestPath === '/health') {
    console.log(`✅ Health check allowed from ${clientIp}`);
    return next();
  }
  
  // In development, allow all requests
  if (SECURITY_CONFIG.IS_DEVELOPMENT) {
    console.log(`✅ Development mode - allowing ${clientIp} for ${requestPath}`);
    return next();
  }
  
  // If IP whitelist is disabled, allow all requests
  if (!SECURITY_CONFIG.ENABLE_IP_WHITELIST) {
    console.log(`✅ Public API mode - allowing ${clientIp} for ${requestPath}`);
    return next();
  }
  
  // Check if IP is explicitly allowed
  if (SECURITY_CONFIG.ALLOWED_IPS.includes(clientIp)) {
    console.log(`✅ IP ${clientIp} explicitly allowed for ${requestPath}`);
    return next();
  }
  
  // Check if IP is in trusted ranges
  if (isTrustedIp(clientIp)) {
    console.log(`✅ IP ${clientIp} in trusted range for ${requestPath}`);
  return next();
} 
  
  // Block the request and redirect
  if (SECURITY_CONFIG.LOG_BLOCKED_REQUESTS) {
    console.warn(`🚫 BLOCKED: IP ${clientIp} accessing ${requestPath} (User-Agent: ${userAgent})`);
  }
  
  // Redirect to main website
  res.redirect(302, SECURITY_CONFIG.REDIRECT_URL);
}

// Export configuration for other modules
export { SECURITY_CONFIG }; 
