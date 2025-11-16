import{Request,Response,NextFunction} from 'express';
import PermissionManager,{Permission} from '../util/permissions';
import{AuthenticatedRequest} from './authMiddleware';

/**
 * Middleware to require specific permission
 */
export const requirePermission=(permission:Permission)=>{
  return (req:AuthenticatedRequest,res:Response,next:NextFunction):void=>{
    if(!req.user){
      res.status(401).json({
        success:false,
        message:'Authentication required',
        error:'AUTH_REQUIRED',
        timestamp:new Date().toISOString()
      });
      return;
    }

    const hasPermission=PermissionManager.hasPermission(req.user.role,permission);

    if(!hasPermission){
      res.status(403).json({
        success:false,
        message:'Insufficient permissions',
        error:'PERMISSION_DENIED',
        required:permission,
        userRole:req.user.role,
        timestamp:new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission=(permissions:Permission[])=>{
  return (req:AuthenticatedRequest,res:Response,next:NextFunction):void=>{
    if(!req.user){
      res.status(401).json({
        success:false,
        message:'Authentication required',
        error:'AUTH_REQUIRED',
        timestamp:new Date().toISOString()
      });
      return;
    }

    const hasAny=PermissionManager.hasAnyPermission(req.user.role,permissions);

    if(!hasAny){
      res.status(403).json({
        success:false,
        message:'Insufficient permissions',
        error:'PERMISSION_DENIED',
        required:permissions,
        userRole:req.user.role,
        timestamp:new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require all specified permissions
 */
export const requireAllPermissions=(permissions:Permission[])=>{
  return (req:AuthenticatedRequest,res:Response,next:NextFunction):void=>{
    if(!req.user){
      res.status(401).json({
        success:false,
        message:'Authentication required',
        error:'AUTH_REQUIRED',
        timestamp:new Date().toISOString()
      });
      return;
    }

    const hasAll=PermissionManager.hasAllPermissions(req.user.role,permissions);

    if(!hasAll){
      res.status(403).json({
        success:false,
        message:'Insufficient permissions',
        error:'PERMISSION_DENIED',
        required:permissions,
        userRole:req.user.role,
        timestamp:new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check resource ownership
 */
export const requireOwnership=(resourceUserIdExtractor:(req:Request)=>string|undefined)=>{
  return (req:AuthenticatedRequest,res:Response,next:NextFunction):void=>{
    if(!req.user){
      res.status(401).json({
        success:false,
        message:'Authentication required',
        error:'AUTH_REQUIRED',
        timestamp:new Date().toISOString()
      });
      return;
    }

    // Admins bypass ownership check
    if(req.user.role==='admin'){
      return next();
    }

    const resourceOwnerId=resourceUserIdExtractor(req);

    if(!resourceOwnerId){
      res.status(400).json({
        success:false,
        message:'Resource owner not found',
        error:'OWNER_NOT_FOUND',
        timestamp:new Date().toISOString()
      });
      return;
    }

    const isOwner=PermissionManager.checkOwnership(req.user.userId,resourceOwnerId);

    if(!isOwner){
      res.status(403).json({
        success:false,
        message:'Access denied: Not resource owner',
        error:'NOT_OWNER',
        timestamp:new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require permission and ownership
 */
export const requirePermissionAndOwnership=(
  permission:Permission,
  resourceUserIdExtractor:(req:Request)=>string|undefined
)=>{
  return async (req:AuthenticatedRequest,res:Response,next:NextFunction):Promise<void>=>{
    if(!req.user){
      res.status(401).json({
        success:false,
        message:'Authentication required',
        error:'AUTH_REQUIRED',
        timestamp:new Date().toISOString()
      });
      return;
    }

    // Check permission
    const hasPermission=PermissionManager.hasPermission(req.user.role,permission);
    if(!hasPermission){
      res.status(403).json({
        success:false,
        message:'Insufficient permissions',
        error:'PERMISSION_DENIED',
        timestamp:new Date().toISOString()
      });
      return;
    }

    // Admins bypass ownership
    if(req.user.role==='admin'){
      return next();
    }

    // Check ownership
    const resourceOwnerId=resourceUserIdExtractor(req);
    if(resourceOwnerId){
      const isOwner=PermissionManager.checkOwnership(req.user.userId,resourceOwnerId);
      if(!isOwner){
        res.status(403).json({
          success:false,
          message:'Access denied: Not resource owner',
          error:'NOT_OWNER',
          timestamp:new Date().toISOString()
        });
        return;
      }
    }

    next();
  };
};

export default{
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireOwnership,
  requirePermissionAndOwnership
};

