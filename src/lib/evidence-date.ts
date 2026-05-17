import type { BasetenClassifierResponse, MaterialType } from './types';

export type DateCandidate = BasetenClassifierResponse['dateCandidates'][number];
export type FileDateSourceDetail = 'filename' | 'exif_datetime_original' | 'exif_datetime_digitized' | 'exif_datetime';

export interface FileDateCandidate {
  date: string;
  source: 'metadata';
  confidence: number;
  sourceDetail: FileDateSourceDetail;
}

export interface EvidenceDateContext {
  originalName: string;
  mimeType: string;
  uploadedAt?: string | null;
  materialType?: MaterialType | null;
  now?: Date;
}

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function normalizeDateParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < YEAR_MIN || year > YEAR_MAX || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function stripExtension(value: string): string {
  return value.replace(/\.[a-z0-9]{1,8}$/i, '');
}

function candidateFromMatch(match: RegExpMatchArray, confidence: number, sourceDetail: FileDateSourceDetail): FileDateCandidate | null {
  const [, year, month, day] = match;
  const normalized = normalizeDateParts(Number(year), Number(month), Number(day));
  return normalized ? { date: normalized, source: 'metadata', confidence, sourceDetail } : null;
}

export function extractDateCandidateFromText(text: string, confidence = 0.58, sourceDetail: FileDateSourceDetail = 'filename'): FileDateCandidate | null {
  const normalizedText = text.normalize('NFKC');
  const patterns = [
    /(?<!\d)((?:19|20)\d{2})\s*년\s*([01]?\d)\s*월\s*([0-3]?\d)\s*일(?!\d)/,
    /(?<!\d)((?:19|20)\d{2})[-_.\s]([01]?\d)[-_.\s]([0-3]?\d)(?!\d)/,
    /(?<!\d)((?:19|20)\d{2})([01]\d)([0-3]\d)(?!\d)/,
    /(?<!\d)((?:19|20)\d{2}):([01]?\d):([0-3]?\d)(?!\d)/
  ] as const;

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (!match) continue;
    const candidate = candidateFromMatch(match, confidence, sourceDetail);
    if (candidate) return candidate;
  }
  return null;
}

export function extractDateCandidateFromFileName(originalName: string): FileDateCandidate | null {
  return extractDateCandidateFromText(stripExtension(originalName), 0.68, 'filename');
}

export function isVisualEvidence(context: Pick<EvidenceDateContext, 'mimeType' | 'materialType'>): boolean {
  return context.mimeType.startsWith('image/') || context.materialType === 'photo' || context.materialType === 'capture';
}

export function toIsoDateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function makeFileDateCandidate(date: string, sourceDetail: FileDateSourceDetail, confidence: number): FileDateCandidate | null {
  const normalized = extractDateCandidateFromText(date, confidence, sourceDetail)?.date ?? (date.match(/^\d{4}-\d{2}-\d{2}$/) ? date : null);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const valid = normalizeDateParts(year, month, day);
  return valid ? { date: valid, source: 'metadata', confidence, sourceDetail } : null;
}

function normalizeProviderCandidate(candidate: DateCandidate): DateCandidate | null {
  if (!candidate.date) return null;
  const normalized = makeFileDateCandidate(candidate.date, 'filename', candidate.confidence)?.date;
  if (!normalized) return null;
  return { date: normalized, source: candidate.source, confidence: candidate.confidence };
}

function isUploadOrTodayFallback(candidate: DateCandidate, context: EvidenceDateContext, fileDateCandidate: FileDateCandidate | null): boolean {
  if (!candidate.date) return false;
  if (!['metadata', 'inferred'].includes(candidate.source)) return false;
  if (fileDateCandidate?.date === candidate.date) return false;
  const uploadedDate = toIsoDateOnly(context.uploadedAt);
  const today = toIsoDateOnly(context.now ?? new Date());
  return candidate.date === uploadedDate || candidate.date === today;
}

export function sanitizeEvidenceDateCandidates(input: {
  providerCandidates: DateCandidate[];
  fileDateCandidate: FileDateCandidate | null;
  context: EvidenceDateContext;
}): DateCandidate[] {
  const visual = isVisualEvidence(input.context);
  const sanitized: DateCandidate[] = [];

  if (input.fileDateCandidate) {
    sanitized.push({
      date: input.fileDateCandidate.date,
      source: input.fileDateCandidate.source,
      confidence: input.fileDateCandidate.confidence
    });
  }

  for (const rawCandidate of input.providerCandidates) {
    const candidate = normalizeProviderCandidate(rawCandidate);
    if (!candidate) continue;
    if (visual && isUploadOrTodayFallback(candidate, input.context, input.fileDateCandidate)) continue;
    const duplicate = sanitized.some((item) => item.date === candidate.date && item.source === candidate.source);
    if (!duplicate) sanitized.push(candidate);
  }

  return sanitized;
}

export function chooseFileDateCandidate(candidates: Array<FileDateCandidate | null | undefined>): FileDateCandidate | null {
  const valid = candidates.filter((candidate): candidate is FileDateCandidate => Boolean(candidate));
  if (!valid.length) return null;
  return [...valid].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}
