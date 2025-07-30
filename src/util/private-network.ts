import dns from 'dns';
import { promisify } from 'util';

// DNS lookup functions
const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);

/**
 * Private Network Configuration
 * Based on Render's private network documentation
 */
export interface PrivateNetworkConfig {
  isPrivateNetworkEnabled: boolean;
  internalHostname: string;
  discoveryHostname: string;
  region: string;
  workspace: string;
  environment: string;
  restrictedPorts: number[];
  maxOpenPorts: number;
}

/**
 * Service Discovery Information
 */
export interface ServiceInfo {
  name: string;
  internalAddress: string;
  discoveryAddress: string;
  port: number;
  protocol: string;
  type: 'web' | 'private' | 'worker' | 'cron' | 'database';
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: Date;
}

/**
 * AWS PrivateLink Configuration
 */
export interface PrivateLinkConfig {
  enabled: boolean;
  vpcEndpointId?: string;
  serviceEndpoint?: string;
  dnsName?: string;
  availabilityZones?: string[];
  securityGroups?: string[];
}

class PrivateNetworkManager {
  private config: PrivateNetworkConfig;
  private services: Map<string, ServiceInfo> = new Map();
  private privateLinkConfig: PrivateLinkConfig;

  constructor() {
    this.config = {
      isPrivateNetworkEnabled: this.isOnRenderPrivateNetwork(),
      internalHostname: this.getInternalHostname(),
      discoveryHostname: this.getDiscoveryHostname(),
      region: process.env.RENDER_REGION || 'oregon',
      workspace: process.env.RENDER_WORKSPACE || 'default',
      environment: process.env.RENDER_ENVIRONMENT || 'production',
      restrictedPorts: [10000, 18012, 18013, 19099],
      maxOpenPorts: 75
    };

    this.privateLinkConfig = {
      enabled: process.env.PRIVATE_LINK_ENABLED === 'true',
      vpcEndpointId: process.env.VPC_ENDPOINT_ID,
      serviceEndpoint: process.env.PRIVATE_LINK_SERVICE_ENDPOINT,
      dnsName: process.env.PRIVATE_LINK_DNS_NAME,
      availabilityZones: process.env.AVAILABILITY_ZONES?.split(','),
      securityGroups: process.env.SECURITY_GROUPS?.split(',')
    };

    this.initializeServiceRegistry();
  }

  /**
   * Check if running on Render's private network
   */
  private isOnRenderPrivateNetwork(): boolean {
    return !!(
      process.env.RENDER && 
      process.env.RENDER_SERVICE_NAME &&
      process.env.RENDER_DISCOVERY_SERVICE
    );
  }

  /**
   * Get internal hostname for this service
   */
  private getInternalHostname(): string {
    if (process.env.RENDER_SERVICE_NAME) {
      // Render automatically assigns internal hostnames
      return process.env.RENDER_SERVICE_NAME;
    }
    return process.env.INTERNAL_HOSTNAME || 'localhost';
  }

  /**
   * Get discovery hostname for this service
   */
  private getDiscoveryHostname(): string {
    if (process.env.RENDER_DISCOVERY_SERVICE) {
      return process.env.RENDER_DISCOVERY_SERVICE;
    }
    const internalHostname = this.getInternalHostname();
    return `${internalHostname}-discovery`;
  }

  /**
   * Initialize service registry with current service
   */
  private initializeServiceRegistry(): void {
    const currentService: ServiceInfo = {
      name: process.env.RENDER_SERVICE_NAME || 'api-service',
      internalAddress: `${this.config.internalHostname}:${process.env.PORT || 3000}`,
      discoveryAddress: this.config.discoveryHostname,
      port: parseInt(process.env.PORT || '3000', 10),
      protocol: 'http',
      type: 'web',
      status: 'healthy',
      lastHealthCheck: new Date()
    };

    this.services.set(currentService.name, currentService);
  }

  /**
   * Get all instance IPs for a service using DNS discovery
   */
  async getServiceInstanceIPs(serviceName?: string): Promise<string[]> {
    try {
      const discoveryHostname = serviceName 
        ? `${serviceName}-discovery`
        : this.config.discoveryHostname;

      // Perform DNS lookup for all IPv4 addresses
      const addresses = await lookup(discoveryHostname, { 
        all: true, 
        family: 4 
      });

      return addresses.map(addr => addr.address);
    } catch (error) {
      console.warn(`Failed to resolve service IPs for ${serviceName}:`, error);
      return [];
    }
  }

  /**
   * Check if a port is restricted for private network use
   */
  isPortRestricted(port: number): boolean {
    return this.config.restrictedPorts.includes(port);
  }

  /**
   * Validate port for private network communication
   */
  validatePort(port: number): { valid: boolean; message?: string } {
    if (this.isPortRestricted(port)) {
      return {
        valid: false,
        message: `Port ${port} is restricted for private network communication`
      };
    }

    if (port < 1 || port > 65535) {
      return {
        valid: false,
        message: `Port ${port} is not in valid range (1-65535)`
      };
    }

    return { valid: true };
  }

  /**
   * Register a service in the private network
   */
  registerService(serviceInfo: Partial<ServiceInfo>): void {
    const service: ServiceInfo = {
      name: serviceInfo.name || 'unknown',
      internalAddress: serviceInfo.internalAddress || 'unknown',
      discoveryAddress: serviceInfo.discoveryAddress || 'unknown',
      port: serviceInfo.port || 3000,
      protocol: serviceInfo.protocol || 'http',
      type: serviceInfo.type || 'web',
      status: serviceInfo.status || 'unknown',
      lastHealthCheck: new Date()
    };

    this.services.set(service.name, service);
  }

  /**
   * Get service information by name
   */
  getService(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  /**
   * Get all registered services
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Create internal URL for service communication
   */
  createInternalUrl(serviceName: string, path: string = '', protocol: string = 'http'): string {
    const service = this.getService(serviceName);
    if (service) {
      return `${protocol}://${service.internalAddress}${path}`;
    }
    
    // Fallback: assume standard naming convention
    return `${protocol}://${serviceName}${path}`;
  }

  /**
   * Health check for internal services
   */
  async healthCheckService(serviceName: string): Promise<boolean> {
    try {
      const service = this.getService(serviceName);
      if (!service) {
        return false;
      }

      // For now, just check if we can resolve the discovery hostname
      const ips = await this.getServiceInstanceIPs(serviceName);
      const isHealthy = ips.length > 0;

      // Update service status
      service.status = isHealthy ? 'healthy' : 'unhealthy';
      service.lastHealthCheck = new Date();

      return isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Get private network configuration
   */
  getConfig(): PrivateNetworkConfig {
    return { ...this.config };
  }

  /**
   * Get AWS PrivateLink configuration
   */
  getPrivateLinkConfig(): PrivateLinkConfig {
    return { ...this.privateLinkConfig };
  }

  /**
   * Connect to AWS service via PrivateLink
   */
  createPrivateLinkConnection(awsService: string): string {
    if (!this.privateLinkConfig.enabled) {
      throw new Error('AWS PrivateLink is not enabled');
    }

    // Return the appropriate connection string based on AWS service
    switch (awsService.toLowerCase()) {
      case 'mongodb':
      case 'atlas':
        return this.privateLinkConfig.serviceEndpoint || 
               `mongodb+srv://${this.privateLinkConfig.dnsName}`;
      
      case 'snowflake':
        return this.privateLinkConfig.serviceEndpoint ||
               `https://${this.privateLinkConfig.dnsName}`;
      
      case 's3':
        return this.privateLinkConfig.serviceEndpoint ||
               `https://s3.${this.config.region}.amazonaws.com`;
      
      default:
        return this.privateLinkConfig.serviceEndpoint ||
               `https://${this.privateLinkConfig.dnsName}`;
    }
  }

  /**
   * Get network status and diagnostics
   */
  async getNetworkStatus(): Promise<{
    privateNetwork: boolean;
    internalHostname: string;
    discoveryHostname: string;
    region: string;
    services: ServiceInfo[];
    privateLinkEnabled: boolean;
    instanceIPs: string[];
  }> {
    const instanceIPs = await this.getServiceInstanceIPs();
    
    return {
      privateNetwork: this.config.isPrivateNetworkEnabled,
      internalHostname: this.config.internalHostname,
      discoveryHostname: this.config.discoveryHostname,
      region: this.config.region,
      services: this.getAllServices(),
      privateLinkEnabled: this.privateLinkConfig.enabled,
      instanceIPs
    };
  }
}

// Export singleton instance
export const privateNetworkManager = new PrivateNetworkManager();

// Utility functions
export const {
  getServiceInstanceIPs,
  isPortRestricted,
  validatePort,
  registerService,
  getService,
  getAllServices,
  createInternalUrl,
  healthCheckService,
  getConfig,
  getPrivateLinkConfig,
  createPrivateLinkConnection,
  getNetworkStatus
} = privateNetworkManager;

export default privateNetworkManager; 