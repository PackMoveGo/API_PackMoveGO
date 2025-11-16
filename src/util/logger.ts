import chalk from 'chalk';

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Log categories
export enum LogCategory {
  AUTH = 'AUTH',
  API = 'API',
  CORS = 'CORS',
  DATABASE = 'DB',
  SECURITY = 'SEC',
  USER = 'USER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYS',
  PERFORMANCE = 'PERF',
  NETWORK = 'NET'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  ip?: string;
  endpoint?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = process.env['LOG_LEVEL'] ? 
      parseInt(process.env['LOG_LEVEL']) : LogLevel.INFO;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private getLevelColor(level: LogLevel): any {
    switch (level) {
      case LogLevel.ERROR: return chalk.red;
      case LogLevel.WARN: return chalk.yellow;
      case LogLevel.INFO: return chalk.blue;
      case LogLevel.DEBUG: return chalk.green;
      case LogLevel.TRACE: return chalk.gray;
      default: return chalk.white;
    }
  }

  private getLevelText(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return 'ERROR';
      case LogLevel.WARN: return 'WARN ';
      case LogLevel.INFO: return 'INFO ';
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.TRACE: return 'TRACE';
      default: return 'UNKN ';
    }
  }

  private getCategoryColor(category: LogCategory): any {
    switch (category) {
      case LogCategory.AUTH: return chalk.magenta;
      case LogCategory.API: return chalk.cyan;
      case LogCategory.CORS: return chalk.blue;
      case LogCategory.DATABASE: return chalk.yellow;
      case LogCategory.SECURITY: return chalk.red;
      case LogCategory.USER: return chalk.green;
      case LogCategory.ADMIN: return chalk.magenta;
      case LogCategory.SYSTEM: return chalk.white;
      case LogCategory.PERFORMANCE: return chalk.cyan;
      case LogCategory.NETWORK: return chalk.blue;
      default: return chalk.white;
    }
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = chalk.gray(entry.timestamp);
    const levelColor = this.getLevelColor(entry.level);
    const levelText = levelColor(this.getLevelText(entry.level));
    const categoryColor = this.getCategoryColor(entry.category);
    const category = categoryColor(`[${entry.category}]`);
    
    let logLine = `${timestamp} ${levelText} ${category} ${entry.message}`;
    
    if (entry.userId) {
      logLine += chalk.gray(` | User: ${entry.userId}`);
    }
    
    if (entry.ip) {
      logLine += chalk.gray(` | IP: ${entry.ip}`);
    }
    
    if (entry.endpoint) {
      logLine += chalk.gray(` | ${entry.endpoint}`);
    }
    
    return logLine;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any, context?: {
    userId?: string;
    ip?: string;
    endpoint?: string;
  }): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      category,
      message,
      data,
      userId: context?.userId,
      ip: context?.ip,
      endpoint: context?.endpoint
    };

    const formattedLog = this.formatLog(entry);
    console.log(formattedLog);

    if (data && level >= LogLevel.DEBUG) {
      console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
    }
  }

  // Public logging methods
  public error(category: LogCategory, message: string, data?: any, context?: any): void {
    this.log(LogLevel.ERROR, category, message, data, context);
  }

  public warn(category: LogCategory, message: string, data?: any, context?: any): void {
    this.log(LogLevel.WARN, category, message, data, context);
  }

  public info(category: LogCategory, message: string, data?: any, context?: any): void {
    this.log(LogLevel.INFO, category, message, data, context);
  }

  public debug(category: LogCategory, message: string, data?: any, context?: any): void {
    this.log(LogLevel.DEBUG, category, message, data, context);
  }

  public trace(category: LogCategory, message: string, data?: any, context?: any): void {
    this.log(LogLevel.TRACE, category, message, data, context);
  }

  // Convenience methods for common scenarios
  public auth(message: string, data?: any, context?: any): void {
    this.info(LogCategory.AUTH, message, data, context);
  }

  public api(message: string, data?: any, context?: any): void {
    this.info(LogCategory.API, message, data, context);
  }

  public cors(message: string, data?: any, context?: any): void {
    this.debug(LogCategory.CORS, message, data, context);
  }

  public security(message: string, data?: any, context?: any): void {
    this.warn(LogCategory.SECURITY, message, data, context);
  }

  public user(message: string, data?: any, context?: any): void {
    this.info(LogCategory.USER, message, data, context);
  }

  public admin(message: string, data?: any, context?: any): void {
    this.info(LogCategory.ADMIN, message, data, context);
  }

  public system(message: string, data?: any, context?: any): void {
    this.info(LogCategory.SYSTEM, message, data, context);
  }

  public performance(message: string, data?: any, context?: any): void {
    this.debug(LogCategory.PERFORMANCE, message, data, context);
  }

  // Special formatting methods
  public success(message: string, data?: any, _context?: any): void {
    console.log(chalk.green('✅'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  public failure(message: string, data?: any, _context?: any): void {
    console.log(chalk.red('❌'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  public warning(message: string, data?: any, _context?: any): void {
    console.log(chalk.yellow('⚠️'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  public infoSimple(message: string, data?: any, _context?: any): void {
    console.log(chalk.blue('ℹ️'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  // Request logging
  public request(method: string, path: string, ip: string, userId?: string): void {
    this.api(`${method} ${path}`, undefined, { ip, userId });
  }

  public response(statusCode: number, path: string, duration: number, userId?: string): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${statusCode} ${path} (${duration}ms)`;
    this.log(level, LogCategory.API, message, undefined, { userId });
  }

  // Authentication logging
  public login(email: string, success: boolean, ip: string): void {
    const message = `${success ? 'Successful' : 'Failed'} login for ${email}`;
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, LogCategory.AUTH, message, undefined, { ip });
  }

  public logout(userId: string, ip: string): void {
    this.auth(`Logout for user ${userId}`, undefined, { ip });
  }

  // Admin actions
  public adminAction(action: string, adminId: string, targetId?: string): void {
    const message = `Admin action: ${action}`;
    this.admin(message, { adminId, targetId });
  }

  // Security events
  public securityEvent(event: string, ip: string, details?: any): void {
    this.security(`Security event: ${event}`, details, { ip });
  }

  // Performance monitoring
  public performanceMetric(metric: string, value: number, unit: string): void {
    this.performance(`${metric}: ${value}${unit}`);
  }

  // Database operations
  public database(operation: string, table: string, duration?: number): void {
    const message = `${operation} on ${table}`;
    if (duration) {
      this.performance(message, { duration: `${duration}ms` });
    } else {
      this.info(LogCategory.DATABASE, message);
    }
  }

  // System events
  public startup(component: string): void {
    this.system(`🚀 ${component} started`);
  }

  public shutdown(component: string): void {
    this.system(`🛑 ${component} stopped`);
  }


}

// Create and export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  error: (message: string, error?: Error, context?: any) => logger.error(LogCategory.SYSTEM, message, error?.stack, context),
  warn: (message: string, data?: any, context?: any) => logger.warn(LogCategory.SYSTEM, message, data, context),
  info: (message: string, data?: any, context?: any) => logger.info(LogCategory.SYSTEM, message, data, context),
  debug: (message: string, data?: any, context?: any) => logger.debug(LogCategory.SYSTEM, message, data, context),
  success: (message: string, data?: any, context?: any) => logger.success(message, data, context),
  failure: (message: string, data?: any, context?: any) => logger.failure(message, data, context),
  warning: (message: string, data?: any, context?: any) => logger.warning(message, data, context)
};

export default logger; 