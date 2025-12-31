/**
 * Trigger Registry - Maps processes to their database triggers
 * 
 * NOTE: This file now re-exports from the modular process structure.
 * For new processes, add triggers.ts to the process module folder instead.
 */

import { TRIGGER_REGISTRY } from './processes';
import type { ProcessTriggers } from './processes/types';

// Re-export the auto-aggregated registry
export { TRIGGER_REGISTRY as PROCESS_TRIGGER_REGISTRY };
export type { ProcessTriggers };

/**
 * Get triggers for a process
 */
export function getProcessTriggers(processId: string): ProcessTriggers {
  return TRIGGER_REGISTRY[processId as keyof typeof TRIGGER_REGISTRY] || { triggers: [], functions: [] };
}

/**
 * Check if a process has database triggers defined
 */
export function hasDatabaseTriggers(processId: string): boolean {
  return getProcessTriggers(processId).triggers.length > 0;
}

/**
 * Check if a process has database functions defined
 */
export function hasDatabaseFunctions(processId: string): boolean {
  return getProcessTriggers(processId).functions.length > 0;
}
