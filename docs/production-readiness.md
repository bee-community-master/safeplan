# Production readiness review

## 판단

기존 MVP 커밋만으로는 production 출시가 충분하지 않았다. 특히 Cloud Run 컨테이너 로컬 JSON/파일 저장, mock 중심 결제 UI, production 설정 검증 부재가 출시 차단 요소였다. 이번 하드닝으로 production 배포에 필요한 최소 런타임 골격은 추가했지만, 실제 출시 전에는 운영 credential과 GCP/Toss/Baseten 콘솔 설정을 연결한 live smoke가 반드시 필요하다.

## 출시 차단이던 항목과 조치

| 영역 | 기존 상태 | 조치 |
| --- | --- | --- |
| DB persistence | route runtime이 `.safeplan-data/db.json`에 의존해 Cloud Run 재시작/스케일아웃 시 손실 위험 | `SAFEPLAN_DB_BACKEND=prisma` 지원, Prisma `safeplan_*` 마이그레이션 추가, transaction + advisory lock 기반 normalized table replace 저장 |
| Object storage | 원본/PDF가 컨테이너 로컬 파일 중심 | `STORAGE_PROVIDER=gcs`와 `@google-cloud/storage` adapter 추가, 원본/PDF 모두 private object로 write/read/delete |
| App envelope key | `KMS_KEY_NAME` 문자열을 master material처럼 쓰는 위험 | `ENVELOPE_MASTER_KEY_BASE64` 32-byte secret 필수화, production 누락 시 암호화 실패 및 readiness blocker |
| Payment | local/test mock 버튼 중심, Toss는 skeleton | Toss v2 Standard SDK request + server-side `/v1/payments/confirm` 승인 API + webhook retrieve-verify handler 추가 |
| Runtime readiness | 설정 누락 상태에서도 배포 가능 | `/api/health/live`, `/api/health/ready` 추가, `APP_ENV=production`에서 DB/GCS/KMS/AI/Toss/HTTPS/고객지원 필수값 검사 |
| Web hardening | 보안 헤더/origin/rate limit 미흡 | middleware로 CSP, frame deny, no-sniff, no-referrer, permission policy, same-origin mutating API guard, per-instance rate limit 추가 |
| Session integrity | anonymous session cookie가 서명되지 않음 | HMAC signed session cookie 도입, production에서는 unsigned legacy cookie 거부 |

## 현재 production launch gate

`APP_ENV=production`에서 `/api/health/ready`가 200을 반환해야 배포 gate를 통과한다. 필수 조건:

- `APP_URL` 또는 `NEXT_PUBLIC_APP_URL`: HTTPS URL
- `SESSION_SECRET`: 32자 이상 고유 secret
- `SAFEPLAN_DB_BACKEND=prisma` + `DATABASE_URL`
- `STORAGE_PROVIDER=gcs` + `GCS_BUCKET_ORIGINALS` + `GCS_BUCKET_DERIVED` + `GCS_BUCKET_REPORTS`
- `KMS_KEY_NAME` + `ENVELOPE_MASTER_KEY_BASE64` 32-byte base64 secret
- `AI_PROVIDER_MODE=real` + Mistral/Groq/Baseten key/url
- `PAYMENT_PROVIDER=toss` + Toss client/server secret
- `NEXT_PUBLIC_SUPPORT_EMAIL`: 환불/삭제/장애 문의를 받을 공개 고객지원 이메일

## 아직 출시 전 실제 환경에서 확인해야 할 항목

1. Cloud SQL migration 적용: `pnpm prisma:migrate`
2. Cloud Run 배포 후 `/api/health/ready` 200 확인
3. GCS originals/reports bucket private object write/read/delete smoke
4. Toss live 또는 test-live 결제 승인 redirect, confirm API, webhook 재조회 smoke
5. Baseten classifier URL 연결 후 `classification:baseten` live E2E 재검증
6. 실제 도메인 HTTPS/쿠키 secure/same-origin 동작 확인
7. 실제 고객지원 이메일 수신/응답 프로세스 확인
8. 개인정보/전자상거래/법률 문구 최종 검토
9. Monitoring/Error Reporting/예산 알림 설정

## 의도적으로 아직 하지 않은 것

- 운영자 admin UI: 원본 증거 노출 위험 때문에 MVP 범위에서 제외 유지
- 자동 긴급 신고/상담 연결/변호사 매칭: 제품 guardrail상 제외 유지
- 다중 인스턴스 고성능 queue: 현재는 소규모 launch용 transaction lock 기반 저장이며, 트래픽 증가 시 job queue/row-level repository로 분리 필요


## 2026-05-17 코드리뷰 후 운영 제한

현재 Prisma persistence는 MVP 호환성을 위해 `SafeplanDb` 스냅샷 교체 어댑터를 유지합니다. 동시 쓰기 손실 위험을 줄이기 위해 Cloud Run 템플릿은 임시로 `maxScale=1`, `containerConcurrency=1`로 제한합니다. 이 설정은 production 초기 검증을 위한 안전장치이며, 다음 출시 단계에서는 케이스/동의/결제/자료/공유 링크를 row-level repository transaction으로 분리해야 합니다.
