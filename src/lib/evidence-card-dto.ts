export interface EvidenceCardReviewDto {
  id: string;
  title: string;
  summaryKo: string;
  dateCandidate: string | null;
  userMemo: string | null;
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  includeInReport: boolean;
  userConfirmed: boolean;
}

export type EvidenceCardReviewPatch = Pick<
  EvidenceCardReviewDto,
  'title' | 'summaryKo' | 'dateCandidate' | 'userMemo' | 'includeInReport' | 'userConfirmed'
>;
