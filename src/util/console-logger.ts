import chalk from 'chalk';

// Console logger with better formatting and organization
class ConsoleLogger {
  private static instance: ConsoleLogger;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env['NODE_ENV'] === 'production';
  }

  static getInstance(): ConsoleLogger {
    if (!ConsoleLogger.instance) {
      ConsoleLogger.instance = new ConsoleLogger();
    }
    return ConsoleLogger.instance;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, category: string, message: string, data?: any): string {
    const timestamp = chalk.gray(this.getTimestamp());
    const levelColor = this.getLevelColor(level);
    const levelText = levelColor(`[${level.toUpperCase()}]`);
    const categoryColor = this.getCategoryColor(category);
    const categoryText = categoryColor(`[${category}]`);
    
    let formattedMessage = `${timestamp} ${levelText} ${categoryText} ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        formattedMessage += `\n${chalk.gray('  Data:')} ${JSON.stringify(data, null, 2)}`;
      } else {
        formattedMessage += ` ${chalk.gray(data)}`;
      }
    }
    
    return formattedMessage;
  }

  private getLevelColor(level: string): any {
    switch (level.toLowerCase()) {
      case 'error': return chalk.red;
      case 'warn': return chalk.yellow;
      case 'info': return chalk.blue;
      case 'debug': return chalk.green;
      default: return chalk.white;
    }
  }

  private getCategoryColor(category: string): any {
    switch (category.toLowerCase()) {
      case 'server': return chalk.cyan;
      case 'database': return chalk.yellow;
      case 'auth': return chalk.magenta;
      case 'api': return chalk.blue;
      case 'cors': return chalk.green;
      case 'security': return chalk.red;
      case 'socket': return chalk.cyan;
      case 'system': return chalk.white;
      default: return chalk.gray;
    }
  }

  // Main logging methods
  public info(category: string, message: string, data?: any): void {
    console.log(this.formatMessage('info', category, message, data));
  }

  public warn(category: string, message: string, data?: any): void {
    console.log(this.formatMessage('warn', category, message, data));
  }

  public error(category: string, message: string, error?: any): void {
    console.error(this.formatMessage('error', category, message, error));
  }

  public debug(category: string, message: string, data?: any): void {
    if (!this.isProduction) {
      console.log(this.formatMessage('debug', category, message, data));
    }
  }

  // Special formatting methods
  public success(message: string, data?: any): void {
    console.log(chalk.green('✅'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  public failure(message: string, data?: any): void {
    console.log(chalk.red('❌'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  public warning(message: string, data?: any): void {
    console.log(chalk.yellow('⚠️'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  public infoSimple(message: string, data?: any): void {
    console.log(chalk.blue('ℹ️'), message);
    if (data) console.log(chalk.gray('  Data:'), JSON.stringify(data, null, 2));
  }

  // Server status methods
  public serverStart(port: string | number, environment: string): void {
    console.log('\n' + chalk.cyan('🚀 === PackMoveGO REST API Server ==='));
    console.log(chalk.blue(`📡 API Server: http://localhost:${port}`));
    console.log(chalk.blue(`🔧 Environment: ${environment}`));
  }

  public serverReady(): void {
    console.log(chalk.green('🎯 === REST API Ready ==='));
    console.log(chalk.gray('==================================================\n'));
  }

  public endpointList(endpoints: string[]): void {
    console.log(chalk.yellow('📋 === Available API Endpoints ==='));
    endpoints.forEach(endpoint => {
      console.log(chalk.green('✅'), endpoint);
    });
  }

  public serviceStatus(services: { [key: string]: string }): void {
    console.log(chalk.yellow('⚙️ === Service Status ==='));
    Object.entries(services).forEach(([service, status]) => {
      const icon = status.includes('✅') ? '✅' : '❌';
      console.log(`${icon} ${service}: ${status}`);
    });
  }

  // Request logging
  public request(method: string, path: string, origin?: string): void {
    const originText = origin ? ` - Origin: ${origin}` : '';
    console.log(chalk.gray(`[${this.getTimestamp()}] ${method} ${path}${originText}`));
  }

  public response(statusCode: number, path: string, duration: number): void {
    const color = statusCode >= 400 ? chalk.red : chalk.green;
    const icon = statusCode >= 400 ? '❌' : '✅';
    console.log(`${icon} ${color(statusCode)} ${path} (${duration}ms)`);
  }

  // Error handling
  public uncaughtException(error: Error): void {
    console.error('\n' + chalk.red('🔥 === UNCAUGHT EXCEPTION ==='));
    console.error(chalk.red('❌ Error:'), error.message);
    console.error(chalk.red('📍 Stack:'), error.stack);
    console.error(chalk.red('🕐 Time:'), this.getTimestamp());
    console.error(chalk.red('================================\n'));
  }

  public unhandledRejection(reason: any, promise: Promise<any>): void {
    console.error('\n' + chalk.red('🔥 === UNHANDLED REJECTION ==='));
    console.error(chalk.red('❌ Promise:'), promise);
    console.error(chalk.red('📍 Reason:'), reason);
    console.error(chalk.red('🕐 Time:'), this.getTimestamp());
    console.error(chalk.red('================================\n'));
  }

  // Graceful shutdown
  public shutdown(signal: string): void {
    console.log('\n' + chalk.yellow('🛑 === GRACEFUL SHUTDOWN ==='));
    console.log(chalk.yellow(`📡 Received ${signal}. Starting graceful shutdown...`));
  }

  public shutdownComplete(): void {
    console.log(chalk.green('✅ Server closed successfully'));
    console.log(chalk.gray('================================\n'));
  }

  // Database logging
  public databaseConnect(): void {
    console.log(chalk.cyan('📦 Connecting to MongoDB...'));
  }

  public databaseConnected(): void {
    console.log(chalk.green('✅ MongoDB connected successfully'));
  }

  public databaseError(error: any): void {
    console.log(chalk.red('❌ MongoDB connection failed:'), error.message);
    console.log(chalk.yellow('⚠️ Continuing without database connection'));
  }

  // Socket.IO logging
  public socketInit(): void {
    console.log(chalk.cyan('🔌 Initializing Socket.IO server...'));
  }

  public socketReady(): void {
    console.log(chalk.green('✅ Socket.IO server initialized successfully'));
  }

  // Environment logging
  public environmentCheck(env: string, port: string | number): void {
    console.log(chalk.blue(`🔧 Environment: ${env}`));
    console.log(chalk.blue(`🌐 Port: ${port}`));
  }

  // CORS logging
  public corsConfig(origins: string[]): void {
    console.log(chalk.blue(`🌍 CORS Origins: ${origins.join(', ')}`));
  }

  // Security logging
  public securityEvent(event: string, details?: any): void {
    console.log(chalk.red(`🔒 Security Event: ${event}`));
    if (details) console.log(chalk.gray('  Details:'), JSON.stringify(details, null, 2));
  }

  // Performance logging
  public performance(metric: string, value: number, unit: string): void {
    console.log(chalk.cyan(`⚡ ${metric}: ${value}${unit}`));
  }

  // Clear console
  public clear(): void {
    console.clear();
  }

  // Separator
  public separator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }
}

// Export singleton instance
export const consoleLogger = ConsoleLogger.getInstance();

// Export convenience functions
export const log = {
  info: (category: string, message: string, data?: any) => consoleLogger.info(category, message, data),
  warn: (category: string, message: string, data?: any) => consoleLogger.warn(category, message, data),
  error: (category: string, message: string, error?: any) => consoleLogger.error(category, message, error),
  debug: (category: string, message: string, data?: any) => consoleLogger.debug(category, message, data),
  success: (message: string, data?: any) => consoleLogger.success(message, data),
  failure: (message: string, data?: any) => consoleLogger.failure(message, data),
  warning: (message: string, data?: any) => consoleLogger.warning(message, data),
  infoSimple: (message: string, data?: any) => consoleLogger.infoSimple(message, data)
};

export default consoleLogger; 