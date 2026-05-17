import { imageDescriptionFromDraft } from '@/lib/ai-draft';
import type { EvidenceCardReviewDto } from '@/lib/evidence-card-dto';
import { assertOwnsCase } from '@/server/auth/ownership';
import { readDb } from '@/server/db/local-store';
import { jsonError, jsonOk } from '@/server/http';

function arrayOfObjects(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export async function GET(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await params;
    await assertOwnsCase(caseId);
    const db = await readDb();
    const cards: EvidenceCardReviewDto[] = db.evidenceCards
      .filter((card) => card.caseId === caseId && card.deletedAt === null)
      .map((card) => ({
        id: card.id,
        originalFileName: db.evidenceFiles.find((file) => file.id === card.fileId)?.originalName ?? '원본 파일',
        title: card.title,
        summaryKo: card.summaryKo,
        materialType: card.materialType,
        dateCandidate: card.dateCandidate,
        dateSource: card.dateSource,
        people: arrayOfObjects(card.peopleJson).map((person) => ({
          label: typeof person.label === 'string' ? person.label : undefined,
          rawMention: typeof person.rawMention === 'string' ? person.rawMention : undefined,
          confidence: typeof person.confidence === 'number' ? person.confidence : undefined
        })),
        locations: arrayOfStrings(card.locationsJson),
        tags: arrayOfObjects(card.tagsJson).map((tag) => ({
          tag: typeof tag.tag === 'string' ? tag.tag : undefined,
          confidence: typeof tag.confidence === 'number' ? tag.confidence : undefined,
          rationale: typeof tag.rationale === 'string' ? tag.rationale : undefined
        })),
        aiDraftMetadata: {
          draft: Boolean((card.aiDraftJson as { draft?: unknown } | null)?.draft),
          providerDegraded: Boolean((card.aiDraftJson as { providerDegraded?: unknown } | null)?.providerDegraded)
        },
        imageDescriptionKo: imageDescriptionFromDraft(card.aiDraftJson),
        userMemo: card.userMemo,
        confidenceLevel: card.confidenceLevel,
        includeInReport: card.includeInReport,
        userConfirmed: card.userConfirmed
      }));
    return jsonOk({ cards });
  } catch (error) {
    return jsonError(error, 403);
  }
}
