# IMPLEMENTATION_REPORT.md

## 구현 요약

독립 세이프플랜 MVP를 Next.js App Router 기반 한국어 웹앱으로 구현했고, production 출시 차단 요소를 추가 하드닝했다. local/test는 mock provider와 local object store를 유지하지만, production은 Prisma PostgreSQL backend, GCS object storage, Toss 결제 승인, runtime readiness gate를 사용하도록 구성했다. 또한 사용자 화면, 공유 화면, PDF에 남아 있던 내부 운영/개발 용어를 정리해 production 사용자 경험 문구로 교체했다.

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
  - Toss v2 Standard SDK current-window redirect + server-side confirm API + webhook retrieve-verify handler
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
  - optional share-link password gate in user flow and protected share page
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
- 사용자 경험 문구 정리
  - 화면에 노출되던 `mock`, `provider`, `OCR/STT`, `noindex`, `token/hash`, `MVP`, `결제 ID` 등 내부 표현 제거
  - 결제/동의/자료 정리/공유/삭제 상태 메시지를 자연스러운 한국어 서비스 문구로 교체
  - PDF 원본 목록의 MIME/bytes 표기를 사람이 읽는 파일 유형/용량 표기로 교체
  - API 오류 응답의 내부 오류 코드/환경 정보 노출을 사용자 안전 문구로 변환
- Production 사용자 표면 보강
  - 가격/환불 안내, 도움말/고객지원, 서비스 상태 페이지 추가
  - 전역 네비게이션/푸터에 법적 고지, 개인정보, 환불, 상태 링크 추가
  - 공개 페이지는 검색 허용, 민감한 evidence/share/account/API 경로는 robots/noindex로 보호
  - 삭제 전 확인 체크박스 추가로 실수 삭제 방지
- Production 디자인/라우팅 정리
  - Build Web Apps 기준으로 생성한 디자인 컨셉을 바탕으로 warm stone 배경, white surface, deep charcoal text, muted teal accent 중심의 4색 UI 시스템 적용
  - `DesignSystem` 컴포넌트로 브랜드 마크, CTA, 페이지 히어로, 제품 흐름, guardrail 카드, 주요 라우트 카드 재사용
  - landing, safety, simulator, evidence start/upload/review/report, pricing, help, status, legal/share/account 화면의 여백·카드·버튼·입력 스타일 통일
  - production favicon 추가 및 Browser/Playwright desktop+mobile visual QA 수행
- Production runtime hardening
  - `SAFEPLAN_DB_BACKEND=prisma` normalized `safeplan_*` PostgreSQL persistence
  - `STORAGE_PROVIDER=gcs` private object adapter for originals/reports
  - signed anonymous session cookie
  - security middleware: CSP, frame deny, no-sniff, no-referrer, permission policy, same-origin mutating API guard, per-instance rate limit
  - `/api/health/live`, `/api/health/ready` production readiness gate
  - Prisma migration under `prisma/migrations/`
  - `docs/production-readiness.md`
- 한/영 전환 지원
  - 한국어 기본값 유지, 발표 시연용 English 토글 추가
  - 전역 네비게이션에서 언어를 전환하고 선택값을 브라우저에 저장
  - 주요 정적 페이지와 핵심 flow 문구, 안전/법적 고지, 업로드·결제·리포트 상태 문구를 영어로 전환
  - `html lang`과 문서 제목도 현재 언어에 맞게 갱신
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
docker build -t safeplan:production-ux .
docker build -t safeplan:production-design .
```

결과:

- `pnpm lint`: 통과 (`next lint` no errors + `tsc --noEmit` 통과)
- `pnpm test`: 통과 — 12 files, 31 tests
- `pnpm build`: 통과 — Next.js 15.5.18 production build, 29 static pages generated
- `pnpm e2e`: 통과 — Playwright Chromium happy path 1 passed, language toggle 1 passed, live-provider spec 1 skipped
- `pnpm e2e:live`: 통과 — Playwright Chromium live provider full path 1 passed
- `docker build -t safeplan:production-hardening .`: 통과 — Prisma generate + Next production build 포함
- `docker build -t safeplan:production-ux .`: 통과 — production UX 보강 후 Next production build 29 static pages 포함
- `docker build -t safeplan:production-design .`: 통과 — 디자인/라우팅 정리 후 Next production build 29 static pages 포함

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
- Local live E2E는 외부 AI 비용 검증에 초점을 맞춰 `PAYMENT_PROVIDER=mock`으로 유지했다. Toss 결제 current-window redirect/confirm 구현은 운영 credential 연결 후 별도 smoke가 필요하다.
- 사용자 문구 정리 후에도 live E2E를 재실행해 변경된 동의/결제/자료 정리/공유/삭제 레이블로 전체 흐름이 깨지지 않음을 확인했다.
- Production 사용자 표면 보강 후 Playwright happy path에서 비밀번호 보호 공유 링크 열기와 삭제 전 확인 UX를 함께 검증했다.
- 디자인 컨셉과 구현 화면을 `view_image`로 확인했고, Browser/Playwright에서 desktop 1440px 및 mobile 390px 렌더링을 점검했다.



## 2026-05-17 code-review refactor update

`$code-review` 병렬 리뷰 결과 주요 HIGH/MEDIUM 이슈를 반영했다.

- 업로드 저장은 client가 보낸 `sizeBytes`가 아니라 실제 base64 decode byte 길이로 검증·저장한다.
- Toss 일반 결제 webhook은 서명 헤더를 가정하지 않고 server-side retrieve API로 재조회한 뒤 orderId, 금액, DONE 상태를 확인한 경우에만 처리한다.
- Evidence upload client를 동의 체크리스트와 client helper로 분리하고, 지원 MIME 타입은 공통 상수에서 사용한다.
- 공유 리포트 payload 생성 로직을 단일 server service로 통합했다.
- Review card client는 persistence record 대신 explicit DTO를 사용한다.
- provider missing-credential error를 vendor별 adapter가 아닌 provider schema contract로 이동했다.
- PDF 섹션 heading을 요구사항의 11개 섹션으로 고정하고 테스트를 추가했다.
- production CSP에서 `unsafe-eval`을 제거하고 dev/local에만 허용했다.
- Cloud Run은 스냅샷 DB 호환 계층이 남아 있는 동안 `maxScale=1`, `containerConcurrency=1`로 제한한다.

추가 검증:

- `pnpm lint`: 통과
- `pnpm test`: 통과 — 8 files, 21 tests
- `pnpm build`: 통과 — 29 static pages
- `pnpm e2e`: 통과 — happy path 1 passed, live-provider skipped
- `pnpm e2e:live`: 통과 — Mistral OCR/Groq STT live path 1 passed

## 2026-05-17 repeated code-review hardening update

반복 `$code-review`에서 나온 BLOCK/HIGH/MEDIUM 항목을 추가 반영했다.

- 리포트 생성 시 사용자 확인+포함 카드와 해당 원본 파일만 PDF에 포함하고, 공유 링크는 생성 당시 `snapshotJson`에서만 렌더링한다.
- 공유 링크 API 응답은 `tokenHash`/`passwordHash`를 반환하지 않고 안전한 요약 DTO만 반환한다.
- 업로드 제한은 요청 단위가 아니라 케이스 누적 파일 수/용량까지 검증하며, DB 저장 실패 시 이미 쓴 암호화 객체를 정리한다.
- 결제 생성/완료 API에 payment consent server-side gate를 추가하고, AI 처리에는 sensitive/original/AI/overseas/payment 동의를 모두 요구한다.
- 리뷰 화면에 원본 파일, 자료 유형, 날짜 출처, 인물/장소/태그 초안, AI 초안 메타데이터를 표시하고 confidence 단계별 접힘/검토 UX를 적용했다.
- evidence upload 진입 전에 별도 안전 확인 팝업을 띄우고, `/account`에서 세션 내 자료 묶음 상태와 삭제 동작을 제공한다.
- Baseten classifier 응답에서 “법적으로 유효한 증거”, “승소 가능성”, “이혼해야 합니다” 등 금지된 법률/결과 판단 문구를 거부한다.
- Next App Router 동적 segment 이름 충돌을 복구하고, `src/app/api/uploads`가 `.gitignore`에 의해 빠지지 않도록 수정했다.

추가 검증:

- `pnpm lint`: 통과
- `pnpm test`: 통과 — 8 files, 18 tests
- `pnpm build`: 통과 — 29 static pages
- `pnpm e2e`: 통과 — happy path 1 passed, live-provider skipped
- `pnpm e2e:live`: 통과 — live provider path 1 passed

## 2026-05-17 repeated code-review pass 4 race/privacy update

네 번째 architecture 리뷰에서 나온 race/privacy blocker를 추가 반영했다.

- GCS/local object key에서 원본 파일명을 제거하고 opaque record id만 사용한다.
- 처리 결과 persist 직전 case/file/job 상태를 재검증해 삭제 후 extraction/card가 다시 쓰이지 않게 했다.
- 리포트 PDF 생성 후 persist 직전 case/card/file 상태와 카드 `updatedAt`을 재검증하고, 변경되면 PDF object를 삭제한 뒤 재생성을 요구한다.
- case/card/share payload의 사용자 API 응답에서 내부 session/user/file/snapshot 식별자를 추가로 제거했다.

추가 검증:

- `pnpm lint`: 통과
- `pnpm test`: 통과 — 8 files, 21 tests
- `rm -rf .next && pnpm build`: 통과 — 29 static pages
- `pnpm e2e`: 통과 — happy path 1 passed, live-provider skipped
- `pnpm e2e:live`: 통과 — live provider path 1 passed

## 2026-05-17 repeated code-review pass 8 deletion-race update

여덟 번째 architecture/QA 리뷰에서 나온 삭제 후 stale mutation blocker와 webhook 회귀 테스트 공백을 추가 반영했다.

- `storeEvidenceFiles`, `createPaymentIntent`, `completeMockPayment`/Toss paid marking, consent 저장, job enqueue가 DB mutation 안에서 active case를 다시 확인한다.
- 삭제는 먼저 DB tombstone/revoke/scrub을 완료하고, 그 mutation에서 캡처한 원본/PDF object 목록을 삭제해 삭제와 업로드가 겹쳐도 stale 암호화 객체가 남지 않게 했다.
- Toss webhook은 삭제된 case의 결제 이벤트를 ignore하고 retrieve API를 호출하지 않으며, retrieve 결과가 DONE/orderId/금액과 일치할 때만 paid 처리한다.
- 업로드-삭제 race, 삭제 후 결제/작업 mutation 거부, Toss webhook retrieve 호출 및 mismatch ignore 회귀 테스트를 추가했다.

추가 검증:

- `pnpm test src/tests/integration.test.ts src/tests/payments.test.ts`: 통과 — 2 files, 13 tests
- `pnpm lint`: 통과
- `pnpm test`: 통과 — 11 files, 29 tests
- `rm -rf .next && pnpm build`: 통과 — 29 static pages
- `pnpm e2e`: 통과 — happy path 1 passed, live-provider skipped
- `pnpm e2e:live`: 통과 — live provider path 1 passed

## 2026-05-17 repeated code-review pass 2 hardening update

두 번째 반복 리뷰에서 나온 privacy/security blocker를 추가 반영했다.

- 삭제 시 원본 파일명, 사용자 메모, object/envelope metadata, 카드 제목/날짜/AI 초안, report snapshot, share password/token hash를 tombstone 형태로 스크럽한다.
- 공유 payload는 snapshot이 없거나 손상된 리포트에서 현재 카드로 fallback하지 않고 재생성을 요구한다.
- 동의 version은 서버 소유 `CURRENT_CONSENT_VERSION`으로만 저장·검증하며 stale/forged version은 결제/AI 처리 gate를 통과하지 못한다.
- 업로드/결제/리포트 API 응답은 storage key, encrypted DEK, provider payment key, PDF object, snapshot internals를 반환하지 않는 DTO로 축소했다.
- job processing은 active processing lease를 확인하고, provider work 이후 DB mutation 안에서 active card 존재를 재확인해 중복 카드/추출 생성을 막는다.
- evidence/report object key는 timestamp 대신 record id를 포함해 동일 파일명/동일 시각 충돌을 피한다.
- payment completion은 같은 provider key로 반복 호출될 경우 기존 paid record를 반환하고 `paidAt`/audit을 중복 변경하지 않는다.
- first-entry safety popup은 app layout에 올리고, simulator 진입 전 위험 체크 완료/건너뛰기 gate를 추가했다.
- `/account` 삭제도 report 화면과 같은 확인 체크박스를 요구한다.

추가 검증:

- `pnpm lint`: 통과
- `pnpm test`: 통과 — 8 files, 19 tests
- `pnpm build`: 통과 — 29 static pages
- `pnpm e2e`: 통과 — happy path 1 passed, live-provider skipped
- `pnpm e2e:live`: 통과 — live provider path 1 passed


## 2026-05-17 bilingual demo mode update

발표 시연을 위해 한국어 기본 UX를 유지하면서 사이트 전역 한/영 전환 기능을 추가했다.

- 전역 헤더에 `한국어 / English` 언어 토글을 추가했다.
- 한국어는 검수용 기본 언어로 유지하고, 영어 선택값은 `localStorage`에만 저장한다.
- `LanguageProvider`가 라우트 전환과 동적 상태 메시지를 감지해 주요 UI 문구, 접근성 label, placeholder, 문서 제목, `html lang`을 현재 언어에 맞게 갱신한다.
- 영어 모드에서도 112/1366, 법률 자문 아님, AI 초안, 불법 자료 수집 미안내 등 안전/법적 guardrail 문구를 유지한다.
- 별도 locale URL/SEO는 구현하지 않았다. 현재 범위는 발표·검수용 UI 언어 전환이며, 공개 SEO 다국어 운영이 필요하면 `/ko`, `/en` 라우팅과 서버 렌더 locale dictionary를 후속으로 분리해야 한다.

추가 검증:

- `pnpm lint`: 통과
- `pnpm test`: 통과 — 12 files, 31 tests
- `rm -rf .next && pnpm build`: 통과 — 29 static pages
- `pnpm e2e`: 통과 — happy path 1 passed, language toggle 1 passed, live-provider skipped
- `pnpm e2e:live`: 통과 — live provider path 1 passed

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
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `APP_URL`
- `STORAGE_PROVIDER`
- `SAFEPLAN_DB_BACKEND`
- `APP_ENV`
- `PAYMENT_PROVIDER`
- `TOSS_CLIENT_KEY`
- `TOSS_SECRET_KEY`
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
- Toss 실결제 current-window redirect/승인은 구현됐지만, 운영 키와 Toss 콘솔 설정 후 실제 결제 smoke가 필요하다.
- Cloud SQL/GCS/KMS/Secret Manager 리소스를 만든 뒤 `pnpm prisma:migrate`, Cloud Run 배포, `/api/health/ready` 200 확인이 필요하다.
- Prisma backend는 MVP 호환용 snapshot replace 계층을 유지한다. Cloud Run `maxScale=1`, `containerConcurrency=1`로 동시성 위험을 낮췄지만, 트래픽 증가 전 row-level repository와 queue 분리가 필요하다.
- 법률 문구는 guardrail 수준이며 법률 검토 완료 상태가 아니다.

## DETAILED_PLAN.md 대비 편차

- MVP local/test mode는 local JSON/object store를 사용하고, production은 `SAFEPLAN_DB_BACKEND=prisma`와 `STORAGE_PROVIDER=gcs`로 전환한다.
- Toss 실결제는 SDK current-window redirect와 confirm API까지 구현했지만, 실제 운영 결제 smoke는 credential/콘솔 설정 후 필요하다.
- Optional Cloud Tasks는 사용하지 않고 local processing endpoint를 구현했다.
- PDF 생성은 서버 내 PDF-lib 기반 smoke/report 생성으로 구현했고, 브라우저 print-to-PDF 방식은 사용하지 않았다.

## 완료 기준 감사

- mock mode end-to-end: Playwright happy path 통과, 비밀번호 보호 공유 링크와 삭제 전 확인 포함
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
