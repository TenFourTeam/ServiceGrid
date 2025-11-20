/**
 * Google Drive Mock Data Generators
 */

import type {
  GoogleDriveConnection,
  GoogleDriveFileMapping,
  GoogleDriveSyncLog,
  DriveFile,
  DriveFolder,
} from '@/types/googleDrive';

export function mockDriveConnection(
  overrides?: Partial<GoogleDriveConnection>
): GoogleDriveConnection {
  return {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    google_account_email: 'business@example.com',
    root_folder_id: '1ABC123',
    connected_at: new Date().toISOString(),
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
    is_active: true,
    sync_enabled: true,
    token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    ...overrides,
  };
}

export function mockDriveFileMapping(
  overrides?: Partial<GoogleDriveFileMapping>
): GoogleDriveFileMapping {
  return {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    connection_id: crypto.randomUUID(),
    sg_entity_type: 'media',
    sg_entity_id: crypto.randomUUID(),
    drive_file_id: '1XYZ789',
    drive_file_name: 'job-photo-2024.jpg',
    drive_folder_id: '1ABC456',
    drive_web_view_link: 'https://drive.google.com/file/d/1XYZ789/view',
    file_size_bytes: 2048576,
    mime_type: 'image/jpeg',
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
    ...overrides,
  };
}

export function mockDriveSyncLog(
  overrides?: Partial<GoogleDriveSyncLog>
): GoogleDriveSyncLog {
  return {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    connection_id: crypto.randomUUID(),
    sync_type: 'media_backup',
    entity_type: 'media',
    direction: 'to_drive',
    status: 'success',
    items_processed: 10,
    items_succeeded: 10,
    items_failed: 0,
    started_at: new Date(Date.now() - 120000).toISOString(),
    completed_at: new Date().toISOString(),
    metadata: {},
    ...overrides,
  };
}

export function mockDriveFile(overrides?: Partial<DriveFile>): DriveFile {
  return {
    id: '1FILE' + Math.random().toString(36).slice(2, 9),
    name: 'document.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    webViewLink: 'https://drive.google.com/file/d/1FILE123/view',
    webContentLink: 'https://drive.google.com/uc?id=1FILE123',
    thumbnailLink: 'https://lh3.googleusercontent.com/...',
    parents: ['1FOLDER123'],
    createdTime: new Date(Date.now() - 86400000).toISOString(),
    modifiedTime: new Date().toISOString(),
    ...overrides,
  };
}

export function mockDriveFolder(overrides?: Partial<DriveFolder>): DriveFolder {
  return {
    id: '1FOLDER' + Math.random().toString(36).slice(2, 9),
    name: 'Customer Documents',
    webViewLink: 'https://drive.google.com/drive/folders/1FOLDER123',
    childCount: 5,
    ...overrides,
  };
}
