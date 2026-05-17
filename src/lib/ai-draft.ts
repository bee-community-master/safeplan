export function imageDescriptionFromDraft(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as { imageDescriptionKo?: unknown }).imageDescriptionKo;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}
