/**
 * Express Type Augmentations
 * Extend Express types with custom properties
 */

import{JWTPayload} from '../util/jwt-utils';

declare global{
  namespace Express{
    interface Request{
      user?:JWTPayload | {
        userId: string;
        email?: string;
        role: 'customer' | 'mover' | 'shiftlead' | 'admin' | 'manager' | string;
      };
      requestId?:string;
      csrfToken?:string;
      apiKeyType?:'frontend'|'admin';
      sessionId?:string;
      fingerprint?:string;
    }

    interface Response{
      // Add any custom response methods if needed
    }
  }
}

export{};

