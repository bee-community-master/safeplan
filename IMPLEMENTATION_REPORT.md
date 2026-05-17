# IMPLEMENTATION_REPORT.md

## 구현 요약

독립 세이프플랜 MVP를 Next.js App Router 기반 한국어 웹앱으로 구현했고, production 출시 차단 요소를 추가 하드닝했다. local/test는 mock provider와 local object store를 유지하지만, production은 Prisma PostgreSQL backend, GCS object storage, Toss 결제 승인, runtime readiness gate를 사용하도록 구성했다.

## 구현된 기능

- 랜딩, 안전 팝업, 위험 체크, 112/1366 고위험 안내
- 서버 전송 없는 client-only 생존 시뮬레이터
  - 0.5개월 단위 보수적 내림
  - 생활비 수령/중단/부분 수령 시나리오
  - 사용자가 누른 경우에만 localStorage 저장, 로컬 삭제 버튼 제공
- 증거 정리 흐름
  - 업로드 제한/자료 부족 경고
  - 지원 MIME/용량 검증
  - 원본 파일 AES-256-GCM envelope encryption 저장(local 또는 GCS object storage)
  - 사용자 메모, OCR/STT, AI 분류, 카드, PDF, 공유 URL 분리 저장
- 동의/결제 gate
  - 민감정보, 원본 자료, 외부 AI/OCR/STT, 해외/제3자 처리, 결제 동의 기록
  - IP/User-Agent 해시 저장
  - 9,900원 mock payment full path
  - Toss checkout SDK redirect + server-side confirm API + webhook retrieve-verify handler
- AI pipeline
  - Mistral OCR adapter: `src/server/ai/providers/mistral-ocr.ts`
  - Groq STT adapter: `src/server/ai/providers/groq-stt.ts`
  - Baseten classifier adapter: `src/server/ai/providers/baseten-classifier.ts`
  - deterministic mock provider: `src/server/ai/providers/mock.ts`
  - missing key/provider failure fallback with `provider_degraded`
- Evidence card review/edit
  - AI output displayed as 초안
  - confidence policy labels
  - user confirmation and explicit PDF inclusion gate
- PDF/report/share
  - Korean PDF smoke generation with Noto Sans KR font embedding
  - confirmed+included cards only
  - secure `/share/:token` URL, token hash storage, 14-day TTL, revoke, access audit
  - noindex metadata and robots disallow
  - PDF download route
- Deletion
  - `deleteCaseDeep(caseId)` implemented/tested
  - deletes original encrypted objects and report objects, soft-marks case/report, clears derived sensitive text, deletes cards, revokes share URLs, leaves non-sensitive audit event
- Audit events
  - case creation, upload, consent, payment, job processing, report/share/delete status events without raw evidence text
- Legal/ethical guardrails
  - Korean UI copy
  - no legal advice/win prediction/lawyer-job matching/illegal collection guidance
  - required caution copy in UI/PDF/share flows
- Production runtime hardening
  - `SAFEPLAN_DB_BACKEND=prisma` normalized `safeplan_*` PostgreSQL persistence
  - `STORAGE_PROVIDER=gcs` private object adapter for originals/reports
  - signed anonymous session cookie
  - security middleware: CSP, frame deny, no-sniff, no-referrer, permission policy, same-origin mutating API guard, per-instance rate limit
  - `/api/health/live`, `/api/health/ready` production readiness gate
  - Prisma migration under `prisma/migrations/`
  - `docs/production-readiness.md`
- Deployment artifacts
  - `Dockerfile`
  - `.dockerignore`
  - `deploy/cloudrun.yaml`
  - `deploy/gcp-setup.md`
  - `.env.example`
  - `SECURITY_NOTES.md`

## 명령 실행 결과

최종 순차 검증:

```bash
pnpm lint && pnpm test && pnpm build && pnpm e2e && pnpm e2e:live
docker build -t safeplan:production-hardening .
```

결과:

- `pnpm lint`: 통과 (`next lint` no errors + `tsc --noEmit` 통과)
- `pnpm test`: 통과 — 6 files, 11 tests
- `pnpm build`: 통과 — Next.js 15.5.18 production build, 24 static pages generated
- `pnpm e2e`: 통과 — Playwright Chromium happy path 1 passed, live-provider spec 1 skipped
- `docker build -t safeplan:production-hardening .`: 통과 — Prisma generate + Next production build 포함

추가 수행:

```bash
pnpm install
pnpm approve-builds --all
pnpm exec playwright install --with-deps
```

Playwright browser가 최초 미설치라 `pnpm exec playwright install --with-deps`를 실행한 뒤 E2E를 재실행했다.


## Live E2E 추가 검증

사용자 승인에 따라 비용이 발생할 수 있는 live provider E2E를 추가/실행했다.

```bash
pnpm build
pnpm e2e:live
```

결과:

- `pnpm e2e:live`: 통과 — Playwright Chromium live provider full path 1 test passed
- 실제 외부 호출 확인: `ocr:mistral=1`, `stt:groq=1`
- 현재 `.env.local`의 `BASETEN_CLASSIFIER_URL`이 비어 있어 Baseten classifier live call은 blocked 상태이며 classification은 mock fallback으로 검증됐다.
- Local live E2E는 외부 AI 비용 검증에 초점을 맞춰 `PAYMENT_PROVIDER=mock`으로 유지했다. Toss 결제 redirect/confirm 구현은 운영 credential 연결 후 별도 smoke가 필요하다.

## Provider mode

- 기본 로컬/test: `AI_PROVIDER_MODE=mock`, `PAYMENT_PROVIDER=mock`
- 실제 provider 호출 조건:
  - `AI_PROVIDER_MODE=real`
  - `MISTRAL_API_KEY`
  - `GROQ_API_KEY`
  - `BASETEN_API_KEY`
  - `BASETEN_CLASSIFIER_URL`
- 실제 결제 조건:
  - `PAYMENT_PROVIDER=toss`
  - `TOSS_CLIENT_KEY`
  - `TOSS_SECRET_KEY`
  - `TOSS_WEBHOOK_SECRET`

키가 없거나 provider 호출이 실패하면 mock fallback을 사용하고 처리 상태/작업 상태에 degraded 정보를 남긴다.

## 배포 방법 요약

1. `.env.example` 기준으로 Secret Manager 값을 생성한다.
2. `deploy/gcp-setup.md`의 API 활성화, Artifact Registry, Cloud SQL, Storage bucket, KMS, IAM 설정을 적용한다.
3. 이미지를 빌드한다.
   ```bash
   gcloud builds submit --tag "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/safeplan/safeplan-web:latest"
   ```
4. Prisma migration을 적용한다.
   ```bash
   DATABASE_URL="..." pnpm prisma:migrate
   ```
5. Cloud Run에 배포한다.
   ```bash
   gcloud run services replace deploy/cloudrun.yaml --region=asia-northeast3
   ```

## 필요한 환경변수

`.env.example`에 전체 목록을 포함했다. 운영 필수값:

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `STORAGE_PROVIDER`
- `SAFEPLAN_DB_BACKEND`
- `APP_ENV`
- `PAYMENT_PROVIDER`
- `TOSS_CLIENT_KEY`
- `TOSS_SECRET_KEY`
- `TOSS_WEBHOOK_SECRET`
- `AI_PROVIDER_MODE`
- `MISTRAL_API_KEY`
- `GROQ_API_KEY`
- `BASETEN_API_KEY`
- `BASETEN_CLASSIFIER_URL`
- `GCP_PROJECT_ID`
- `GCP_REGION=asia-northeast3`
- `GCS_BUCKET_ORIGINALS`
- `GCS_BUCKET_DERIVED`
- `GCS_BUCKET_REPORTS`
- `KMS_KEY_NAME`
- `ENVELOPE_MASTER_KEY_BASE64`
- upload/share/retention limit variables

## 알려진 blocker / 운영 전 확인 필요

- Baseten live classifier는 `BASETEN_CLASSIFIER_URL`이 있어야 실제 호출까지 검증 가능하다. 현재 local live E2E는 Mistral/Groq 실제 호출과 Baseten mock fallback을 확인했다.
- Toss 실결제 redirect/승인은 구현됐지만, 운영 키와 Toss 콘솔 설정 후 실제 결제 smoke가 필요하다.
- Cloud SQL/GCS/KMS/Secret Manager 리소스를 만든 뒤 `pnpm prisma:migrate`, Cloud Run 배포, `/api/health/ready` 200 확인이 필요하다.
- Prisma backend는 normalized table replace + advisory lock 방식의 소규모 launch 구현이다. 트래픽 증가 전 row-level repository와 queue 분리가 필요하다.
- 법률 문구는 guardrail 수준이며 법률 검토 완료 상태가 아니다.

## DETAILED_PLAN.md 대비 편차

- MVP local/test mode는 local JSON/object store를 사용하고, production은 `SAFEPLAN_DB_BACKEND=prisma`와 `STORAGE_PROVIDER=gcs`로 전환한다.
- Toss 실결제는 SDK redirect와 confirm API까지 구현했지만, 실제 운영 결제 smoke는 credential/콘솔 설정 후 필요하다.
- Optional Cloud Tasks는 사용하지 않고 local processing endpoint를 구현했다.
- PDF 생성은 서버 내 PDF-lib 기반 smoke/report 생성으로 구현했고, 브라우저 print-to-PDF 방식은 사용하지 않았다.

## 완료 기준 감사

- mock mode end-to-end: Playwright happy path 통과
- real provider adapters: 파일 존재 및 parser/mock tests 통과
- lint: 통과
- unit/integration tests: 통과
- build: 통과
- Playwright happy path: 통과
- GCP deployment instructions: `deploy/gcp-setup.md`
- `.env.example`: 존재
- secrets committed: `.env.local` ignored, secret 값은 커밋 대상 아님
- legal/ethical guardrails: UI/PDF/share copy 반영
- deletion flow: `deleteCaseDeep(caseId)` 구현 및 integration test 통과
