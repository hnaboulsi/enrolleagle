export function normalizeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

export function safeNumber(value: string | null | undefined) {
  if (!value) return null;
  const num = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

export function snippet(value: string, max = 400) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
