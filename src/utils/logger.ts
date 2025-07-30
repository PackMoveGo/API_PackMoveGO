// Centralized logging utility
let logger: any;
let logInfo: any;
let logError: any;
let logWarn: any;

try {
  const loggerModule = require('../util/logger');
  logger = loggerModule.default;
  logInfo = loggerModule.logInfo;
  logError = loggerModule.logError;
  logWarn = loggerModule.logWarn;
} catch (error) {
  console.log('⚠️ Logger not available, using console methods');
  logInfo = console.log;
  logError = console.error;
  logWarn = console.warn;
}

export { logger, logInfo, logError, logWarn };

// Simplified logging functions for common use cases
export const logRequest = (method: string, path: string, ip: string) => {
  logInfo(`🌐 REQUEST: ${method} ${path} from ${ip}`);
};

export const logResponse = (method: string, path: string, statusCode: number) => {
  logInfo(`✅ RESPONSE: ${method} ${path} - Status: ${statusCode} - ${new Date().toISOString()}`);
};

export const logCors = (origin: string, allowed: boolean) => {
  const status = allowed ? '✅' : '❌';
  logInfo(`${status} CORS: ${allowed ? 'Allowing' : 'Blocking'} origin: "${origin}"`);
};

export const logError500 = (error: Error, req?: any) => {
  logError('❌ Server Error:', error.stack);
  if (req) {
    logError('❌ Error details:', {
      name: error.name,
      message: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
};

export const logServerStart = (port: number, environment: string) => {
  logInfo('🚀 === PackMoveGO REST API Server ===');
  logInfo(`📡 API Server: http://localhost:${port}`);
  logInfo(`🔧 Environment: ${environment}`);
  logInfo('📋 === Server Ready ===');
}; 