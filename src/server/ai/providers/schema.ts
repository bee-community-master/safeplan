import { z } from 'zod';
import { AI_TAGS, MATERIAL_TYPES } from '@/lib/constants';

const aiTagSchema = z.enum(AI_TAGS);
const materialTypeSchema = z.enum(MATERIAL_TYPES);

export const basetenResponseSchema = z.object({
  title: z.string().min(1).max(120),
  summaryKo: z.string().min(1).max(2000),
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
});
