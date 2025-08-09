export function slugify(input: string): string {
  if (!input) return "business";
  return input
    .normalize("NFKD")
    // Remove diacritics
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "business";
}
