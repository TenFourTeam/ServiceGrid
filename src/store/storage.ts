const STORAGE_KEY = 'tenfour-lawn-store-v1';

export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('Failed to load state', e);
    return null;
  }
}

export function saveState<T>(state: T) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

export function exportJSON(state: any) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
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
          const data = JSON.parse(reader.result as string) as T;
          resolve(data);
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
