export function escapeHtml(input?: string): string {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

export function sanitizeSubject(input?: string): string {
  return String(input ?? '').replace(/[\r\n]+/g, ' ').trim();
}
