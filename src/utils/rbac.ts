/**
 * Role-Based Access Control (RBAC) utilities
 */

export type Role = 'owner' | 'admin' | 'worker';

export interface User {
  id: string;
  role: Role;
  business_id: string;
}

export interface Permission {
  resource: string;
  action: string;
}

export function hasPermission(user: User, permission: Permission): boolean {
  const { resource, action } = permission;
  
  switch (user.role) {
    case 'owner':
      return true; // Owner has all permissions
      
    case 'admin':
      // Admins can do most things except critical business operations
      if (resource === 'business' && action === 'delete') return false;
      if (resource === 'team' && action === 'remove_owner') return false;
      return true;
      
    case 'worker':
      // Workers have limited permissions
      const workerPermissions = [
        'jobs:view', 'jobs:update_status', 'jobs:add_notes',
        'timesheet:create', 'timesheet:view_own', 'timesheet:update_own',
        'customers:view', 'customers:contact', // Can see customer details if needed for jobs
        'quotes:view',
        'profile:view_own', 'profile:update_own',
      ];
      
      const permissionKey = `${resource}:${action}`;
      return workerPermissions.includes(permissionKey);
      
    default:
      return false;
  }
}

export function canAccessBusiness(user: User, targetBusinessId: string): boolean {
  return user.business_id === targetBusinessId;
}

export function canAccessCustomerContactInfo(user: User): boolean {
  // Only owners can access customer contact information
  return user.role === 'owner';
}