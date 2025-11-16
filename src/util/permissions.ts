/**
 * Granular Permissions System
 * Implements RBAC with fine-grained permissions
 */

export enum Permission{
  // User management
  USER_CREATE='user:create',
  USER_READ='user:read',
  USER_UPDATE='user:update',
  USER_DELETE='user:delete',
  USER_LIST='user:list',

  // Booking management
  BOOKING_CREATE='booking:create',
  BOOKING_READ='booking:read',
  BOOKING_UPDATE='booking:update',
  BOOKING_DELETE='booking:delete',
  BOOKING_LIST='booking:list',
  BOOKING_ASSIGN='booking:assign',

  // Payment management
  PAYMENT_PROCESS='payment:process',
  PAYMENT_REFUND='payment:refund',
  PAYMENT_VIEW='payment:view',

  // Analytics
  ANALYTICS_VIEW='analytics:view',
  ANALYTICS_EXPORT='analytics:export',

  // Admin
  ADMIN_PANEL='admin:panel',
  ADMIN_SETTINGS='admin:settings',
  ADMIN_USERS='admin:users',
  ADMIN_ROLES='admin:roles',

  // Content management
  CONTENT_CREATE='content:create',
  CONTENT_UPDATE='content:update',
  CONTENT_DELETE='content:delete',
  CONTENT_PUBLISH='content:publish',

  // Reports
  REPORT_VIEW='report:view',
  REPORT_CREATE='report:create',
  REPORT_EXPORT='report:export'
}

export interface RolePermissions{
  role:string;
  permissions:Permission[];
  inherits?:string[];
}

export class PermissionManager{
  // Define role hierarchies and permissions
  private static readonly ROLE_PERMISSIONS:Record<string,Permission[]>={
    customer:[
      Permission.BOOKING_CREATE,
      Permission.BOOKING_READ,
      Permission.BOOKING_UPDATE,
      Permission.PAYMENT_VIEW,
      Permission.USER_READ,
      Permission.USER_UPDATE
    ],
    mover:[
      Permission.BOOKING_READ,
      Permission.BOOKING_UPDATE,
      Permission.BOOKING_LIST,
      Permission.USER_READ,
      Permission.USER_UPDATE
    ],
    manager:[
      Permission.BOOKING_CREATE,
      Permission.BOOKING_READ,
      Permission.BOOKING_UPDATE,
      Permission.BOOKING_DELETE,
      Permission.BOOKING_LIST,
      Permission.BOOKING_ASSIGN,
      Permission.USER_CREATE,
      Permission.USER_READ,
      Permission.USER_UPDATE,
      Permission.USER_LIST,
      Permission.PAYMENT_VIEW,
      Permission.ANALYTICS_VIEW,
      Permission.REPORT_VIEW,
      Permission.REPORT_CREATE
    ],
    admin:[
      // Admins get all permissions
      ...Object.values(Permission)
    ]
  };

  /**
   * Get permissions for a role
   */
  static getPermissionsForRole(role:string):Permission[]{
    return this.ROLE_PERMISSIONS[role]||[];
  }

  /**
   * Check if role has permission
   */
  static hasPermission(role:string,permission:Permission):boolean{
    const rolePermissions=this.getPermissionsForRole(role);
    return rolePermissions.includes(permission);
  }

  /**
   * Check if role has any of the permissions
   */
  static hasAnyPermission(role:string,permissions:Permission[]):boolean{
    const rolePermissions=this.getPermissionsForRole(role);
    return permissions.some(p=>rolePermissions.includes(p));
  }

  /**
   * Check if role has all of the permissions
   */
  static hasAllPermissions(role:string,permissions:Permission[]):boolean{
    const rolePermissions=this.getPermissionsForRole(role);
    return permissions.every(p=>rolePermissions.includes(p));
  }

  /**
   * Check resource ownership
   */
  static checkOwnership(userId:string,resourceOwnerId:string):boolean{
    return userId===resourceOwnerId;
  }

  /**
   * Check if user can access resource
   */
  static canAccessResource(role:string,permission:Permission,userId?:string,resourceOwnerId?:string):boolean{
    // Check permission first
    if(!this.hasPermission(role,permission))return false;

    // If ownership check needed
    if(userId && resourceOwnerId){
      // Admins can access all resources
      if(role==='admin')return true;

      // Others can only access their own resources
      return this.checkOwnership(userId,resourceOwnerId);
    }

    return true;
  }

  /**
   * Get all roles ordered by hierarchy (lowest to highest)
   */
  static getRoleHierarchy():string[]{
    return['customer','mover','manager','admin'];
  }

  /**
   * Check if roleA has higher privileges than roleB
   */
  static hasHigherPrivilege(roleA:string,roleB:string):boolean{
    const hierarchy=this.getRoleHierarchy();
    const indexA=hierarchy.indexOf(roleA);
    const indexB=hierarchy.indexOf(roleB);

    return indexA>indexB;
  }

  /**
   * Filter list based on permissions
   */
  static filterByPermission<T extends{userId?:string}>(items:T[],userRole:string,userId:string,permission:Permission):T[]{
    // Admins see everything
    if(userRole==='admin')return items;

    // Check if role has permission
    if(!this.hasPermission(userRole,permission))return[];

    // Filter to only owned items
    return items.filter(item=>!item.userId||item.userId===userId);
  }

  /**
   * Get permitted actions for a role on a resource type
   */
  static getPermittedActions(role:string,resourceType:string):string[]{
    const rolePermissions=this.getPermissionsForRole(role);
    const prefix=`${resourceType}:`;

    return rolePermissions
      .filter(p=>p.startsWith(prefix))
      .map(p=>p.split(':')[1])
      .filter((p): p is string => p !== undefined);
  }
}

export default PermissionManager;

