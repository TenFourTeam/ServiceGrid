import { AppStateSchema } from '@/types/schemas';

const STORAGE_KEY = 'tenfour-lawn-store-v1';
const STORAGE_VERSION = 2;

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
    ('quotes' in obj || 'estimates' in obj) &&
    'jobs' in obj &&
    'invoices' in obj &&
    'payments' in obj &&
    'events' in obj
  );
}

function migrateAppState(data: any, fromVersion: number): any {
  let d = data;
  if (!d || typeof d !== 'object') return d;

  if (fromVersion < 2) {
    const src = d as any;
    // Move estimates -> quotes
    if (Array.isArray(src.estimates) && !Array.isArray(src.quotes)) {
      src.quotes = src.estimates;
      delete src.estimates;
    }
    // jobs: estimateId -> quoteId
    if (Array.isArray(src.jobs)) {
      src.jobs = src.jobs.map((j: any) => {
        if (j && 'estimateId' in j && !('quoteId' in j)) {
          j.quoteId = j.estimateId;
          delete j.estimateId;
        }
        return j;
      });
    }
    // events: estimate.* -> quote.*
    if (Array.isArray(src.events)) {
      src.events = src.events.map((ev: any) => {
        if (ev && typeof ev.type === 'string' && ev.type.startsWith('estimate.')) {
          ev.type = ev.type.replace('estimate.', 'quote.');
        }
        return ev;
      });
    }
  }
  return d;
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

