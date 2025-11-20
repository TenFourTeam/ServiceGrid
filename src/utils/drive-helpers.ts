/**
 * Google Drive Helper Utilities
 */

import { format } from 'date-fns';

export function sanitizeFolderName(name: string): string {
  // Remove invalid characters for Google Drive folder names
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100); // Drive has 100 char limit
}

export function generateFolderPath(
  customerName: string,
  jobTitle?: string,
  subdirectory?: string
): string {
  const parts = ['ServiceGrid', sanitizeFolderName(customerName)];
  
  if (jobTitle) {
    parts.push(sanitizeFolderName(jobTitle));
  }
  
  if (subdirectory) {
    parts.push(subdirectory);
  }
  
  return parts.join('/');
}

export function formatDriveFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function getDriveMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

export function estimateSyncDuration(itemCount: number): string {
  const secondsPerItem = 2; // Rough estimate
  const totalSeconds = itemCount * secondsPerItem;
  
  if (totalSeconds < 60) return `~${totalSeconds}s`;
  if (totalSeconds < 3600) return `~${Math.ceil(totalSeconds / 60)}m`;
  return `~${Math.ceil(totalSeconds / 3600)}h`;
}

export function generateShareMessage(
  businessName: string,
  entityType: 'invoice' | 'quote' | 'job' | 'folder'
): string {
  const messages = {
    invoice: `${businessName} has shared an invoice with you.`,
    quote: `${businessName} has shared a quote with you.`,
    job: `${businessName} has shared job documents with you.`,
    folder: `${businessName} has shared files with you.`,
  };
  
  return messages[entityType];
}

export function getDriveSyncStatusColor(status: string): string {
  switch (status) {
    case 'synced':
      return 'text-green-600';
    case 'pending':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    case 'deleted':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
}

export function formatSyncDuration(startedAt: string, completedAt?: string): string {
  if (!completedAt) return 'In progress...';
  
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const durationMs = end.getTime() - start.getTime();
  
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}
