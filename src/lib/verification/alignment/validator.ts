/**
 * Process-EdgeFunction Alignment Validator
 * 
 * Validates that all process mappings are complete and consistent,
 * ensuring DIY/DWY/DFY modes all reference existing components.
 */

import { BaseValidator } from '../base-validator';
import { HealthCheck, ValidatorOptions, createHealthCheck } from '../types';
import { PROCESS_FUNCTION_MAPPINGS, getAllReferencedEdgeFunctions } from './process-function-map';
import { EDGE_FUNCTION_REGISTRY } from '../edge-functions/registry';
import { ALL_PROCESS_IDS } from '../../ai-agent/process-ids';
import type { ProcessMapping } from './types';

export class AlignmentValidator extends BaseValidator {
  constructor(options: ValidatorOptions = {}) {
    super('process', options);
  }

  async checkImplementation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Check process mapping coverage
    const totalProcesses = ALL_PROCESS_IDS.length;
    const mappedProcesses = Object.keys(PROCESS_FUNCTION_MAPPINGS).length;
    const coverage = (mappedProcesses / totalProcesses) * 100;
    
    checks.push(createHealthCheck({
      id: 'alignment-process-coverage',
      name: 'Process Mapping Coverage',
      system: 'process',
      dimension: 'implementation',
      passed: coverage >= 80,
      required: true,
      severity: coverage >= 80 ? 'info' : 'high',
      details: `${mappedProcesses}/${totalProcesses} processes mapped (${coverage.toFixed(0)}%)`,
      recommendation: coverage < 80 ? 'Add mappings for missing processes' : undefined,
    }));
    
    return checks;
  }

  async checkConfiguration(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Check edge function references exist
    const referencedFunctions = getAllReferencedEdgeFunctions();
    const registeredNames = new Set(EDGE_FUNCTION_REGISTRY.map(fn => fn.name));
    const missingFunctions = referencedFunctions.filter(fn => !registeredNames.has(fn));
    
    checks.push(createHealthCheck({
      id: 'alignment-edge-function-refs',
      name: 'Edge Function References',
      system: 'process',
      dimension: 'configuration',
      passed: missingFunctions.length === 0,
      required: true,
      severity: missingFunctions.length > 0 ? 'high' : 'info',
      details: missingFunctions.length > 0 
        ? `Missing: ${missingFunctions.slice(0, 5).join(', ')}`
        : `All ${referencedFunctions.length} referenced functions exist`,
      recommendation: missingFunctions.length > 0 
        ? 'Add missing edge functions to registry'
        : undefined,
    }));
    
    return checks;
  }

  async checkVerification(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Check outcome consistency
    for (const mapping of Object.values(PROCESS_FUNCTION_MAPPINGS)) {
      const hasOutcomes = mapping.subSteps.every(s => s.expectedOutcome?.entity);
      
      checks.push(createHealthCheck({
        id: `alignment-outcome-${mapping.processId}`,
        name: `${mapping.name} Outcomes`,
        system: 'process',
        dimension: 'verification',
        passed: hasOutcomes,
        required: false,
        severity: hasOutcomes ? 'info' : 'medium',
        details: hasOutcomes ? 'All steps have outcomes' : 'Missing expected outcomes',
      }));
    }
    
    return checks;
  }

  async checkValidation(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    const allTables = new Set<string>();
    for (const mapping of Object.values(PROCESS_FUNCTION_MAPPINGS)) {
      for (const step of mapping.subSteps) {
        step.diy.dbTables.forEach(t => allTables.add(t));
        step.dwy.dbTables.forEach(t => allTables.add(t));
        step.dfy.dbTables.forEach(t => allTables.add(t));
      }
    }
    
    checks.push(createHealthCheck({
      id: 'alignment-db-table-refs',
      name: 'Database Table References',
      system: 'process',
      dimension: 'validation',
      passed: true,
      required: false,
      severity: 'info',
      details: `${allTables.size} unique tables referenced`,
    }));
    
    return checks;
  }
}
