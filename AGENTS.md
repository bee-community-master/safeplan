# AGENTS.md

## Project

This repository implements the production-ready MVP of “독립 세이프플랜”, a Korean B2C web app for:

1. client-side survival runway simulation
2. evidence upload
3. OCR/STT/AI draft evidence timeline
4. user review
5. PDF and secure URL report generation

Use `DETAILED_PLAN.md` as the source of truth.

## Work style

- Do not stop for broad clarification.
- Choose conservative defaults from `DETAILED_PLAN.md`.
- If a required credential or external resource is missing, implement mock/test mode and document the exact blocker.
- Keep changes cohesive and production-oriented.
- Prefer complete vertical slices over scattered partial work.
- After each major slice, run the relevant tests.
- If a command fails, fix it and rerun before moving on.
- Do not claim completion without evidence.
- Do not introduce features outside the defined MVP scope.
- Do not silently weaken privacy, deletion, or safety requirements.

## Commands

Use `pnpm`.

Required verification:

```bash
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

If Playwright browsers are missing:

```bash
pnpm exec playwright install --with-deps
```

## Expected repo structure

```txt
src/
  app/
  components/
  lib/
  server/
    ai/
    auth/
    db/
    files/
    jobs/
    payments/
    reports/
    security/
  tests/
prisma/
fixtures/
deploy/
docs/
```

## Product constraints

Always preserve these constraints:

- Korean UI copy.
- No legal advice.
- No win prediction.
- No lawyer matching.
- No job matching.
- No illegal evidence collection guidance.
- No hacking, account access, spyware, location tracking, or 몰래 설치 guidance.
- No mandatory whole-gallery scan.
- No server-side storage of financial simulator values by default.
- AI output is always “초안”.
- User confirmation is required before final PDF inclusion.
- Confidence means extraction certainty, not legal strength.
- Evidence report must include legal caution copy.
- Emergency resources 112 and 1366 must be visible in high-risk flows.
- Evidence organization must be described as “증거 정리”, “자료 타임라인”, or “상담자료 준비”, not as legal evidence collection.
- The service must not recommend divorce or determine whether the user should divorce.
- The service must not decide whether a material is legally admissible.
- The service must not label any item as “법적으로 유효한 증거”.

## MVP scope

### P0

Implement these as core product flow:

- landing page
- safety popup
- risk check
- client-only survival simulator
- 0.5개월 runway result
- support maintained/stopped/partial scenario
- evidence upload
- payment boundary
- external AI consent
- OCR/STT/AI processing job
- evidence card generation
- user review/edit
- PDF report
- secure personal URL
- deletion request
- tests
- GCP deployment preparation

### P1

Implement where feasible without destabilizing P0:

- share URL password
- access log
- PDF download
- audit event
- provider failure fallback
- mock payment

### Explicitly out of scope

Do not implement:

- lawyer introduction or matching
- job introduction
- legal advice
- AI legal judgment
- win probability prediction
- illegal evidence collection guidance
- mandatory whole-gallery scan
- video analysis
- phone counseling
- automatic emergency reporting
- operator concierge review of original evidence

## User flow requirements

Implement the main happy path:

1. User opens landing page.
2. User sees safety popup.
3. User completes or skips risk check after seeing proper safety guidance.
4. User fills survival simulator.
5. User sees result in 0.5개월 unit.
6. User sees living-expense support scenarios.
7. User enters evidence preparation flow.
8. User sees upload limits and insufficient-material warning.
9. User uploads supported files.
10. User accepts sensitive data and external AI processing consent.
11. User completes 9,900원 mock payment in local/test mode.
12. System processes files through mock or real providers.
13. System creates evidence cards.
14. User reviews and edits evidence cards.
15. User generates PDF.
16. User creates secure share URL.
17. User can revoke share URL or delete the case.

## Safety UX requirements

- Show safety popup on first entry and before evidence upload.
- Warn user to stop if the other party can see the phone or browser.
- For high-risk answers, show 112 and 1366 first.
- Do not force the user to stop the flow after high-risk answers.
- Push notifications must be off by default.
- Do not implement automatic emergency calls or reports.
- Add clear copy that the service does not replace emergency support or legal counsel.

Required safety copy:

```txt
이 서비스를 사용하기 전, 현재 위치와 기기 사용이 안전한지 확인하세요.
상대방이 같은 공간에 있거나 휴대폰을 볼 수 있다면 사용을 중단하거나 안전한 장소에서 다시 접속하세요.
긴급 위험이 있는 경우 서비스 이용보다 112 또는 1366 등 공적 지원기관 연락을 우선하세요.
```

## Survival simulator requirements

- Run calculation client-side.
- Do not send financial inputs to the server.
- Do not create a server-side financial data table.
- Allow localStorage only after explicit user action.
- Provide local deletion action.
- Show 0.5개월 result.
- Use conservative floor rounding to 0.5 month.
- Separate scenarios:
  - 생활비를 받을 수 있는 경우
  - 생활비를 받을 수 없는 경우
  - 일부만 받을 수 있는 경우
- If runway is below 1 month, show public support institution guidance.
- Do not recommend high-interest debt, card loans, private loans, or unsafe financial choices.

## Evidence requirements

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

Limits:

```txt
MAX_FILES_PER_CASE=20
MAX_TOTAL_UPLOAD_MB=100
MAX_IMAGE_OR_PDF_MB=20
MAX_AUDIO_MB=25
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

The default timeline unit is a material/card, not a legally defined incident.

Each evidence card must support:

- original file reference
- material type
- title
- summary
- date candidate
- date source
- people
- locations
- tags
- confidence level
- user memo
- user confirmation
- include/exclude from report
- AI draft metadata

## AI requirements

Implement real adapters and mock adapters.

Providers:

- Mistral OCR: image/PDF/capture OCR.
- Groq STT: audio transcription.
- Baseten: evidence classifier/extractor.
- Mock provider: deterministic local/test output.

Provider modules should exist under:

```txt
src/server/ai/providers/mistral-ocr.ts
src/server/ai/providers/groq-stt.ts
src/server/ai/providers/baseten-classifier.ts
src/server/ai/providers/mock.ts
src/server/ai/timeline-orchestrator.ts
```

If provider credentials are missing:

- app must still run locally
- tests must use mock providers
- implementation report must list required env vars
- do not block the user flow
- mark degraded provider state where appropriate

AI tag taxonomy:

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

AI must not perform:

- legal judgment
- win prediction
- psychological diagnosis
- divorce recommendation
- illegal evidence collection advice
- authenticity determination
- admissibility determination

All AI summaries, tags, dates, people extraction, and timeline grouping must be shown as drafts.

## Confidence policy

Use this policy consistently:

```txt
5: very high, include by default after user confirmation
4: high, include with 검토 필요
3: medium, collapsed until user confirms
2: low, review box only
1: very low, hidden unless user explicitly includes
```

Confidence means extraction/classification certainty, not legal strength.

## Consent requirements

Before AI processing starts, collect explicit consent for:

- sensitive data processing
- original evidence processing
- external AI/OCR/STT provider processing
- possible overseas processing or third-party processing, where applicable
- payment

Consent records must include:

- caseId
- consent type
- version
- acceptedAt
- hashed IP if available
- hashed user agent if available

Do not start OCR/STT/classification until:

1. payment is successful
2. AI consent is accepted
3. sensitive data consent is accepted

## Payment requirements

Implement payment provider abstraction.

Providers:

- `mock`: local and test mode
- `toss`: real adapter skeleton using env vars

Payment price:

```txt
PRICE_KRW=9900
```

Rules:

- Mock payment must support the full local happy path.
- If Toss keys are absent, app must still work in mock mode.
- AI processing starts only after payment success and consent.
- Show warning before payment if uploaded materials may be insufficient.
- Do not log payment secrets.

## Security constraints

- Never commit secrets.
- Create `.env.example`, not `.env.local`.
- Do not log raw evidence, OCR text, transcript, names, phone numbers, addresses, child info, or payment secrets.
- Original evidence must be stored separately from user memo and AI outputs.
- Use encryption-at-rest patterns and KMS/env-driven configuration.
- Share URL tokens must be random and stored hashed.
- Deleted or revoked share URLs must not expose report content.
- Deletion must cover original file, derived OCR/STT, AI tags, cards, report PDF, and share links.
- Operator support must only see processing status and error metadata, not raw evidence.
- No admin UI may expose original evidence.
- Logs may include status, counts, timestamps, provider name, and error category only.
- Do not make private GCS objects public for OCR processing.
- Prefer base64/provider upload flow over public object URLs for sensitive files.

## Storage and deletion requirements

Store separately:

- original evidence file
- user explanation/memo
- OCR result
- STT transcript
- AI classification result
- evidence card
- report PDF
- share link

Deleting a case must:

- soft mark case deleted
- delete or schedule deletion of original encrypted blobs
- delete derived OCR/STT/classification data
- delete evidence cards
- delete service-stored report PDF
- revoke share URLs
- retain only non-sensitive audit records where required

Implement and test:

```ts
deleteCaseDeep(caseId)
```

## Share URL requirements

Share URL pattern:

```txt
/share/:token
```

Rules:

- token must be random
- token must be stored as hash only
- default expiry is 14 days
- optional password support is preferred
- revoked link must return expired or not-found state
- expired link must not expose report content
- access event must not log sensitive content
- add noindex metadata

## PDF report requirements

PDF must include only:

- user-confirmed cards
- cards explicitly included by user

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

Required caution copy in UI and PDF:

```txt
이 서비스는 법률 자문을 제공하지 않습니다.
AI가 생성한 요약, 태그, 날짜, 인물 정보는 초안이며 사용자의 확인이 필요합니다.
자료의 취득 경위, 제출 가능성, 법적 효력은 변호사에게 확인해야 합니다.
불법적인 자료 수집, 무단 접근, 위치추적, 몰래 설치형 기능은 안내하지 않습니다.
긴급 위험이 있는 경우 서비스 이용보다 112 또는 1366 등 공적 지원기관 연락을 우선하세요.
```

## UI requirements

Pages must be accessible, responsive, and calm.

Required pages:

- landing
- safety popup/risk check
- simulator
- evidence start
- evidence upload
- payment boundary
- AI consent
- review/edit evidence cards
- report generation
- secure share URL
- account/delete
- privacy policy
- terms
- AI consent policy

Do not over-optimize visual design. Prioritize:

- complete functional flow
- clear Korean copy
- safe UX
- accessible forms
- visible privacy/security explanations
- visible deletion controls

## API requirements

Implement route handlers or server actions for the core flow.

Expected APIs:

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

All mutating APIs require ownership/session checks.

## GCP deployment requirements

Create:

```txt
Dockerfile
.dockerignore
deploy/cloudrun.yaml
deploy/gcp-setup.md
```

`deploy/gcp-setup.md` must include:

- required GCP APIs
- Artifact Registry setup
- Cloud Run deploy command
- Cloud SQL PostgreSQL setup
- Cloud Storage bucket setup
- KMS key setup
- Secret Manager setup
- service account IAM
- environment variables
- migration command
- rollback command

Default GCP region:

```txt
GCP_REGION=asia-northeast3
```

## Environment variables

Create `.env.example` with at least:

```txt
DATABASE_URL=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

PAYMENT_PROVIDER=mock
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
TOSS_WEBHOOK_SECRET=

MISTRAL_API_KEY=
GROQ_API_KEY=
BASETEN_API_KEY=
BASETEN_CLASSIFIER_URL=

GCP_PROJECT_ID=
GCP_REGION=asia-northeast3
GCS_BUCKET_ORIGINALS=
GCS_BUCKET_DERIVED=
GCS_BUCKET_REPORTS=
KMS_KEY_NAME=

MAX_FILES_PER_CASE=20
MAX_TOTAL_UPLOAD_MB=100
MAX_IMAGE_OR_PDF_MB=20
MAX_AUDIO_MB=25
SHARE_URL_TTL_DAYS=14
EVIDENCE_RETENTION_DAYS=365
```

## Testing expectations

Add tests for:

- runway calculation
- 0.5 month floor rounding
- support maintained/stopped/partial scenario
- client-only simulator behavior
- evidence upload validation
- confidence include policy
- provider mocks
- provider response parsing
- payment mock flow
- consent gating
- share token hashing
- share URL expiry/revocation
- deletion cascade
- PDF generation smoke test
- Playwright happy path

Playwright happy path:

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

## Documentation required

At the end, produce:

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
- any deviations from `DETAILED_PLAN.md`

`SECURITY_NOTES.md` must include:

- data separation model
- encryption approach
- deletion behavior
- logging policy
- operator access limits
- external provider data handling assumptions
- remaining legal/security review items

## Completion standard

The task is complete only when:

- implementation matches `DETAILED_PLAN.md`
- mock mode works end to end
- real provider adapters exist
- lint passes
- unit tests pass
- build passes
- Playwright happy path passes or has a precise documented external blocker
- GCP deployment instructions exist
- `.env.example` exists
- no secrets are committed
- legal/ethical guardrails are visible in UI and PDF
- deletion flow is implemented and tested
- IMPLEMENTATION_REPORT.md is complete
