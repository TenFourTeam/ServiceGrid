import { describe, it, expect } from 'vitest';
import {
  type Role,
  type User,
  type Permission,
  hasPermission,
  canAccessBusiness,
  canAccessCustomerContactInfo
} from '@/utils/rbac';

describe('RBAC Permission System', () => {
  const testUsers = {
    owner: { id: 'owner1', role: 'owner' as const, business_id: 'bus1' },
    admin: { id: 'admin1', role: 'admin' as const, business_id: 'bus1' },
    worker: { id: 'worker1', role: 'worker' as const, business_id: 'bus1' },
  };

  describe('Owner permissions', () => {
    it('owner has all permissions', () => {
      const owner = testUsers.owner;
      
      // Should have all critical permissions
      expect(hasPermission(owner, { resource: 'business', action: 'delete' })).toBe(true);
      expect(hasPermission(owner, { resource: 'team', action: 'invite' })).toBe(true);
      expect(hasPermission(owner, { resource: 'customers', action: 'delete' })).toBe(true);
      expect(hasPermission(owner, { resource: 'invoices', action: 'create' })).toBe(true);
      expect(hasPermission(owner, { resource: 'quotes', action: 'approve' })).toBe(true);
    });

    it('owner can access customer contact info', () => {
      expect(canAccessCustomerContactInfo(testUsers.owner)).toBe(true);
    });
  });

  describe('Admin permissions', () => {
    it('admin has most permissions except critical business operations', () => {
      const admin = testUsers.admin;
      
      // Should have most permissions
      expect(hasPermission(admin, { resource: 'customers', action: 'create' })).toBe(true);
      expect(hasPermission(admin, { resource: 'jobs', action: 'assign' })).toBe(true);
      expect(hasPermission(admin, { resource: 'quotes', action: 'create' })).toBe(true);
      
      // Should NOT have critical business permissions
      expect(hasPermission(admin, { resource: 'business', action: 'delete' })).toBe(false);
      expect(hasPermission(admin, { resource: 'team', action: 'remove_owner' })).toBe(false);
    });

    it('admin cannot access customer contact info', () => {
      expect(canAccessCustomerContactInfo(testUsers.admin)).toBe(false);
    });
  });

  describe('Worker permissions', () => {
    it('worker has limited job-related permissions', () => {
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

    it('worker cannot access customer contact info', () => {
      expect(canAccessCustomerContactInfo(testUsers.worker)).toBe(false);
    });
  });

  describe('Business access control', () => {
    it('users can only access their own business', () => {
      const user = testUsers.owner;
      
      expect(canAccessBusiness(user, 'bus1')).toBe(true);  // Own business
      expect(canAccessBusiness(user, 'bus2')).toBe(false); // Different business
    });
  });

  describe('Edge cases and security', () => {
    it('invalid role has no permissions', () => {
      const invalidUser = { id: 'test', role: 'invalid' as Role, business_id: 'bus1' };
      
      expect(hasPermission(invalidUser, { resource: 'jobs', action: 'view' })).toBe(false);
      expect(canAccessCustomerContactInfo(invalidUser)).toBe(false);
    });

    it('permission keys are case-sensitive', () => {
      const worker = testUsers.worker;
      
      expect(hasPermission(worker, { resource: 'jobs', action: 'view' })).toBe(true);
      expect(hasPermission(worker, { resource: 'Jobs', action: 'view' })).toBe(false);
      expect(hasPermission(worker, { resource: 'jobs', action: 'View' })).toBe(false);
    });
  });
});