/**
 * Process IDs - Single source of truth for all process identifiers
 * All registries should import from here to prevent typos and ensure consistency
 */

export const PROCESS_IDS = {
  // Pre-Service Phase
  LEAD_GENERATION: 'lead_generation',
  COMMUNICATION: 'communication',
  SITE_ASSESSMENT: 'site_assessment',
  QUOTING: 'quoting',
  SCHEDULING: 'scheduling',
  
  // Service Delivery Phase
  DISPATCH: 'dispatch',
  QUALITY_ASSURANCE: 'quality_assurance',
  MAINTENANCE: 'maintenance',
  
  // Post-Service Phase
  INVOICING: 'invoicing',
  PAYMENT_COLLECTION: 'payment_collection',
  REVIEW_MANAGEMENT: 'review_management',
  WARRANTY: 'warranty',
  
  // Operations Phase
  INVENTORY: 'inventory',
  ANALYTICS: 'analytics',
  SEASONAL_PLANNING: 'seasonal_planning',
} as const;

export type ProcessId = typeof PROCESS_IDS[keyof typeof PROCESS_IDS];

/**
 * Phase definitions with their constituent processes
 */
export const PHASE_PROCESSES = {
  pre_service: [
    PROCESS_IDS.LEAD_GENERATION,
    PROCESS_IDS.COMMUNICATION,
    PROCESS_IDS.SITE_ASSESSMENT,
    PROCESS_IDS.QUOTING,
    PROCESS_IDS.SCHEDULING,
  ],
  service_delivery: [
    PROCESS_IDS.DISPATCH,
    PROCESS_IDS.QUALITY_ASSURANCE,
    PROCESS_IDS.MAINTENANCE,
  ],
  post_service: [
    PROCESS_IDS.INVOICING,
    PROCESS_IDS.PAYMENT_COLLECTION,
    PROCESS_IDS.REVIEW_MANAGEMENT,
    PROCESS_IDS.WARRANTY,
  ],
  operations: [
    PROCESS_IDS.INVENTORY,
    PROCESS_IDS.ANALYTICS,
    PROCESS_IDS.SEASONAL_PLANNING,
  ],
} as const;

export type ProcessPhase = keyof typeof PHASE_PROCESSES;

/**
 * All process IDs as an array - useful for iteration
 */
export const ALL_PROCESS_IDS: ProcessId[] = Object.values(PROCESS_IDS);

/**
 * Get the phase for a given process ID
 */
export function getProcessPhase(processId: ProcessId): ProcessPhase | undefined {
  for (const [phase, processes] of Object.entries(PHASE_PROCESSES)) {
    if ((processes as readonly ProcessId[]).includes(processId)) {
      return phase as ProcessPhase;
    }
  }
  return undefined;
}

/**
 * Type guard to check if a string is a valid process ID
 */
export function isValidProcessId(id: string): id is ProcessId {
  return ALL_PROCESS_IDS.includes(id as ProcessId);
}
