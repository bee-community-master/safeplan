export type SharedReportCard = {
  id: string;
  title: string;
  dateCandidate: string | null;
  confidenceLevel: number;
  summaryKo: string;
};

export type SharedReportPayload = {
  cards: SharedReportCard[];
  fileCount: number;
};
