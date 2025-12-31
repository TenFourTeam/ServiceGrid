/**
 * Deprecation Registry
 * 
 * Tracks deprecated code that should be cleaned up.
 * This provides visibility into technical debt and cleanup priorities.
 */

export interface DeprecatedItem {
  type: 'edge_function' | 'component' | 'hook' | 'utility' | 'process';
  name: string;
  path: string;
  deprecatedAt: string;
  reason: string;
  replacedBy?: string;
  deleteAfter?: string;
  deleted?: boolean;
  deletedAt?: string;
}

/**
 * Registry of deprecated items - update this list as items are cleaned up
 */
export const DEPRECATED_ITEMS: DeprecatedItem[] = [
  {
    type: 'edge_function',
    name: 'resend-send-email',
    path: 'supabase/functions/resend-send-email',
    deprecatedAt: '2024-12-31',
    reason: 'Email sending disabled - functionality consolidated into send-lifecycle-email and process-email-queue',
    replacedBy: 'send-lifecycle-email, process-email-queue',
    deleted: true,
    deletedAt: '2024-12-31',
  },
  {
    type: 'edge_function',
    name: 'transcode-media-video',
    path: 'supabase/functions/transcode-media-video',
    deprecatedAt: '2024-12-31',
    reason: 'Video transcoding not implemented - stub only. Using original video URLs instead.',
    deleteAfter: '2025-02-01',
  },
];

/**
 * Get all deprecated items that should be deleted
 */
export function getItemsToDelete(): DeprecatedItem[] {
  const now = new Date();
  return DEPRECATED_ITEMS.filter(item => {
    if (item.deleted) return false;
    if (!item.deleteAfter) return true;
    return new Date(item.deleteAfter) <= now;
  });
}

/**
 * Get all actively deprecated items (not yet deleted)
 */
export function getActiveDeprecations(): DeprecatedItem[] {
  return DEPRECATED_ITEMS.filter(item => !item.deleted);
}

/**
 * Get count of deprecated items by type
 */
export function getDeprecationCounts(): Record<DeprecatedItem['type'], number> {
  const counts = {
    edge_function: 0,
    component: 0,
    hook: 0,
    utility: 0,
    process: 0,
  };
  
  for (const item of DEPRECATED_ITEMS.filter(i => !i.deleted)) {
    counts[item.type]++;
  }
  
  return counts;
}
