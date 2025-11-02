import express from 'express';
import { privateNetworkManager, validatePort } from '../util/private-network';
import { awsPrivateLinkManager } from '../util/aws-privatelink';

const router = express.Router();

/**
 * Private Network Health Check
 * GET /internal/health
 */
router.get('/health', async (req, res) => {
  try {
    const networkStatus = await privateNetworkManager.getNetworkStatus();
    res.status(200).json({
      status: 'ok',
      message: 'Internal service health check',
      privateNetwork: networkStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Private network health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Service Discovery - List all registered services
 * GET /internal/services
 */
router.get('/services', async (req, res) => {
  try {
    const services = privateNetworkManager.getAllServices();
    const networkConfig = privateNetworkManager.getConfig();
    
    res.status(200).json({
      services,
      configuration: {
        privateNetworkEnabled: networkConfig.isPrivateNetworkEnabled,
        region: networkConfig.region,
        maxOpenPorts: networkConfig.maxOpenPorts,
        restrictedPorts: networkConfig.restrictedPorts
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve services',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Service Registration
 * POST /internal/services/register
 */
router.post('/services/register', (req, res) => {
  try {
    const { name, internalAddress, port, protocol, type } = req.body;
    
    if (!name || !internalAddress) {
      return res.status(400).json({
        error: 'Missing required fields: name, internalAddress',
        requiredFields: ['name', 'internalAddress'],
        optionalFields: ['port', 'protocol', 'type'],
        timestamp: new Date().toISOString()
      });
    }

    // Validate port if provided
    if (port) {
      const portValidation = validatePort(port);
      if (!portValidation.valid) {
        return res.status(400).json({
          error: portValidation.message,
          port,
          timestamp: new Date().toISOString()
        });
      }
    }

    privateNetworkManager.registerService({
      name,
      internalAddress,
      port: port || 3000,
      protocol: protocol || 'http',
      type: type || 'web'
    });

    const registeredService = privateNetworkManager.getService(name);
    
    res.status(201).json({
      message: 'Service registered successfully',
      service: registeredService,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to register service',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get specific service information
 * GET /internal/services/:serviceName
 */
router.get('/services/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = privateNetworkManager.getService(serviceName);
    
    if (!service) {
      return res.status(404).json({
        error: 'Service not found',
        serviceName,
        availableServices: privateNetworkManager.getAllServices().map(s => s.name),
        timestamp: new Date().toISOString()
      });
    }

    // Perform health check
    const isHealthy = await privateNetworkManager.healthCheckService(serviceName);
    
    res.status(200).json({
      service: {
        ...service,
        status: isHealthy ? 'healthy' : 'unhealthy'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve service information',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Instance Discovery - Get IPs for service instances
 * GET /internal/discovery/:serviceName?
 */
router.get('/discovery/:serviceName?', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const instanceIPs = await privateNetworkManager.getServiceInstanceIPs(serviceName);
    
    res.status(200).json({
      serviceName: serviceName || 'current-service',
      instanceIPs,
      count: instanceIPs.length,
      discoveryMethod: 'DNS lookup',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to discover service instances',
      message: error instanceof Error ? error.message : 'Unknown error',
      serviceName: req.params.serviceName,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create internal URL for service communication
 * POST /internal/services/url
 */
router.post('/services/url', (req, res) => {
  try {
    const { serviceName, path, protocol } = req.body;
    
    if (!serviceName) {
      return res.status(400).json({
        error: 'Service name is required',
        timestamp: new Date().toISOString()
      });
    }

    const internalUrl = privateNetworkManager.createInternalUrl(
      serviceName,
      path || '',
      protocol || 'http'
    );
    
    res.status(200).json({
      serviceName,
      internalUrl,
      path: path || '',
      protocol: protocol || 'http',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create internal URL',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * AWS PrivateLink Status
 * GET /internal/privatelink/status
 */
router.get('/privatelink/status', (req, res) => {
  try {
    const privateLinkStatus = awsPrivateLinkManager.getStatus();
    
    res.status(200).json({
      ...privateLinkStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get PrivateLink status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create AWS PrivateLink Connection
 * POST /internal/privatelink/connect/:awsService
 */
router.post('/privatelink/connect/:awsService', async (req, res) => {
  try {
    const { awsService } = req.params;
    const { username, password, database, account, customEndpoint } = req.body;
    
    if (customEndpoint) {
      // Use custom endpoint if provided
      res.status(200).json({
        awsService,
        connectionString: customEndpoint,
        type: 'custom',
        timestamp: new Date().toISOString()
      });
    } else {
      // Use AWS PrivateLink manager
      const connection = awsPrivateLinkManager.createConnection(awsService, {
        username,
        password,
        database,
        account,
        customEndpoint
      });
      
      res.status(200).json({
        ...connection,
        type: 'privatelink',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create PrivateLink connection',
      message: error instanceof Error ? error.message : 'Unknown error',
      awsService: req.params.awsService,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test AWS PrivateLink Connection
 * POST /internal/privatelink/test/:awsService
 */
router.post('/privatelink/test/:awsService', async (req, res) => {
  try {
    const { awsService } = req.params;
    const testResult = await awsPrivateLinkManager.testConnection(awsService);
    
    res.status(testResult.success ? 200 : 503).json({
      awsService,
      ...testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to test PrivateLink connection',
      message: error instanceof Error ? error.message : 'Unknown error',
      awsService: req.params.awsService,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get AWS Service Configuration
 * GET /internal/privatelink/services/:awsService?
 */
router.get('/privatelink/services/:awsService?', (req, res) => {
  try {
    const { awsService } = req.params;
    
    if (awsService) {
      const serviceConfig = awsPrivateLinkManager.getServiceConfig(awsService);
      if (!serviceConfig) {
        return res.status(404).json({
          error: 'AWS service not supported',
          awsService,
          supportedServices: awsPrivateLinkManager.getSupportedServices().map(s => s.name),
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(200).json({
        service: serviceConfig,
        timestamp: new Date().toISOString()
      });
    } else {
      const supportedServices = awsPrivateLinkManager.getSupportedServices();
      res.status(200).json({
        supportedServices,
        count: supportedServices.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get AWS service configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Update PrivateLink Configuration
 * PUT /internal/privatelink/config
 */
router.put('/privatelink/config', (req, res) => {
  try {
    const { vpcEndpointId, serviceEndpoint, dnsName, availabilityZones, securityGroups } = req.body;
    
    awsPrivateLinkManager.updateConfiguration({
      vpcEndpointId,
      serviceEndpoint,
      dnsName,
      availabilityZones,
      securityGroups
    });
    
    const updatedStatus = awsPrivateLinkManager.getStatus();
    
    res.status(200).json({
      message: 'PrivateLink configuration updated successfully',
      configuration: updatedStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update PrivateLink configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Port Validation
 * POST /internal/validate/port
 */
router.post('/validate/port', (req, res) => {
  try {
    const { port } = req.body;
    
    if (!port || typeof port !== 'number') {
      return res.status(400).json({
        error: 'Port number is required',
        timestamp: new Date().toISOString()
      });
    }

    const validation = validatePort(port);
    const networkConfig = privateNetworkManager.getConfig();
    
    res.status(200).json({
      port,
      valid: validation.valid,
      message: validation.message,
      restrictedPorts: networkConfig.restrictedPorts,
      maxOpenPorts: networkConfig.maxOpenPorts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to validate port',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Network Configuration
 * GET /internal/config
 */
router.get('/config', (req, res) => {
  try {
    const networkConfig = privateNetworkManager.getConfig();
    const privateLinkConfig = privateNetworkManager.getPrivateLinkConfig();
    
    res.status(200).json({
      privateNetwork: networkConfig,
      privateLink: privateLinkConfig,
      environment: {
        renderServiceName: process.env.RENDER_SERVICE_NAME,
        renderDiscoveryService: process.env.RENDER_DISCOVERY_SERVICE,
        renderRegion: process.env.RENDER_REGION,
        nodeEnv: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 