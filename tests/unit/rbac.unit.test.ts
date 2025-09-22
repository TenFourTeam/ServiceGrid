import { test, expect, describe } from 'vitest';

// RBAC permission logic
type Role = 'owner' | 'admin' | 'worker';

interface User {
  id: string;
  role: Role;
  business_id: string;
}

interface Permission {
  resource: string;
  action: string;
}

// Permission checker function
function hasPermission(user: User, permission: Permission): boolean {
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

// Business resource access checker
function canAccessBusiness(user: User, targetBusinessId: string): boolean {
  return user.business_id === targetBusinessId;
}

// Customer contact info access (special security requirement)
function canAccessCustomerContactInfo(user: User): boolean {
  // Only owners can access customer contact information
  return user.role === 'owner';
}

describe('RBAC Permission System', () => {
  const testUsers = {
    owner: { id: 'owner1', role: 'owner' as const, business_id: 'bus1' },
    admin: { id: 'admin1', role: 'admin' as const, business_id: 'bus1' },
    worker: { id: 'worker1', role: 'worker' as const, business_id: 'bus1' },
  };

  describe('Owner permissions', () => {
    test('owner has all permissions', () => {
      const owner = testUsers.owner;
      
      // Should have all critical permissions
      expect(hasPermission(owner, { resource: 'business', action: 'delete' })).toBe(true);
      expect(hasPermission(owner, { resource: 'team', action: 'invite' })).toBe(true);
      expect(hasPermission(owner, { resource: 'customers', action: 'delete' })).toBe(true);
      expect(hasPermission(owner, { resource: 'invoices', action: 'create' })).toBe(true);
      expect(hasPermission(owner, { resource: 'quotes', action: 'approve' })).toBe(true);
    });

    test('owner can access customer contact info', () => {
      expect(canAccessCustomerContactInfo(testUsers.owner)).toBe(true);
    });
  });

  describe('Admin permissions', () => {
    test('admin has most permissions except critical business operations', () => {
      const admin = testUsers.admin;
      
      // Should have most permissions
      expect(hasPermission(admin, { resource: 'customers', action: 'create' })).toBe(true);
      expect(hasPermission(admin, { resource: 'jobs', action: 'assign' })).toBe(true);
      expect(hasPermission(admin, { resource: 'quotes', action: 'create' })).toBe(true);
      
      // Should NOT have critical business permissions
      expect(hasPermission(admin, { resource: 'business', action: 'delete' })).toBe(false);
      expect(hasPermission(admin, { resource: 'team', action: 'remove_owner' })).toBe(false);
    });

    test('admin cannot access customer contact info', () => {
      expect(canAccessCustomerContactInfo(testUsers.admin)).toBe(false);
    });
  });

  describe('Worker permissions', () => {
    test('worker has limited job-related permissions', () => {
      const worker = testUsers.worker;
      
      // Should have job-related permissions
      expect(hasPermission(worker, { resource: 'jobs', action: 'view' })).toBe(true);
      expect(hasPermission(worker, { resource: 'jobs', action: 'update_status' })).toBe(true);
      expect(hasPermission(worker, { resource: 'timesheet', action: 'create' })).toBe(true);
      expect(hasPermission(worker, { resource: 'customers', action: 'view' })).toBe(true);
      
      // Should NOT have administrative permissions
      expect(hasPermission(worker, { resource: 'team', action: 'invite' })).toBe(false);
      expect(hasPermission(worker, { resource: 'customers', action: 'delete' })).toBe(false);
      expect(hasPermission(worker, { resource: 'business', action: 'update' })).toBe(false);
      expect(hasPermission(worker, { resource: 'invoices', action: 'create' })).toBe(false);
    });

    test('worker cannot access customer contact info', () => {
      expect(canAccessCustomerContactInfo(testUsers.worker)).toBe(false);
    });
  });

  describe('Business access control', () => {
    test('users can only access their own business', () => {
      const user = testUsers.owner;
      
      expect(canAccessBusiness(user, 'bus1')).toBe(true);  // Own business
      expect(canAccessBusiness(user, 'bus2')).toBe(false); // Different business
    });
  });

  describe('Edge cases and security', () => {
    test('invalid role has no permissions', () => {
      const invalidUser = { id: 'test', role: 'invalid' as Role, business_id: 'bus1' };
      
      expect(hasPermission(invalidUser, { resource: 'jobs', action: 'view' })).toBe(false);
      expect(canAccessCustomerContactInfo(invalidUser)).toBe(false);
    });

    test('permission keys are case-sensitive', () => {
      const worker = testUsers.worker;
      
      expect(hasPermission(worker, { resource: 'jobs', action: 'view' })).toBe(true);
      expect(hasPermission(worker, { resource: 'Jobs', action: 'view' })).toBe(false);
      expect(hasPermission(worker, { resource: 'jobs', action: 'View' })).toBe(false);
    });
  });
});