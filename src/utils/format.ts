export function formatMoney(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

// Input helpers for friendly currency/percent typing
// Parse a user input string into cents (USD). Accepts "1,234.56" or "1234" (as dollars).
export function parseCurrencyInput(raw: string): number {
  const s = (raw ?? '').toString();
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  if (!cleaned) return 0;
  const hasDecimal = cleaned.includes('.');
  const num = hasDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  if (isNaN(num)) return 0;
  const cents = Math.round(num * 100);
  return Math.max(0, cents);
}

// Format cents as localized currency string (with symbol)
export function formatCurrencyInput(cents: number): string {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format cents as numeric currency without the symbol (e.g. "1,234.00")
export function formatCurrencyInputNoSymbol(cents: number): string {
  const dollars = (cents ?? 0) / 100;
  return dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Percent helpers
export function parsePercentInput(raw: string): number {
  const s = (raw ?? '').toString();
  const cleaned = s.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function formatPercentInput(value?: number): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return `${value}%`;
}
