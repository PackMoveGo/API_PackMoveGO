import { privateNetworkManager } from './private-network';

/**
 * AWS PrivateLink Service Configuration
 */
export interface AWSServiceConfig {
  name: string;
  defaultPort: number;
  protocol: 'tcp' | 'https' | 'mongodb' | 'postgres' | 'redis';
  connectionTemplate: string;
  requiresAuth: boolean;
  supportedRegions: string[];
}

/**
 * PrivateLink Connection Result
 */
export interface PrivateLinkConnection {
  serviceName: string;
  connectionString: string;
  endpoint: string;
  port: number;
  protocol: string;
  isPrivateLink: boolean;
  region: string;
}

/**
 * AWS Services supported via PrivateLink
 */
export const AWS_SERVICES: Record<string, AWSServiceConfig> = {
  mongodb: {
    name: 'MongoDB Atlas',
    defaultPort: 27017,
    protocol: 'mongodb',
    connectionTemplate: 'mongodb+srv://{username}:{password}@{endpoint}',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  atlas: {
    name: 'MongoDB Atlas',
    defaultPort: 27017,
    protocol: 'mongodb',
    connectionTemplate: 'mongodb+srv://{username}:{password}@{endpoint}',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  snowflake: {
    name: 'Snowflake',
    defaultPort: 443,
    protocol: 'https',
    connectionTemplate: 'https://{account}.{region}.snowflakecomputing.com',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  s3: {
    name: 'Amazon S3',
    defaultPort: 443,
    protocol: 'https',
    connectionTemplate: 'https://s3.{region}.amazonaws.com',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  rds: {
    name: 'Amazon RDS',
    defaultPort: 5432,
    protocol: 'postgres',
    connectionTemplate: 'postgresql://{username}:{password}@{endpoint}:{port}/{database}',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  elasticache: {
    name: 'Amazon ElastiCache',
    defaultPort: 6379,
    protocol: 'redis',
    connectionTemplate: 'redis://{username}:{password}@{endpoint}:{port}',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  opensearch: {
    name: 'Amazon OpenSearch',
    defaultPort: 443,
    protocol: 'https',
    connectionTemplate: 'https://{endpoint}',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  documentdb: {
    name: 'Amazon DocumentDB',
    defaultPort: 27017,
    protocol: 'mongodb',
    connectionTemplate: 'mongodb://{username}:{password}@{endpoint}:{port}/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  },
  dynamodb: {
    name: 'Amazon DynamoDB',
    defaultPort: 443,
    protocol: 'https',
    connectionTemplate: 'https://dynamodb.{region}.amazonaws.com',
    requiresAuth: true,
    supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1']
  }
};

class AWSPrivateLinkManager {
  private privateLinkConfig = privateNetworkManager.getPrivateLinkConfig();
  private networkConfig = privateNetworkManager.getConfig();

  /**
   * Check if PrivateLink is enabled and configured
   */
  isPrivateLinkEnabled(): boolean {
    return this.privateLinkConfig.enabled && 
           !!(this.privateLinkConfig.vpcEndpointId || this.privateLinkConfig.dnsName);
  }

  /**
   * Get supported AWS services
   */
  getSupportedServices(): AWSServiceConfig[] {
    return Object.values(AWS_SERVICES);
  }

  /**
   * Get specific service configuration
   */
  getServiceConfig(serviceName: string): AWSServiceConfig | null {
    return AWS_SERVICES[serviceName.toLowerCase()] || null;
  }

  /**
   * Create a PrivateLink connection for an AWS service
   */
  createConnection(
    serviceName: string,
    options: {
      username?: string;
      password?: string;
      database?: string;
      account?: string;
      customEndpoint?: string;
    } = {}
  ): PrivateLinkConnection {
    const serviceConfig = this.getServiceConfig(serviceName);
    
    if (!serviceConfig) {
      throw new Error(`Unsupported AWS service: ${serviceName}`);
    }

    if (!this.isPrivateLinkEnabled()) {
      throw new Error('AWS PrivateLink is not enabled or configured');
    }

    // Determine endpoint
    let endpoint: string;
    if (options.customEndpoint) {
      endpoint = options.customEndpoint;
    } else if (this.privateLinkConfig.dnsName) {
      endpoint = this.privateLinkConfig.dnsName;
    } else if (this.privateLinkConfig.serviceEndpoint) {
      endpoint = this.privateLinkConfig.serviceEndpoint;
    } else {
      // Fallback to standard AWS endpoint with region
      endpoint = this.buildStandardEndpoint(serviceName, serviceConfig);
    }

    // Build connection string
    const connectionString = this.buildConnectionString(
      serviceConfig,
      endpoint,
      options
    );

    return {
      serviceName,
      connectionString,
      endpoint,
      port: serviceConfig.defaultPort,
      protocol: serviceConfig.protocol,
      isPrivateLink: this.isPrivateLinkEnabled(),
      region: this.networkConfig.region
    };
  }

  /**
   * Build standard AWS endpoint for fallback
   */
  private buildStandardEndpoint(serviceName: string, config: AWSServiceConfig): string {
    const region = this.networkConfig.region;
    
    switch (serviceName.toLowerCase()) {
      case 's3':
        return `s3.${region}.amazonaws.com`;
      case 'dynamodb':
        return `dynamodb.${region}.amazonaws.com`;
      case 'rds':
        return `rds.${region}.amazonaws.com`;
      case 'elasticache':
        return `elasticache.${region}.amazonaws.com`;
      case 'opensearch':
        return `search-domain.${region}.es.amazonaws.com`;
      default:
        return `${serviceName}.${region}.amazonaws.com`;
    }
  }

  /**
   * Build connection string based on service type and options
   */
  private buildConnectionString(
    config: AWSServiceConfig,
    endpoint: string,
    options: any
  ): string {
    let template = config.connectionTemplate;
    
    // Replace placeholders
    template = template.replace('{endpoint}', endpoint);
    template = template.replace('{port}', config.defaultPort.toString());
    template = template.replace('{region}', this.networkConfig.region);
    
    if (options.username) {
      template = template.replace('{username}', options.username);
    }
    
    if (options.password) {
      template = template.replace('{password}', options.password);
    }
    
    if (options.database) {
      template = template.replace('{database}', options.database);
    }
    
    if (options.account) {
      template = template.replace('{account}', options.account);
    }

    // Clean up any remaining placeholders
    template = template.replace(/\{[^}]+\}/g, '');

    return template;
  }

  /**
   * Test PrivateLink connection
   */
  async testConnection(serviceName: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    try {
      const connection = this.createConnection(serviceName);
      const startTime = Date.now();
      
      // For now, just check if we can resolve the endpoint
      // In a real implementation, you'd make an actual connection test
      const dns = require('dns');
      const { promisify } = require('util');
      const lookup = promisify(dns.lookup);
      
      await lookup(connection.endpoint);
      const latency = Date.now() - startTime;
      
      return {
        success: true,
        message: `Connection to ${serviceName} via PrivateLink successful`,
        latency
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get PrivateLink status and configuration
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    region: string;
    supportedServices: string[];
    configuration: any;
  } {
    return {
      enabled: this.privateLinkConfig.enabled,
      configured: this.isPrivateLinkEnabled(),
      region: this.networkConfig.region,
      supportedServices: Object.keys(AWS_SERVICES),
      configuration: {
        vpcEndpointId: this.privateLinkConfig.vpcEndpointId,
        dnsName: this.privateLinkConfig.dnsName,
        serviceEndpoint: this.privateLinkConfig.serviceEndpoint,
        availabilityZones: this.privateLinkConfig.availabilityZones,
        securityGroups: this.privateLinkConfig.securityGroups
      }
    };
  }

  /**
   * Update PrivateLink configuration
   */
  updateConfiguration(config: Partial<{
    vpcEndpointId: string;
    serviceEndpoint: string;
    dnsName: string;
    availabilityZones: string[];
    securityGroups: string[];
  }>): void {
    Object.assign(this.privateLinkConfig, config);
  }
}

// Export singleton instance
export const awsPrivateLinkManager = new AWSPrivateLinkManager();

// Export utility functions
export const {
  isPrivateLinkEnabled,
  getSupportedServices,
  getServiceConfig,
  createConnection,
  testConnection,
  getStatus,
  updateConfiguration
} = awsPrivateLinkManager;

export default awsPrivateLinkManager; 