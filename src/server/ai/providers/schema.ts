import { z } from 'zod';
import { AI_TAGS, MATERIAL_TYPES } from '@/lib/constants';

export class ProviderMissingCredentialError extends Error {
  constructor(provider: string) {
    super(`${provider}_missing_credentials`);
    this.name = 'ProviderMissingCredentialError';
  }
}

export function isProviderMissingCredentialError(error: unknown): error is ProviderMissingCredentialError {
  return error instanceof ProviderMissingCredentialError;
}

const aiTagSchema = z.enum(AI_TAGS);
const materialTypeSchema = z.enum(MATERIAL_TYPES);
const PROHIBITED_AI_CLAIM_PATTERNS = [
  /법적으로\s*유효한\s*증거/,
  /승소|패소|이길\s*가능성/,
  /이혼(을)?\s*(권|추천|해야)/,
  /진단(됩니다|입니다|할\s*수|으로)/,
  /진짜\s*증거|진정성|위조(?:가)?\s*아님/,
  /법원에서\s*인정/,
  /법원\s*제출\s*가능/,
  /증거\s*능력|증거능력이\s*있/,
  /법적\s*효력(이)?\s*(있|인정|확실)/,
  /몰래\s*설치|무단\s*접근|위치\s*추적|위치추적|해킹|스파이웨어/
] as const;

function containsProhibitedAiClaim(value: string): boolean {
  return PROHIBITED_AI_CLAIM_PATTERNS.some((pattern) => pattern.test(value));
}

export const basetenResponseSchema = z.object({
  title: z.string().min(1).max(120),
  summaryKo: z.string().min(1).max(2000),
  imageDescriptionKo: z.string().min(1).max(1200).nullable().optional(),
  materialType: materialTypeSchema,
  dateCandidates: z
    .array(
      z.object({
        date: z.string().nullable(),
        source: z.enum(['ocr', 'metadata', 'user', 'inferred']),
        confidence: z.number().min(0).max(1)
      })
    )
    .default([]),
  people: z
    .array(
      z.object({
        label: z.enum(['나', '배우자', '제3자', '미상']),
        rawMention: z.string(),
        confidence: z.number().min(0).max(1)
      })
    )
    .default([]),
  locations: z.array(z.string()).default([]),
  tags: z
    .array(
      z.object({
        tag: aiTagSchema,
        confidence: z.number().min(0).max(1),
        rationale: z.string()
      })
    )
    .default([]),
  confidenceLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  includeInReportDefault: z.boolean().default(false),
  needsUserReview: z.boolean().default(true),
  legalCaution: z.string().default('자료 취득 경위 및 제출 가능성은 변호사 검토 필요')
}).superRefine((value, ctx) => {
  const textFields = [
    ['title', value.title],
    ['summaryKo', value.summaryKo],
    ['imageDescriptionKo', value.imageDescriptionKo ?? ''],
    ['legalCaution', value.legalCaution],
    ...value.tags.map((tag, index) => [`tags.${index}.rationale`, tag.rationale] as const)
  ] as const;
  for (const [path, text] of textFields) {
    if (containsProhibitedAiClaim(text)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'prohibited_ai_claim',
        path: path.split('.')
      });
    }
  }
});

export const imageDescriptionResponseSchema = z.object({
  descriptionKo: z.string().min(1).max(1200),
  confidence: z.number().min(0).max(1).default(0.55)
}).superRefine((value, ctx) => {
  if (containsProhibitedAiClaim(value.descriptionKo)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'prohibited_ai_claim',
      path: ['descriptionKo']
    });
  }
});
