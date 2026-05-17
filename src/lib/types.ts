import type { AI_TAGS, MATERIAL_TYPES } from './constants';

export type MaterialType = (typeof MATERIAL_TYPES)[number];
export type AiTag = (typeof AI_TAGS)[number];

export type PartnerSupportRisk = 'maintained' | 'stopped' | 'partial';
export type DateSource = 'ocr' | 'metadata' | 'user' | 'inferred' | null;
export type ConsentType = 'ai_processing' | 'sensitive_data' | 'overseas_transfer' | 'payment' | 'original_evidence';
export type ProviderName = 'mistral' | 'groq' | 'baseten' | 'mock';
export type ExtractionKind = 'ocr' | 'stt' | 'classification';

export interface RunwayInput {
  availableCash: number;
  monthlyIncome: number;
  partnerSupportMonthly: number;
  partnerSupportRisk: PartnerSupportRisk;
  partialSupportRatio: number;
  essentialExpenses: number;
  adjustableExpenses: number;
  debtRepayment: number;
  childCosts: number;
  currentHousingCost: number;
  futureHousingCost: number;
  depositLockedAmount: number;
  movingCost: number;
  legalAdminCost: number;
  emergencyCost: number;
}

export interface RunwayScenarioResult {
  key: PartnerSupportRisk;
  label: string;
  partnerSupportScenarioAmount: number;
  usableCash: number;
  monthlyNet: number;
  runwayMonths: number | '유지 가능';
  status: 'ok' | 'low_runway' | 'immediate_shortage' | 'sustainable';
}

export interface BasetenClassifierInput {
  caseId: string;
  fileId: string;
  guardrailPolicy: string;
  materialType: MaterialType;
  ocrMarkdown: string | null;
  transcript: string | null;
  userMemo: string | null;
  fileMetadata: {
    originalName: string;
    mimeType: string;
    uploadedAt: string;
    captureDateCandidate?: {
      date: string;
      source: 'metadata';
      confidence: number;
      sourceDetail: 'filename' | 'exif_datetime_original' | 'exif_datetime_digitized' | 'exif_datetime';
    } | null;
    dateInferencePolicy?: 'visual_capture_date_from_title_or_metadata_only' | 'standard';
  };
  allowedTags: readonly string[];
}

export interface BasetenClassifierResponse {
  title: string;
  summaryKo: string;
  materialType: MaterialType;
  dateCandidates: Array<{ date: string | null; source: 'ocr' | 'metadata' | 'user' | 'inferred'; confidence: number }>;
  people: Array<{ label: '나' | '배우자' | '제3자' | '미상'; rawMention: string; confidence: number }>;
  locations: string[];
  tags: Array<{ tag: AiTag; confidence: number; rationale: string }>;
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  includeInReportDefault: boolean;
  needsUserReview: boolean;
  legalCaution: string;
}
