import { AppStateSchema } from '@/types/schemas';

const STORAGE_KEY = 'tenfour-lawn-store-v1';
const STORAGE_VERSION = 1;

type Persisted<T> = { version: number; data: T };

function isPersisted(obj: any): obj is Persisted<unknown> {
  return obj && typeof obj === 'object' && 'version' in obj && 'data' in obj;
}

function isLikelyAppState(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    'business' in obj &&
    'customers' in obj &&
    'estimates' in obj &&
    'jobs' in obj &&
    'invoices' in obj &&
    'payments' in obj &&
    'events' in obj
  );
}

function migrateAppState(data: any, fromVersion: number): any {
  let d = data;
  switch (fromVersion) {
    default:
      return d;
  }
}


export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (isPersisted(parsed)) {
      const { version, data } = parsed as Persisted<unknown>;
      const migrated = version < STORAGE_VERSION ? migrateAppState(data, version) : (data as any);

      if (isLikelyAppState(migrated)) {
        const result = AppStateSchema.safeParse(migrated);
        if (!result.success) {
          console.error('State validation failed', result.error);
          return null;
        }
        return result.data as T;
      }
      return migrated as T;
    } else {
      if (isLikelyAppState(parsed)) {
        const result = AppStateSchema.safeParse(parsed);
        if (!result.success) {
          console.error('State validation failed', result.error);
          return null;
        }
        return result.data as T;
      }
      return parsed as T;
    }
  } catch (e) {
    console.error('Failed to load state', e);
    return null;
  }
}

export function saveState<T>(state: T) {
  try {
    const payload: Persisted<T> = { version: STORAGE_VERSION, data: state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

export function exportJSON(state: any) {
  const payload = { version: STORAGE_VERSION, data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tenfour-lawn-export.json';
  link.click();
  URL.revokeObjectURL(url);
}

export async function importJSON<T>(): Promise<T | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (isPersisted(parsed)) {
            resolve(parsed.data as T);
          } else {
            resolve(parsed as T);
          }
        } catch (e) {
          console.error('Failed to parse JSON', e);
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

export function resetStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
