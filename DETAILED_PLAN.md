가격: 9,900원
무료 범위: 생존 시뮬레이터, 안전 안내, 기본 기관 안내
유료 범위: 증거 업로드, OCR/STT/AI 분류, 사용자 검수, PDF, 보안 URL
파일 수 제한: 최대 20개
총 업로드 제한: 100MB
음성 파일 제한: 기본 25MB
개별 이미지/PDF 제한: 20MB
자료 부족 경고: 결제 전 표시
runway 반올림: 보수적으로 0.5개월 단위 내림
공유 URL 만료: 기본 14일
공유 URL 보호: 토큰 + 선택 비밀번호
증거 보관: 365일
재정 입력값: 서버 저장 금지


DB는 supabase를 다른 서비스와 공유해서 사용하니 prefix를 반드시 붙일 것(.env.local에 prefix가 있다)
vercel-cli 가 있으니 frontweb배포는 vercel로 하라.


# DETAILED_PLAN.md

# 독립 세이프플랜 MVP Production Plan

## 0. 목적

이 문서는 Codex가 1-shot `/goal`로 production-ready MVP를 구현할 때 따라야 하는 상세 실행 계획이다.

제품은 “이혼을 결심한 여성이 변호사 상담 전 자신의 생활 가능 기간을 확인하고, 보유 증거를 자료 단위 타임라인과 PDF/URL 리포트로 정리하는 한국어 B2C 웹앱”이다.

production-ready의 의미는 다음이다.

- 로컬에서 install/test/build/e2e가 통과한다.
- GCP Cloud Run 배포가 가능하다.
- 민감 증거 파일은 암호화 저장 구조를 갖는다.
- 재정 입력값은 기본적으로 서버에 저장하지 않는다.
- 외부 AI 처리 전 명시 동의를 받는다.
- 사용자 삭제 요청 시 원본, OCR/STT, AI 태그, PDF, 공유 URL이 삭제 또는 비활성화된다.
- 운영자는 원본 증거를 수동 열람하지 않는 구조를 기본값으로 한다.
- mock provider로도 전체 happy path를 테스트할 수 있다.
- 실제 provider key가 있으면 Mistral OCR, Groq STT, Baseten classifier를 호출한다.

## 1. Non-negotiable Scope

### P0

- 랜딩
- 안전 팝업
- 위험 체크
- 생존 시뮬레이터
- 0.5개월 단위 runway 결과
- 생활비 수령/중단/부분 수령 시나리오
- 증거 업로드
- 결제 경계
- AI 처리 동의
- OCR/STT/AI 분류 job
- 자료 단위 evidence card
- 사용자 검수/수정
- PDF 리포트
- 개인 확인용 보안 URL
- 삭제 요청
- 테스트와 GCP 배포 준비

### P1

- 공유 URL 비밀번호
- 접근 로그
- 결과 PDF download
- audit event
- provider failure fallback
- mock payment

### Explicitly out of scope

- 변호사 소개/매칭
- 직업소개
- 법률 자문
- AI 법률 판단
- 승소 가능성 예측
- 불법 증거 수집 조언
- 필수 전체 갤러리 스캔
- 영상 분석
- 전화 상담
- 자동 긴급 신고
- 운영자 concierge 원본 열람

## 2. Stack

Use this stack unless existing repo already dictates otherwise.

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui or minimal accessible components
- Prisma
- PostgreSQL
- Vitest
- Playwright
- Zod
- React Hook Form
- PDF generation: @react-pdf/renderer or Playwright print-to-PDF
- GCP Cloud Run
- GCP Cloud SQL PostgreSQL
- GCP Cloud Storage
- GCP Secret Manager
- GCP Cloud KMS
- Optional Cloud Tasks; local fallback worker is required
- Payment provider abstraction: `mock` and `toss`

Use `pnpm`.

## 3. Product Defaults

```txt
PRICE_KRW=9900
MAX_FILES_PER_CASE=20
MAX_TOTAL_UPLOAD_MB=100
MAX_IMAGE_OR_PDF_MB=20
MAX_AUDIO_MB=25
SHARE_URL_TTL_DAYS=14
EVIDENCE_RETENTION_DAYS=365
RUNWAY_ROUNDING=floor_to_half_month
DEFAULT_PAYMENT_PROVIDER=mock
```

## 4. Core User Flow

1. User lands on `/`.
2. User sees positioning: “독립 준비, 생활 가능 기간 계산, 상담 전 자료 정리”.
3. User sees safety popup:
   - “현재 위치와 기기 사용이 안전한지 확인하세요.”
   - actions: 안전합니다 / 위험할 수 있습니다 / 그래도 계속 진행합니다.
4. User completes risk check.
   - High risk: show 112, 1366, safety copy first.
   - User may continue.
5. User runs survival simulator.
   - No server persistence.
   - Results shown in 0.5 month units.
   - Scenarios: support received / support stopped / partial support.
6. User enters evidence preparation flow.
7. User sees upload limits and “자료 부족 시 리포트 품질이 낮을 수 있음” warning.
8. User uploads evidence.
9. User sees external AI consent.
10. User reaches 9,900원 payment boundary.
11. In mock mode, payment succeeds locally.
12. A processing job runs:
    - image/pdf/capture -> Mistral OCR
    - audio -> Groq STT
    - normalized content -> Baseten classifier/extractor
13. System creates evidence cards.
14. User reviews and edits cards.
15. User generates PDF and secure URL.
16. User can delete case.

## 5. Routes

```txt
/
  Landing

/safety
  Safety popup and risk check

/simulator
  Client-only runway calculator

/evidence/start
  Evidence product explanation, upload limits, payment boundary

/evidence/:caseId/upload
  Upload files, consent, payment status

/evidence/:caseId/review
  AI draft cards, user edit/confirm

/evidence/:caseId/report
  PDF generation, secure URL creation, delete/export

/share/:token
  Secure report URL

/account
  Cases, deletion, retention status

/legal/privacy
/legal/terms
/legal/ai-consent
```

## 6. Runway Calculator

### Inputs

- availableCash
- monthlyIncome
- partnerSupportMonthly
- partnerSupportRisk: `maintained | stopped | partial`
- partialSupportRatio
- essentialExpenses
- adjustableExpenses
- debtRepayment
- childCosts
- currentHousingCost
- futureHousingCost
- depositLockedAmount
- movingCost
- legalAdminCost
- emergencyCost

### Formula

```ts
initialDeduction = movingCost + legalAdminCost + emergencyCost
usableCash = availableCash - initialDeduction - depositLockedAmount

monthlyNet =
  monthlyIncome
  + partnerSupportScenarioAmount
  - essentialExpenses
  - adjustableExpenses
  - debtRepayment
  - childCosts
  - selectedHousingCost

if usableCash < 0:
  status = "immediate_shortage"

if monthlyNet >= 0:
  runway = "유지 가능"

else:
  rawMonths = usableCash / abs(monthlyNet)
  runwayMonths = floor(rawMonths * 2) / 2
```

### Rules

- Run entirely client-side.
- Do not POST financial values to server.
- localStorage is allowed only after user explicitly clicks “이 기기에 저장”.
- Provide “이 기기 데이터 삭제” action.
- Show 0.5개월 unit.
- Use conservative floor rounding.
- If result < 1 month, show public support institution section.

## 7. Evidence Types

Supported file types:

```txt
image/jpeg
image/png
image/webp
application/pdf
text/plain
audio/mpeg
audio/mp4
audio/wav
audio/flac
audio/webm
```

Evidence material types:

```ts
type MaterialType =
  | "photo"
  | "capture"
  | "document"
  | "medical_document"
  | "bank_or_payment_record"
  | "audio"
  | "text_note"
  | "police_or_institution_record"
  | "unknown";
```

## 8. AI Tag Taxonomy

```txt
폭언
폭행/상흔
협박
경제적 통제
양육 방해
외도 정황
재산 은닉
스토킹
기타/검토 필요
```

AI must never label anything as “법적으로 유효한 증거”.
All AI outputs are drafts.

## 9. Confidence Policy

```txt
5: very high, include by default after user confirmation
4: high, include with 검토 필요
3: medium, collapsed until user confirms
2: low, review box only
1: very low, hidden unless user explicitly includes
```

Confidence means extraction/classification certainty, not legal strength.

## 10. AI Pipeline

### Provider modules

```txt
src/server/ai/providers/mistral-ocr.ts
src/server/ai/providers/groq-stt.ts
src/server/ai/providers/baseten-classifier.ts
src/server/ai/providers/mock.ts
src/server/ai/timeline-orchestrator.ts
```

### Mistral OCR

Use for:

- PDF
- image
- screenshot/capture
- document photo
- bank/medical document

Do not make GCS object public for Mistral.
Prefer base64 or provider upload.
Store raw OCR response as derived AI artifact.

### Groq STT

Use for:

- audio files
- voice memo

Before STT:

- validate size
- if possible, provide ffmpeg helper script for 16kHz mono FLAC conversion
- store transcript separately from original audio

Transcript format:

```txt
A: ...
B: ...
```

If diarization is unavailable, use paragraph transcript and mark speaker as unknown.

### Baseten classifier

Baseten endpoint receives normalized content:

```json
{
  "caseId": "string",
  "fileId": "string",
  "materialType": "capture",
  "ocrMarkdown": "string|null",
  "transcript": "string|null",
  "userMemo": "string|null",
  "fileMetadata": {
    "originalName": "string",
    "mimeType": "string",
    "uploadedAt": "ISO"
  },
  "allowedTags": [
    "폭언",
    "폭행/상흔",
    "협박",
    "경제적 통제",
    "양육 방해",
    "외도 정황",
    "재산 은닉",
    "스토킹",
    "기타/검토 필요"
  ]
}
```

Expected response:

```json
{
  "title": "string",
  "summaryKo": "string",
  "materialType": "capture",
  "dateCandidates": [
    {
      "date": "YYYY-MM-DD|null",
      "source": "ocr|metadata|user|inferred",
      "confidence": 0.0
    }
  ],
  "people": [
    {
      "label": "나|배우자|제3자|미상",
      "rawMention": "string",
      "confidence": 0.0
    }
  ],
  "locations": ["string"],
  "tags": [
    {
      "tag": "폭언",
      "confidence": 0.0,
      "rationale": "string"
    }
  ],
  "confidenceLevel": 1,
  "includeInReportDefault": false,
  "needsUserReview": true,
  "legalCaution": "자료 취득 경위 및 제출 가능성은 변호사 검토 필요"
}
```

If Baseten fails, use mock classifier and mark job as `provider_degraded`.

## 11. Data Model

Use Prisma.

Core models:

```txt
User
  id
  email nullable
  authProvider
  createdAt

Case
  id
  userId
  title
  status
  retentionUntil
  createdAt
  updatedAt
  deletedAt nullable

ConsentRecord
  id
  caseId
  consentType: ai_processing | sensitive_data | overseas_transfer | payment
  version
  acceptedAt
  ipHash nullable
  userAgentHash nullable

EvidenceFile
  id
  caseId
  originalName
  mimeType
  sizeBytes
  gcsBucket
  gcsObject
  encryptedDek
  checksumSha256
  materialType
  processingStatus
  uploadedAt
  deletedAt nullable

ExtractionResult
  id
  fileId
  provider: mistral | groq | baseten | mock
  kind: ocr | stt | classification
  rawJson
  normalizedText
  createdAt
  deletedAt nullable

EvidenceCard
  id
  caseId
  fileId
  title
  summaryKo
  materialType
  dateCandidate
  dateSource
  peopleJson
  locationsJson
  tagsJson
  confidenceLevel
  includeInReport
  userConfirmed
  userMemo
  aiDraftJson
  createdAt
  updatedAt
  deletedAt nullable

PaymentIntent
  id
  caseId
  provider
  amountKrw
  status
  providerPaymentKey nullable
  createdAt
  paidAt nullable

Report
  id
  caseId
  version
  pdfBucket
  pdfObject
  generatedAt
  deletedAt nullable

ShareLink
  id
  reportId
  tokenHash
  passwordHash nullable
  expiresAt
  revokedAt nullable
  accessCount

AuditEvent
  id
  userId nullable
  caseId nullable
  type
  metadataJson
  createdAt

ProcessingJob
  id
  caseId
  fileId nullable
  type
  status
  attempts
  lastError
  createdAt
  updatedAt
```

Do not create a server-side financial data table for simulator inputs.

## 12. Security

### Storage

- Original evidence files are encrypted before GCS storage.
- Use per-file DEK and envelope encryption with KMS where feasible.
- Derived OCR/STT/classification data is stored separately.
- PDF is stored separately.
- Share URL token is stored as hash only.

### Operator access

- No admin UI for original evidence.
- Logs must not contain original evidence text, OCR text, transcript, names, phone numbers, addresses, child info, or payment secrets.
- Support can see job status, file count, error code, timestamps only.

### Deletion

Deleting a case must:

- soft mark case deleted
- delete or schedule deletion of original encrypted blobs
- delete derived OCR/STT/classification
- delete evidence cards
- delete report PDF from service storage
- revoke share URLs
- retain only non-sensitive audit records where required

Add `deleteCaseDeep(caseId)` and tests.

## 13. Legal/Ethical Guardrails

UI and PDF must show:

```txt
이 서비스는 법률 자문을 제공하지 않습니다.
AI가 생성한 요약, 태그, 날짜, 인물 정보는 초안이며 사용자의 확인이 필요합니다.
자료의 취득 경위, 제출 가능성, 법적 효력은 변호사에게 확인해야 합니다.
불법적인 자료 수집, 무단 접근, 위치추적, 몰래 설치형 기능은 안내하지 않습니다.
긴급 위험이 있는 경우 서비스 이용보다 112 또는 1366 등 공적 지원기관 연락을 우선하세요.
```

Never generate:

- illegal collection instructions
- hacking/account access guidance
- location tracking guidance
- spyware guidance
- legal outcome guarantee
- win probability
- divorce recommendation

## 14. PDF Report

PDF sections:

1. 표지
2. 법률 자문 아님 고지
3. 요약
4. 자료 수, 기간, 주요 태그, confidence 분포
5. 자료 타임라인
6. 음성 전사
7. 카카오톡/문자 구조화
8. 문서/계좌/진단서 추출 텍스트
9. 확인 필요 자료
10. 원본 파일 목록
11. 주의 문구

PDF must include only user-confirmed cards or cards explicitly included by user.

## 15. Secure URL

Share URL:

```txt
/share/:token
```

Rules:

- token must be random and stored as hash
- optional password
- default expiry 14 days
- revoked link returns 404 or expired page
- access event logged without exposing sensitive content
- no indexing metadata
- add robots noindex

## 16. APIs

Implement route handlers or server actions.

```txt
POST /api/cases
GET /api/cases/:id

POST /api/uploads/presign
POST /api/uploads/complete

POST /api/consents

POST /api/payments/create
POST /api/payments/mock-complete
POST /api/payments/webhook

POST /api/jobs/enqueue
POST /api/jobs/process
GET /api/jobs/:id

GET /api/evidence/:caseId/cards
PATCH /api/evidence/cards/:cardId

POST /api/reports/:caseId/generate
GET /api/reports/:reportId/download

POST /api/share/:reportId
POST /api/share/:shareId/revoke

DELETE /api/cases/:caseId
```

All mutating APIs require session/user ownership check.

## 17. Payment

Implement provider abstraction.

```ts
interface PaymentProvider {
  createPaymentIntent(input): Promise<PaymentIntentResult>
  verifyWebhook(req): Promise<WebhookResult>
}
```

Providers:

- `mock`: local and test mode
- `toss`: real adapter skeleton using env vars

If Toss keys are absent, app must still work in mock mode.

Payment boundary:

- user may upload metadata before payment
- AI processing starts only after payment success and AI consent accepted
- if uploaded materials are insufficient, show warning before payment

## 18. GCP Deployment

Create:

```txt
Dockerfile
.dockerignore
cloudrun.service.yaml or deploy/cloudrun.yaml
deploy/gcp-setup.md
```

`deploy/gcp-setup.md` must include:

- required APIs
- bucket creation
- KMS key creation
- Cloud SQL setup
- Secret Manager setup
- Cloud Run deploy command
- migration command
- service account IAM
- environment variables
- rollback command

## 19. Tests

### Unit tests

- runway calculator
- 0.5 month floor rounding
- support maintained/stopped/partial scenario
- confidence include policy
- provider response parsing
- share token hash
- deletion cascade

### Integration tests

- create case
- upload mock file
- accept consent
- mock payment
- process mock AI job
- edit evidence card
- generate PDF
- create share URL
- revoke/delete

### E2E Playwright

Happy path:

1. open landing
2. pass safety popup
3. fill simulator
4. see 0.5개월 result
5. start evidence flow
6. upload fixture text/image/audio
7. accept AI consent
8. mock pay
9. process job
10. review card
11. generate PDF
12. open secure share URL
13. delete case

## 20. Commands

Codex must make these pass:

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

If `pnpm e2e` needs browser install:

```bash
pnpm exec playwright install --with-deps
```

## 21. Required Output Files

At completion, create:

```txt
IMPLEMENTATION_REPORT.md
SECURITY_NOTES.md
deploy/gcp-setup.md
.env.example
```

`IMPLEMENTATION_REPORT.md` must include:

- implemented features
- commands run
- test results
- known blockers
- provider mode: real/mock
- deployment instructions
- exact env vars still needed
- what is not legal-review complete
