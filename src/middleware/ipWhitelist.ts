import { Request, Response, NextFunction } from 'express';

const allowedIps = (process.env.ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);

// Debug logging
console.log('🔐 IP Whitelist Configuration:');
console.log('ALLOWED_IPS env var:', process.env.ALLOWED_IPS);
console.log('Parsed allowed IPs:', allowedIps);
console.log('IP Whitelist Status:', allowedIps.length > 0 ? '✅ Active' : '❌ Not configured');

// Vercel's IP ranges
const VERCEL_IP_RANGES = [
  '76.76.21.0/24',  // Vercel's main IP range
  '76.76.21.21',    // Vercel's specific IP
  '76.76.21.22',    // Vercel's specific IP
  '76.76.21.23',    // Vercel's specific IP
  '76.76.21.24',    // Vercel's specific IP
  '76.76.21.25',    // Vercel's specific IP
  '76.76.21.26',    // Vercel's specific IP
  '76.76.21.27',    // Vercel's specific IP
  '76.76.21.28',    // Vercel's specific IP
  '76.76.21.29',    // Vercel's specific IP
  '76.76.21.30',    // Vercel's specific IP
  '76.76.21.31',    // Vercel's specific IP
  '76.76.21.32',    // Vercel's specific IP
  '76.76.21.33',    // Vercel's specific IP
  '76.76.21.34',    // Vercel's specific IP
  '76.76.21.35',    // Vercel's specific IP
  '76.76.21.36',    // Vercel's specific IP
  '76.76.21.37',    // Vercel's specific IP
  '76.76.21.38',    // Vercel's specific IP
  '76.76.21.39',    // Vercel's specific IP
  '76.76.21.40',    // Vercel's specific IP
  '76.76.21.41',    // Vercel's specific IP
  '76.76.21.42',    // Vercel's specific IP
  '76.76.21.43',    // Vercel's specific IP
  '76.76.21.44',    // Vercel's specific IP
  '76.76.21.45',    // Vercel's specific IP
  '76.76.21.46',    // Vercel's specific IP
  '76.76.21.47',    // Vercel's specific IP
  '76.76.21.48',    // Vercel's specific IP
  '76.76.21.49',    // Vercel's specific IP
  '76.76.21.50',    // Vercel's specific IP
  '76.76.21.51',    // Vercel's specific IP
  '76.76.21.52',    // Vercel's specific IP
  '76.76.21.53',    // Vercel's specific IP
  '76.76.21.54',    // Vercel's specific IP
  '76.76.21.55',    // Vercel's specific IP
  '76.76.21.56',    // Vercel's specific IP
  '76.76.21.57',    // Vercel's specific IP
  '76.76.21.58',    // Vercel's specific IP
  '76.76.21.59',    // Vercel's specific IP
  '76.76.21.60',    // Vercel's specific IP
  '76.76.21.61',    // Vercel's specific IP
  '76.76.21.62',    // Vercel's specific IP
  '76.76.21.63',    // Vercel's specific IP
  '76.76.21.64',    // Vercel's specific IP
  '76.76.21.65',    // Vercel's specific IP
  '76.76.21.66',    // Vercel's specific IP
  '76.76.21.67',    // Vercel's specific IP
  '76.76.21.68',    // Vercel's specific IP
  '76.76.21.69',    // Vercel's specific IP
  '76.76.21.70',    // Vercel's specific IP
  '76.76.21.71',    // Vercel's specific IP
  '76.76.21.72',    // Vercel's specific IP
  '76.76.21.73',    // Vercel's specific IP
  '76.76.21.74',    // Vercel's specific IP
  '76.76.21.75',    // Vercel's specific IP
  '76.76.21.76',    // Vercel's specific IP
  '76.76.21.77',    // Vercel's specific IP
  '76.76.21.78',    // Vercel's specific IP
  '76.76.21.79',    // Vercel's specific IP
  '76.76.21.80',    // Vercel's specific IP
  '76.76.21.81',    // Vercel's specific IP
  '76.76.21.82',    // Vercel's specific IP
  '76.76.21.83',    // Vercel's specific IP
  '76.76.21.84',    // Vercel's specific IP
  '76.76.21.85',    // Vercel's specific IP
  '76.76.21.86',    // Vercel's specific IP
  '76.76.21.87',    // Vercel's specific IP
  '76.76.21.88',    // Vercel's specific IP
  '76.76.21.89',    // Vercel's specific IP
  '76.76.21.90',    // Vercel's specific IP
  '76.76.21.91',    // Vercel's specific IP
  '76.76.21.92',    // Vercel's specific IP
  '76.76.21.93',    // Vercel's specific IP
  '76.76.21.94',    // Vercel's specific IP
  '76.76.21.95',    // Vercel's specific IP
  '76.76.21.96',    // Vercel's specific IP
  '76.76.21.97',    // Vercel's specific IP
  '76.76.21.98',    // Vercel's specific IP
  '76.76.21.99',    // Vercel's specific IP
  '76.76.21.100',   // Vercel's specific IP
  '76.76.21.101',   // Vercel's specific IP
  '76.76.21.102',   // Vercel's specific IP
  '76.76.21.103',   // Vercel's specific IP
  '76.76.21.104',   // Vercel's specific IP
  '76.76.21.105',   // Vercel's specific IP
  '76.76.21.106',   // Vercel's specific IP
  '76.76.21.107',   // Vercel's specific IP
  '76.76.21.108',   // Vercel's specific IP
  '76.76.21.109',   // Vercel's specific IP
  '76.76.21.110',   // Vercel's specific IP
  '76.76.21.111',   // Vercel's specific IP
  '76.76.21.112',   // Vercel's specific IP
  '76.76.21.113',   // Vercel's specific IP
  '76.76.21.114',   // Vercel's specific IP
  '76.76.21.115',   // Vercel's specific IP
  '76.76.21.116',   // Vercel's specific IP
  '76.76.21.117',   // Vercel's specific IP
  '76.76.21.118',   // Vercel's specific IP
  '76.76.21.119',   // Vercel's specific IP
  '76.76.21.120',   // Vercel's specific IP
  '76.76.21.121',   // Vercel's specific IP
  '76.76.21.122',   // Vercel's specific IP
  '76.76.21.123',   // Vercel's specific IP
  '76.76.21.124',   // Vercel's specific IP
  '76.76.21.125',   // Vercel's specific IP
  '76.76.21.126',   // Vercel's specific IP
  '76.76.21.127',   // Vercel's specific IP
  '76.76.21.128',   // Vercel's specific IP
  '76.76.21.129',   // Vercel's specific IP
  '76.76.21.130',   // Vercel's specific IP
  '76.76.21.131',   // Vercel's specific IP
  '76.76.21.132',   // Vercel's specific IP
  '76.76.21.133',   // Vercel's specific IP
  '76.76.21.134',   // Vercel's specific IP
  '76.76.21.135',   // Vercel's specific IP
  '76.76.21.136',   // Vercel's specific IP
  '76.76.21.137',   // Vercel's specific IP
  '76.76.21.138',   // Vercel's specific IP
  '76.76.21.139',   // Vercel's specific IP
  '76.76.21.140',   // Vercel's specific IP
  '76.76.21.141',   // Vercel's specific IP
  '76.76.21.142',   // Vercel's specific IP
  '76.76.21.143',   // Vercel's specific IP
  '76.76.21.144',   // Vercel's specific IP
  '76.76.21.145',   // Vercel's specific IP
  '76.76.21.146',   // Vercel's specific IP
  '76.76.21.147',   // Vercel's specific IP
  '76.76.21.148',   // Vercel's specific IP
  '76.76.21.149',   // Vercel's specific IP
  '76.76.21.150',   // Vercel's specific IP
  '76.76.21.151',   // Vercel's specific IP
  '76.76.21.152',   // Vercel's specific IP
  '76.76.21.153',   // Vercel's specific IP
  '76.76.21.154',   // Vercel's specific IP
  '76.76.21.155',   // Vercel's specific IP
  '76.76.21.156',   // Vercel's specific IP
  '76.76.21.157',   // Vercel's specific IP
  '76.76.21.158',   // Vercel's specific IP
  '76.76.21.159',   // Vercel's specific IP
  '76.76.21.160',   // Vercel's specific IP
  '76.76.21.161',   // Vercel's specific IP
  '76.76.21.162',   // Vercel's specific IP
  '76.76.21.163',   // Vercel's specific IP
  '76.76.21.164',   // Vercel's specific IP
  '76.76.21.165',   // Vercel's specific IP
  '76.76.21.166',   // Vercel's specific IP
  '76.76.21.167',   // Vercel's specific IP
  '76.76.21.168',   // Vercel's specific IP
  '76.76.21.169',   // Vercel's specific IP
  '76.76.21.170',   // Vercel's specific IP
  '76.76.21.171',   // Vercel's specific IP
  '76.76.21.172',   // Vercel's specific IP
  '76.76.21.173',   // Vercel's specific IP
  '76.76.21.174',   // Vercel's specific IP
  '76.76.21.175',   // Vercel's specific IP
  '76.76.21.176',   // Vercel's specific IP
  '76.76.21.177',   // Vercel's specific IP
  '76.76.21.178',   // Vercel's specific IP
  '76.76.21.179',   // Vercel's specific IP
  '76.76.21.180',   // Vercel's specific IP
  '76.76.21.181',   // Vercel's specific IP
  '76.76.21.182',   // Vercel's specific IP
  '76.76.21.183',   // Vercel's specific IP
  '76.76.21.184',   // Vercel's specific IP
  '76.76.21.185',   // Vercel's specific IP
  '76.76.21.186',   // Vercel's specific IP
  '76.76.21.187',   // Vercel's specific IP
  '76.76.21.188',   // Vercel's specific IP
  '76.76.21.189',   // Vercel's specific IP
  '76.76.21.190',   // Vercel's specific IP
  '76.76.21.191',   // Vercel's specific IP
  '76.76.21.192',   // Vercel's specific IP
  '76.76.21.193',   // Vercel's specific IP
  '76.76.21.194',   // Vercel's specific IP
  '76.76.21.195',   // Vercel's specific IP
  '76.76.21.196',   // Vercel's specific IP
  '76.76.21.197',   // Vercel's specific IP
  '76.76.21.198',   // Vercel's specific IP
  '76.76.21.199',   // Vercel's specific IP
  '76.76.21.200',   // Vercel's specific IP
  '76.76.21.201',   // Vercel's specific IP
  '76.76.21.202',   // Vercel's specific IP
  '76.76.21.203',   // Vercel's specific IP
  '76.76.21.204',   // Vercel's specific IP
  '76.76.21.205',   // Vercel's specific IP
  '76.76.21.206',   // Vercel's specific IP
  '76.76.21.207',   // Vercel's specific IP
  '76.76.21.208',   // Vercel's specific IP
  '76.76.21.209',   // Vercel's specific IP
  '76.76.21.210',   // Vercel's specific IP
  '76.76.21.211',   // Vercel's specific IP
  '76.76.21.212',   // Vercel's specific IP
  '76.76.21.213',   // Vercel's specific IP
  '76.76.21.214',   // Vercel's specific IP
  '76.76.21.215',   // Vercel's specific IP
  '76.76.21.216',   // Vercel's specific IP
  '76.76.21.217',   // Vercel's specific IP
  '76.76.21.218',   // Vercel's specific IP
  '76.76.21.219',   // Vercel's specific IP
  '76.76.21.220',   // Vercel's specific IP
  '76.76.21.221',   // Vercel's specific IP
  '76.76.21.222',   // Vercel's specific IP
  '76.76.21.223',   // Vercel's specific IP
  '76.76.21.224',   // Vercel's specific IP
  '76.76.21.225',   // Vercel's specific IP
  '76.76.21.226',   // Vercel's specific IP
  '76.76.21.227',   // Vercel's specific IP
  '76.76.21.228',   // Vercel's specific IP
  '76.76.21.229',   // Vercel's specific IP
  '76.76.21.230',   // Vercel's specific IP
  '76.76.21.231',   // Vercel's specific IP
  '76.76.21.232',   // Vercel's specific IP
  '76.76.21.233',   // Vercel's specific IP
  '76.76.21.234',   // Vercel's specific IP
  '76.76.21.235',   // Vercel's specific IP
  '76.76.21.236',   // Vercel's specific IP
  '76.76.21.237',   // Vercel's specific IP
  '76.76.21.238',   // Vercel's specific IP
  '76.76.21.239',   // Vercel's specific IP
  '76.76.21.240',   // Vercel's specific IP
  '76.76.21.241',   // Vercel's specific IP
  '76.76.21.242',   // Vercel's specific IP
  '76.76.21.243',   // Vercel's specific IP
  '76.76.21.244',   // Vercel's specific IP
  '76.76.21.245',   // Vercel's specific IP
  '76.76.21.246',   // Vercel's specific IP
  '76.76.21.247',   // Vercel's specific IP
  '76.76.21.248',   // Vercel's specific IP
  '76.76.21.249',   // Vercel's specific IP
  '76.76.21.250',   // Vercel's specific IP
  '76.76.21.251',   // Vercel's specific IP
  '76.76.21.252',   // Vercel's specific IP
  '76.76.21.253',   // Vercel's specific IP
  '76.76.21.254',   // Vercel's specific IP
  '76.76.21.255'    // Vercel's specific IP
];

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

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function ipWhitelist(req: Request, res: Response, next: NextFunction) {
  // Get the real client IP from various headers
  let clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                 req.headers['x-real-ip']?.toString() || 
                 req.headers['cf-connecting-ip']?.toString() ||
                 req.socket.remoteAddress || '';
  // Remove IPv6 prefix if present
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }
  
  // Debug logging
  console.log(`🔐 IP Check - Client IP: ${clientIp}, Path: ${req.path}`);
  
  // If no whitelist is configured, allow all requests
  if (allowedIps.length === 0) {
    console.log(`✅ IP ${clientIp} allowed (no whitelist configured)`);
    return next();
  }
  
  // Allow if in allowed IPs
  if (allowedIps.includes(clientIp)) {
    console.log(`✅ IP ${clientIp} allowed (whitelisted)`);
    return next();
  }
  
  // Allow if in Vercel IPs
  if (VERCEL_IP_RANGES.some(range => isIpInRange(clientIp, range))) {
    console.log(`✅ IP ${clientIp} allowed (Vercel range)`);
    return next();
  }
  
  // Allow Render's internal IPs (common Render IPs)
  const renderIps = [
    '10.0.0.0/8',    // Private network range
    '172.16.0.0/12', // Private network range
    '192.168.0.0/16', // Private network range
    '127.0.0.1',     // Localhost
    '::1'            // IPv6 localhost
  ];
  
  if (renderIps.some(range => isIpInRange(clientIp, range))) {
    console.log(`✅ IP ${clientIp} allowed (Render internal)`);
    return next();
  }
  
  // Otherwise, block
  console.log(`❌ IP ${clientIp} blocked (not whitelisted)`);
  return res.status(403).json({ error: 'Access denied: IP not whitelisted' });
} 
