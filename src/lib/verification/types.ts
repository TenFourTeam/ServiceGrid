/**
 * Universal Verification Framework - Shared Types
 * 
 * This module defines the core types used across all system validators
 * to ensure implementation, configuration, verification, and validation
 * are maintained at a high standard.
 */

// ============================================================================
// System Types
// ============================================================================

export type SystemType = 
  | 'process'
  | 'edge_function'
  | 'database'
  | 'security'
  | 'component'
  | 'hook'
  | 'testing'
  | 'alignment'
  | 'intent';

export type VerificationDimension = 
  | 'implementation'
  | 'configuration'
  | 'verification'
  | 'validation';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheck {
  /** Unique identifier for this check */
  id: string;
  /** System being checked */
  system: SystemType;
  /** Which dimension this check covers */
  dimension: VerificationDimension;
  /** Human-readable name */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Is this check required for deployment? */
  required: boolean;
  /** Additional details about the check result */
  details?: string;
  /** How severe is a failure? */
  severity: Severity;
  /** Suggested fix if failed */
  recommendation?: string;
  /** File or resource being checked */
  resource?: string;
  /** Timestamp of when check was run */
  checkedAt: Date;
}

export interface DimensionScore {
  dimension: VerificationDimension;
  passed: number;
  failed: number;
  total: number;
  score: number; // 0-100
  status: HealthStatus;
}

export interface SystemHealthReport {
  /** System that was validated */
  system: SystemType;
  /** All health checks run */
  checks: HealthCheck[];
  /** Score per dimension */
  dimensionScores: DimensionScore[];
  /** Overall health score (0-100) */
  overallScore: number;
  /** Overall status */
  status: HealthStatus;
  /** Critical issues that must be fixed */
  criticalIssues: HealthCheck[];
  /** High priority issues */
  highPriorityIssues: HealthCheck[];
  /** Recommendations for improvement */
  recommendations: string[];
  /** When this report was generated */
  generatedAt: Date;
}

// ============================================================================
// Universal Health Report
// ============================================================================

export interface UniversalHealthReport {
  /** Timestamp of report generation */
  timestamp: Date;
  /** Reports per system */
  systems: Map<SystemType, SystemHealthReport>;
  /** Overall health score across all systems (0-100) */
  overallScore: number;
  /** Overall status */
  status: HealthStatus;
  /** Issues that block deployment */
  criticalIssues: HealthCheck[];
  /** High priority issues to address */
  highPriorityIssues: HealthCheck[];
  /** Summary of all recommendations */
  recommendations: string[];
  /** Counts by system */
  systemSummary: {
    system: SystemType;
    score: number;
    status: HealthStatus;
    checksPassed: number;
    checksFailed: number;
  }[];
}

// ============================================================================
// Registry Types
// ============================================================================

export interface EdgeFunctionDefinition {
  /** Function name (folder name) */
  name: string;
  /** Expected file path */
  path: string;
  /** Is JWT verification required? */
  requiresAuth: boolean;
  /** Required environment variables */
  requiredSecrets: string[];
  /** Whether it has CORS headers */
  hasCors: boolean;
  /** Associated test files */
  testFiles?: string[];
  /** Brief description */
  description?: string;
  /** Category for grouping */
  category: EdgeFunctionCategory;
}

export type EdgeFunctionCategory =
  | 'auth'
  | 'billing'
  | 'customer'
  | 'ai'
  | 'scheduling'
  | 'invoicing'
  | 'media'
  | 'integrations'
  | 'admin'
  | 'public'
  | 'internal';

export interface DatabaseTriggerDefinition {
  /** Trigger name */
  name: string;
  /** Table the trigger is on */
  table: string;
  /** Trigger timing */
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  /** Events that fire the trigger */
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  /** Function that the trigger calls */
  functionName: string;
  /** Brief description */
  description?: string;
}

export interface RLSPolicyDefinition {
  /** Table the policy is on */
  table: string;
  /** Policy name */
  name: string;
  /** Operation type */
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  /** Whether RLS is enabled */
  rlsEnabled: boolean;
  /** Brief description */
  description?: string;
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export interface ValidatorOptions {
  /** Run only specific dimensions */
  dimensions?: VerificationDimension[];
  /** Fail on warnings */
  strict?: boolean;
  /** Include verbose output */
  verbose?: boolean;
  /** Skip certain checks by ID */
  skipChecks?: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

export function calculateScore(passed: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((passed / total) * 100);
}

export function determineStatus(score: number, hasCritical: boolean): HealthStatus {
  if (hasCritical) return 'unhealthy';
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'degraded';
  return 'unhealthy';
}

export function createHealthCheck(
  partial: Omit<HealthCheck, 'checkedAt'>
): HealthCheck {
  return {
    ...partial,
    checkedAt: new Date(),
  };
}
