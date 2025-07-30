import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { consoleLogger } from '../util/console-logger';
import { configManager } from './app-config';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../config/.env') });

interface DatabaseStatus {
  connected: boolean;
  type: 'mongodb' | 'json' | 'none';
  lastCheck: Date;
  error?: string;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private status: DatabaseStatus = {
    connected: false,
    type: 'none',
    lastCheck: new Date()
  };

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(): Promise<void> {
    const config = configManager.getDatabaseConfig();
    
    if (!config.enabled) {
      consoleLogger.info('database', 'Database connection disabled - using JSON file storage');
      this.status = {
        connected: true,
        type: 'json',
        lastCheck: new Date()
      };
      return;
    }

    if (!config.uri) {
      consoleLogger.warning('database', 'No MongoDB URI provided - using JSON file storage');
      this.status = {
        connected: true,
        type: 'json',
        lastCheck: new Date()
      };
  return;
    }

    try {
      consoleLogger.info('database', 'Connecting to MongoDB...');
      
      await mongoose.connect(config.uri, {
        maxPoolSize: config.maxPoolSize,
        serverSelectionTimeoutMS: config.connectionTimeout,
        socketTimeoutMS: config.connectionTimeout,
        bufferCommands: false
      });

      this.status = {
        connected: true,
        type: 'mongodb',
        lastCheck: new Date()
      };

      consoleLogger.success('MongoDB connected successfully');
      
      // Set up connection event handlers
      mongoose.connection.on('error', (error) => {
        consoleLogger.error('database', 'MongoDB connection error', error);
        this.status = {
          connected: false,
          type: 'mongodb',
          lastCheck: new Date(),
          error: error.message
        };
      });

      mongoose.connection.on('disconnected', () => {
        consoleLogger.warning('database', 'MongoDB disconnected');
        this.status = {
          connected: false,
          type: 'mongodb',
          lastCheck: new Date(),
          error: 'Disconnected'
        };
      });

      mongoose.connection.on('reconnected', () => {
        consoleLogger.success('MongoDB reconnected');
        this.status = {
          connected: true,
          type: 'mongodb',
          lastCheck: new Date()
        };
      });

    } catch (error) {
      consoleLogger.error('database', 'MongoDB connection failed', error);
      this.status = {
        connected: false,
        type: 'mongodb',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Fall back to JSON storage
      consoleLogger.info('database', 'Falling back to JSON file storage');
      this.status = {
        connected: true,
        type: 'json',
        lastCheck: new Date()
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.status.type === 'mongodb' && mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
        consoleLogger.info('database', 'MongoDB disconnected');
      } catch (error) {
        consoleLogger.error('database', 'Error disconnecting from MongoDB', error);
      }
    }
    
    this.status = {
      connected: false,
      type: 'none',
      lastCheck: new Date()
    };
  }

  getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  getType(): 'mongodb' | 'json' | 'none' {
    return this.status.type;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const now = new Date();
    this.status.lastCheck = now;

    if (this.status.type === 'mongodb') {
      try {
        const adminDb = mongoose.connection.db?.admin();
        if (adminDb) {
          await adminDb.ping();
          return {
            healthy: true,
            details: {
              type: 'mongodb',
              connected: true,
              lastCheck: now
            }
          };
        } else {
          return {
            healthy: false,
            details: {
              type: 'mongodb',
              connected: false,
              error: 'Database not available',
              lastCheck: now
            }
          };
        }
      } catch (error) {
        return {
          healthy: false,
          details: {
            type: 'mongodb',
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            lastCheck: now
          }
        };
      }
    } else if (this.status.type === 'json') {
      // Check if JSON data directory exists and is accessible
      try {
        const dataPath = path.join(__dirname, '../data');
        const fs = require('fs');
        await fs.promises.access(dataPath);
        
        return {
          healthy: true,
          details: {
            type: 'json',
            connected: true,
            dataPath,
            lastCheck: now
          }
        };
      } catch (error) {
        return {
          healthy: false,
          details: {
            type: 'json',
            connected: false,
            error: 'JSON data directory not accessible',
            lastCheck: now
          }
        };
      }
    }

    return {
      healthy: false,
      details: {
        type: 'none',
        connected: false,
        error: 'No database configured',
        lastCheck: now
      }
    };
  }

  // Helper method to get data based on storage type
  async getData(collection: string, query?: any): Promise<any> {
    if (this.status.type === 'mongodb' && this.status.connected) {
      // Use MongoDB
      const model = mongoose.models[collection] || mongoose.model(collection, new mongoose.Schema({}, { strict: false }));
      return query ? model.find(query) : model.find();
    } else {
      // Use JSON files
      try {
        const dataPath = path.join(__dirname, `../data/${collection}.json`);
        const fs = require('fs');
        const data = await fs.promises.readFile(dataPath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        consoleLogger.error('database', `Error reading JSON data for ${collection}`, error);
        throw new Error(`Failed to load ${collection} data`);
      }
    }
  }

  // Helper method to save data based on storage type
  async saveData(collection: string, data: any): Promise<void> {
    if (this.status.type === 'mongodb' && this.status.connected) {
      // Use MongoDB
      const model = mongoose.models[collection] || mongoose.model(collection, new mongoose.Schema({}, { strict: false }));
      await model.create(data);
    } else {
      // Use JSON files
      try {
        const dataPath = path.join(__dirname, `../data/${collection}.json`);
        const fs = require('fs');
        await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2));
      } catch (error) {
        consoleLogger.error('database', `Error writing JSON data for ${collection}`, error);
        throw new Error(`Failed to save ${collection} data`);
      }
    }
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();

// Legacy exports for backward compatibility
export const connectDB = () => databaseManager.connect();
export const getConnectionStatus = () => databaseManager.isConnected();

// Export for testing
export default databaseManager; 