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
