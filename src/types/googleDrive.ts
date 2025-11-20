/**
 * Google Drive Integration Types
 */

export interface GoogleDriveConnection {
  id: string;
  business_id: string;
  google_account_email: string;
  root_folder_id?: string;
  connected_at: string;
  last_synced_at?: string;
  is_active: boolean;
  sync_enabled: boolean;
  token_expires_at?: string;
}

export interface GoogleDriveFileMapping {
  id: string;
  business_id: string;
  connection_id: string;
  sg_entity_type: 'media' | 'invoice' | 'quote' | 'job' | 'customer';
  sg_entity_id: string;
  drive_file_id: string;
  drive_file_name: string;
  drive_folder_id?: string;
  drive_web_view_link?: string;
  drive_web_content_link?: string;
  file_size_bytes?: number;
  mime_type?: string;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'error' | 'deleted';
  error_message?: string;
}

export interface GoogleDriveSyncLog {
  id: string;
  business_id: string;
  connection_id: string;
  sync_type: 'media_backup' | 'document_export' | 'import' | 'share';
  entity_type: string;
  entity_id?: string;
  direction: 'to_drive' | 'from_drive';
  status: 'success' | 'error' | 'partial';
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  error_message?: string;
  metadata?: Record<string, any>;
  started_at: string;
  completed_at?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parents?: string[];
  webViewLink?: string;
  childCount?: number;
}

export interface DriveSyncOptions {
  entityType: 'media' | 'invoice' | 'quote' | 'job' | 'customer';
  entityIds?: string[];
  syncAll?: boolean;
  dryRun?: boolean;
  overwrite?: boolean;
}

export interface DriveShareOptions {
  fileId: string;
  role: 'reader' | 'writer' | 'commenter';
  type: 'user' | 'group' | 'domain' | 'anyone';
  emailAddress?: string;
  sendNotification?: boolean;
  message?: string;
}

export interface DriveFolderStructure {
  customerId: string;
  customerName: string;
  folderId?: string;
  jobs?: Array<{
    jobId: string;
    jobTitle: string;
    folderId?: string;
  }>;
}

export interface DriveHealthMetrics {
  isConnected: boolean;
  tokenValid: boolean;
  lastSyncSuccess: boolean;
  pendingSyncs: number;
  storageUsed?: number;
  storageQuota?: number;
}
