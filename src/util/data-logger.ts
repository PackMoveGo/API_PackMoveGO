import fs from 'fs';
import path from 'path';

interface RequestLogEntry {
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  origin: string;
  statusCode?: number;
  responseTime?: number;
}

class DataLogger {
  private logFile: string;

  constructor() {
    this.logFile = path.join(process.cwd(), 'logs', 'requests.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logRequest(req: any, statusCode?: number, responseTime?: number) {
    const entry: RequestLogEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      origin: req.headers.origin || 'Unknown',
      statusCode,
      responseTime
    };

    this.writeToFile(entry);
    this.logToConsole(entry);
  }

  private writeToFile(entry: RequestLogEntry) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('❌ Failed to write to log file:', error);
    }
  }

  private logToConsole(entry: RequestLogEntry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`[${timestamp}] ${entry.method} ${entry.path}`);
    console.log(`   IP: ${entry.ip}`);
    console.log(`   Origin: ${entry.origin}`);
    if (entry.statusCode) {
      console.log(`   Status: ${entry.statusCode}`);
    }
    if (entry.responseTime) {
      console.log(`   Response Time: ${entry.responseTime}ms`);
    }
  }

  getRecentLogs(limit: number = 100): RequestLogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }
      
      const fileContent = fs.readFileSync(this.logFile, 'utf-8');
      const lines = fileContent.trim().split('\n').filter(line => line.length > 0);
      
      return lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null);
    } catch (error) {
      console.error('❌ Failed to read log file:', error);
      return [];
    }
  }
}

export default new DataLogger(); 