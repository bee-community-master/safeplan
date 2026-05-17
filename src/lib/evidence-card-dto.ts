export interface EvidenceCardReviewDto {
  id: string;
  originalFileName: string;
  title: string;
  summaryKo: string;
  materialType: string;
  dateCandidate: string | null;
  dateSource: string | null;
  people: Array<{ label?: string; rawMention?: string; confidence?: number }>;
  locations: string[];
  tags: Array<{ tag?: string; confidence?: number; rationale?: string }>;
  aiDraftMetadata: { draft?: boolean; providerDegraded?: boolean };
  imageDescriptionKo: string | null;
  userMemo: string | null;
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  includeInReport: boolean;
  userConfirmed: boolean;
}

export type EvidenceCardReviewPatch = Pick<
  EvidenceCardReviewDto,
  'title' | 'summaryKo' | 'dateCandidate' | 'userMemo' | 'includeInReport' | 'userConfirmed'
>;
