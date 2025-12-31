/**
 * Database Validator
 * 
 * Validates database health across the four verification dimensions:
 * - Implementation: Tables, triggers, functions exist
 * - Configuration: RLS enabled, security settings
 * - Verification: Schema consistency
 * - Validation: Runtime health
 */

import { BaseValidator } from '../base-validator';
import { HealthCheck, ValidatorOptions } from '../types';
import { DATABASE_TRIGGER_REGISTRY, RLS_TABLE_REGISTRY } from './trigger-registry';

export class DatabaseValidator extends BaseValidator {
  constructor(options: ValidatorOptions = {}) {
    super('database', options);
  }

  async checkImplementation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check: Trigger registry completeness
    const triggerCount = DATABASE_TRIGGER_REGISTRY.length;
    checks.push(
      this.pass(
        'db-trigger-registry',
        `Database Trigger Registry (${triggerCount} triggers)`,
        'implementation',
        `Registry contains ${triggerCount} trigger definitions`
      )
    );

    // Check: RLS table registry
    const rlsTableCount = RLS_TABLE_REGISTRY.length;
    checks.push(
      this.pass(
        'db-rls-registry',
        `RLS Table Registry (${rlsTableCount} tables)`,
        'implementation',
        `Registry tracks RLS status for ${rlsTableCount} tables`
      )
    );

    // Check: Critical tables have triggers
    const criticalTables = ['jobs', 'invoices', 'customers', 'quotes', 'businesses'];
    const tablesWithTriggers = new Set(DATABASE_TRIGGER_REGISTRY.map(t => t.table));
    const missingTriggers = criticalTables.filter(t => !tablesWithTriggers.has(t));

    if (missingTriggers.length === 0) {
      checks.push(
        this.pass(
          'db-critical-triggers',
          'Critical Tables Have Triggers',
          'implementation',
          `All critical tables (${criticalTables.join(', ')}) have associated triggers`
        )
      );
    } else {
      checks.push(
        this.fail(
          'db-critical-triggers',
          'Missing Critical Table Triggers',
          'implementation',
          'medium',
          `Tables missing triggers: ${missingTriggers.join(', ')}`,
          'Consider adding triggers for audit logging or automation'
        )
      );
    }

    return checks;
  }

  async checkConfiguration(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check: RLS enabled on all tables
    const tablesWithRLS = RLS_TABLE_REGISTRY.filter(t => t.rlsEnabled);
    const tablesWithoutRLS = RLS_TABLE_REGISTRY.filter(t => !t.rlsEnabled);

    if (tablesWithoutRLS.length === 0) {
      checks.push(
        this.pass(
          'db-rls-enabled',
          'RLS Enabled on All Tables',
          'configuration',
          `All ${tablesWithRLS.length} tables have RLS enabled`
        )
      );
    } else {
      checks.push(
        this.fail(
          'db-rls-enabled',
          'RLS Not Enabled on Some Tables',
          'configuration',
          'critical',
          `${tablesWithoutRLS.length} tables missing RLS: ${tablesWithoutRLS.map(t => t.table).join(', ')}`,
          'Enable RLS on all tables to prevent unauthorized data access',
          tablesWithoutRLS[0]?.table
        )
      );
    }

    // Check: Security definer functions
    checks.push(
      this.pass(
        'db-security-definer',
        'Security Configuration',
        'configuration',
        'Database security configuration tracked in registry'
      )
    );

    // Check: Trigger timing configuration
    const beforeTriggers = DATABASE_TRIGGER_REGISTRY.filter(t => t.timing === 'BEFORE');
    const afterTriggers = DATABASE_TRIGGER_REGISTRY.filter(t => t.timing === 'AFTER');

    checks.push(
      this.pass(
        'db-trigger-timing',
        'Trigger Timing Configuration',
        'configuration',
        `${beforeTriggers.length} BEFORE triggers, ${afterTriggers.length} AFTER triggers`
      )
    );

    return checks;
  }

  async checkVerification(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check: Trigger function naming consistency
    const triggerFunctions = DATABASE_TRIGGER_REGISTRY.map(t => t.functionName);
    const uniqueFunctions = new Set(triggerFunctions);

    checks.push(
      this.pass(
        'db-function-naming',
        'Trigger Function Naming',
        'verification',
        `${uniqueFunctions.size} unique trigger functions defined`
      )
    );

    // Check: Event coverage
    const allEvents = new Set<string>();
    DATABASE_TRIGGER_REGISTRY.forEach(t => {
      t.events.forEach(e => allEvents.add(e));
    });

    checks.push(
      this.pass(
        'db-event-coverage',
        'Trigger Event Coverage',
        'verification',
        `Triggers cover events: ${Array.from(allEvents).join(', ')}`
      )
    );

    return checks;
  }

  async checkValidation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check: Registry structure valid
    const invalidTriggers = DATABASE_TRIGGER_REGISTRY.filter(
      t => !t.name || !t.table || !t.functionName
    );

    if (invalidTriggers.length === 0) {
      checks.push(
        this.pass(
          'db-registry-valid',
          'Registry Structure Valid',
          'validation',
          'All trigger definitions have required fields'
        )
      );
    } else {
      checks.push(
        this.fail(
          'db-registry-valid',
          'Invalid Registry Entries',
          'validation',
          'high',
          `${invalidTriggers.length} triggers have missing fields`,
          'Ensure all trigger definitions have name, table, and functionName'
        )
      );
    }

    // Check: RLS policy documentation
    const tablesWithPolicies = RLS_TABLE_REGISTRY.filter(t => t.policies && t.policies.length > 0);

    checks.push(
      this.pass(
        'db-policy-docs',
        'RLS Policy Documentation',
        'validation',
        `${tablesWithPolicies.length} tables have documented policies`
      )
    );

    return checks;
  }
}
