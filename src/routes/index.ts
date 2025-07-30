// Route imports
import healthRoutes from './health-routes';
import v0Routes from './v0-routes';

// Existing route imports from the route directory
import signupRoutes from '../route/signup';
import sectionRoutes from '../route/sectionRoutes';
import securityRoutes from '../route/securityRoutes';
import prelaunchRoutes from '../route/prelaunchRoutes';
import authRoutes from '../route/authRoutes';
import sshRoutes from '../route/sshRoutes';
import dataRoutes from '../route/dataRoutes';
import servicesRoutes from '../route/servicesRoutes';
import analyticsRoutes from '../route/analyticsRoutes';

export {
  // New modular routes
  healthRoutes,
  v0Routes,
  
  // Existing routes
  signupRoutes,
  sectionRoutes,
  securityRoutes,
  prelaunchRoutes,
  authRoutes,
  sshRoutes,
  dataRoutes,
  servicesRoutes,
  analyticsRoutes
}; 