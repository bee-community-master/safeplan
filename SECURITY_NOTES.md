# SECURITY_NOTES.md

## 데이터 분리 모델

- 원본 증거 파일, 사용자 메모, OCR/STT 결과, AI 분류, evidence card, PDF, 공유 URL을 별도 레코드/객체로 분리한다.
- 재정 시뮬레이터 입력값은 서버 API로 전송하지 않고 브라우저 계산과 명시적 localStorage 저장만 제공한다.
- Prisma 운영 스키마는 공유 DB 충돌을 줄이기 위해 `safeplan_*` 테이블 prefix를 사용하며, `SAFEPLAN_DB_BACKEND=prisma`에서 Cloud SQL/PostgreSQL에 저장한다.

## 암호화 접근

- 로컬/mock 저장도 파일별 DEK를 생성하고 AES-256-GCM으로 원본을 암호화한다.
- DEK는 `ENVELOPE_MASTER_KEY_BASE64` 32-byte secret으로 envelope wrapping한다. local/test에서만 `SESSION_SECRET` 기반 fallback을 허용한다.
- GCP 운영에서는 `KMS_KEY_NAME`/Secret Manager로 key custody를 관리하고, Cloud SQL/GCS는 Google-managed encryption 또는 CMEK 정책으로 별도 검토한다. 원본 버킷은 공개하지 않는다.

## 삭제 동작

- `deleteCaseDeep(caseId)`는 케이스 soft delete, 원본 암호화 객체(GCS/local) 삭제, OCR/STT/AI 결과 비식별 삭제, 카드 삭제 마킹, PDF 객체 삭제, 공유 URL 폐기를 수행한다.
- 비민감 audit event는 타입, 카운트, 시간 등만 보관한다.
- 사용자 화면에서는 삭제 전 확인 체크박스를 요구해 실수로 원본과 리포트를 삭제하는 일을 줄인다.

## 로깅 정책

- 원본 증거, OCR 텍스트, 전사, 이름/주소/전화번호/자녀 정보, 결제 secret을 로그로 남기지 않는다.
- provider 장애 로그는 provider 이름과 오류 category만 남긴다.

## 운영자 접근 제한

- MVP에는 원본 증거를 여는 admin UI가 없다.
- 운영 지원 범위는 처리 상태, 파일 수, 오류 category, 타임스탬프 확인으로 제한한다.

## 외부 provider 처리 가정

- Mistral OCR, Groq STT, Baseten classifier는 명시 동의와 결제 성공 후에만 호출한다.
- 키가 없거나 provider 장애가 있으면 mock fallback으로 로컬 happy path를 유지하고 `provider_degraded` 상태를 남긴다.
- 민감 파일은 공개 GCS URL로 전달하지 않고 base64/provider upload 흐름을 사용한다.

## Web/runtime hardening

- HMAC signed anonymous session cookie를 사용하며 production에서는 unsigned legacy cookie를 거부한다.
- middleware가 CSP, frame deny, no-sniff, no-referrer, permission policy, same-origin mutating API guard, per-instance rate limit을 적용한다.
- `/api/health/ready`는 production 필수 설정 누락 시 503을 반환한다.
- 공개 검색은 landing/pricing/help/legal/status 같은 일반 안내 페이지로 제한하고, `/api/`, `/evidence/`, `/share/`, `/account`는 robots/noindex 정책으로 보호한다.
- 공유 링크는 기본 14일 만료이며 선택적으로 비밀번호를 설정할 수 있다. 비밀번호가 설정된 링크는 별도 확인 후에만 리포트 내용을 렌더링한다.

## 남은 검토 항목

- Toss 결제 승인은 server-side confirm API로 구현했지만, 운영 키와 Toss 콘솔 webhook 설정으로 실제 결제 smoke가 필요하다.
- Prisma backend는 MVP 호환용 snapshot replace 계층을 유지한다. Cloud Run `maxScale=1`, `containerConcurrency=1`로 동시성 위험을 낮췄지만, 트래픽 증가 전 row-level repository/queue 분리가 필요하다.
- 법률 문구는 제품 guardrail 수준이며 법률 검토 완료 상태가 아니다.

- Toss webhook은 `x-toss-timestamp`와 raw body 기반 HMAC-SHA256 `x-toss-signature` 검증을 통과한 요청만 처리한다.
