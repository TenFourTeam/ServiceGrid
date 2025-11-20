/**
 * QuickBooks Helper Utilities
 */

import type { QBSyncLog, SyncPreview } from '@/types/quickbooks';
import { format, parseISO } from 'date-fns';

export function formatQBDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseQBDate(qbDate: string): Date {
  return parseISO(qbDate);
}

export function calculateSyncPriority(entity: any, entityType: string): number {
  let priority = 50; // Base priority
  
  // Higher priority for recently updated entities
  if (entity.updated_at) {
    const hoursSinceUpdate = (Date.now() - new Date(entity.updated_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 1) priority += 30;
    else if (hoursSinceUpdate < 24) priority += 20;
    else if (hoursSinceUpdate < 168) priority += 10;
  }
  
  // Entity-specific priority adjustments
  switch (entityType) {
    case 'payment':
      priority += 20; // Payments are high priority
      break;
    case 'invoice':
      if (entity.status === 'Draft') priority -= 10;
      if (entity.status === 'Sent') priority += 15;
      break;
    case 'customer':
      if (!entity.qb_mapped) priority += 5; // New customers
      break;
  }
  
  return Math.min(100, Math.max(0, priority));
}

export function estimateApiCalls(operation: { entityType: string; recordCount: number; operation: 'sync' | 'query' }): number {
  let callsPerRecord = 1;
  
  // Some operations require multiple API calls
  if (operation.entityType === 'invoice') {
    callsPerRecord = 2; // Invoice + line items
  } else if (operation.entityType === 'payment') {
    callsPerRecord = 2; // Payment + invoice lookup
  }
  
  // Query operations need pagination
  if (operation.operation === 'query') {
    const pageSize = 100;
    const pages = Math.ceil(operation.recordCount / pageSize);
    return pages;
  }
  
  return operation.recordCount * callsPerRecord;
}

export function generateSyncReport(logs: QBSyncLog[]): {
  summary: string;
  totalRecords: number;
  successRate: number;
  errorCount: number;
  byType: Record<string, { success: number; error: number }>;
} {
  const totalRecords = logs.reduce((sum, log) => sum + log.records_processed, 0);
  const totalFailed = logs.reduce((sum, log) => sum + log.records_failed, 0);
  const successRate = totalRecords > 0 ? ((totalRecords - totalFailed) / totalRecords) * 100 : 0;
  
  const byType: Record<string, { success: number; error: number }> = {};
  
  for (const log of logs) {
    if (!byType[log.sync_type]) {
      byType[log.sync_type] = { success: 0, error: 0 };
    }
    
    if (log.status === 'success') {
      byType[log.sync_type].success += log.records_processed;
    } else {
      byType[log.sync_type].error += log.records_failed;
    }
  }
  
  const summary = `Synced ${totalRecords} records with ${successRate.toFixed(1)}% success rate. ${totalFailed} failures.`;
  
  return {
    summary,
    totalRecords,
    successRate,
    errorCount: totalFailed,
    byType,
  };
}

export function detectDuplicates(
  sgEntities: any[],
  qbEntities: any[],
  matchFields: string[] = ['name', 'email']
): Array<{ sgEntity: any; qbEntity: any; matchScore: number }> {
  const duplicates: Array<{ sgEntity: any; qbEntity: any; matchScore: number }> = [];
  
  for (const sgEntity of sgEntities) {
    for (const qbEntity of qbEntities) {
      const matchScore = calculateMatchScore(sgEntity, qbEntity, matchFields);
      
      if (matchScore > 0.7) { // 70% similarity threshold
        duplicates.push({ sgEntity, qbEntity, matchScore });
      }
    }
  }
  
  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

function calculateMatchScore(entity1: any, entity2: any, fields: string[]): number {
  let matchingFields = 0;
  let totalFields = 0;
  
  for (const field of fields) {
    const val1 = entity1[field]?.toString().toLowerCase();
    const val2 = entity2[field]?.toString().toLowerCase();
    
    if (val1 && val2) {
      totalFields++;
      if (val1 === val2) {
        matchingFields++;
      } else if (val1.includes(val2) || val2.includes(val1)) {
        matchingFields += 0.5;
      }
    }
  }
  
  return totalFields > 0 ? matchingFields / totalFields : 0;
}

export function formatSyncDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  return `${(milliseconds / 60000).toFixed(1)}m`;
}

export function getSyncStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    case 'partial':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

export function validateSyncPreview(preview: SyncPreview): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (preview.validation_errors.length > 0) {
    warnings.push(`${preview.validation_errors.length} validation errors found`);
  }
  
  if (preview.estimated_api_calls > 1000) {
    warnings.push('Large sync may take several minutes');
  }
  
  if (preview.changes.skip > preview.estimated_records * 0.5) {
    warnings.push('More than 50% of records will be skipped');
  }
  
  return {
    valid: preview.validation_errors.length === 0,
    warnings,
  };
}

export function buildSyncFilter(params: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  minAmount?: number;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  
  if (params.startDate) {
    filter.created_after = formatQBDate(params.startDate);
  }
  
  if (params.endDate) {
    filter.created_before = formatQBDate(params.endDate);
  }
  
  if (params.status) {
    filter.status = params.status;
  }
  
  if (params.minAmount) {
    filter.min_amount = params.minAmount;
  }
  
  return filter;
}
