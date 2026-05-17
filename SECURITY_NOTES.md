# SECURITY_NOTES.md

## 데이터 분리 모델

- 원본 증거 파일, 사용자 메모, OCR/STT 결과, AI 분류, evidence card, PDF, 공유 URL을 별도 레코드/객체로 분리한다.
- 재정 시뮬레이터 입력값은 서버 API로 전송하지 않고 브라우저 계산과 명시적 localStorage 저장만 제공한다.
- Prisma 운영 스키마는 공유 DB 충돌을 줄이기 위해 `safeplan_*` 테이블 prefix를 사용한다.

## 암호화 접근

- 로컬/mock 저장도 파일별 DEK를 생성하고 AES-256-GCM으로 원본을 암호화한다.
- DEK는 `KMS_KEY_NAME` 또는 `SESSION_SECRET` 기반 master material로 envelope wrapping한다.
- GCP 운영에서는 Cloud KMS key를 `KMS_KEY_NAME`으로 주입하고 원본 버킷은 공개하지 않는다.

## 삭제 동작

- `deleteCaseDeep(caseId)`는 케이스 soft delete, 원본 암호화 객체 삭제, OCR/STT/AI 결과 비식별 삭제, 카드 삭제 마킹, PDF 삭제 마킹, 공유 URL 폐기를 수행한다.
- 비민감 audit event는 타입, 카운트, 시간 등만 보관한다.

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

## 남은 검토 항목

- 실제 Toss 결제 승인/웹훅 검증은 운영 키와 Toss 콘솔 설정 후 보안 리뷰가 필요하다.
- 실제 GCS/KMS 구현은 현재 로컬 암호화 패턴을 Cloud Storage/KMS adapter로 교체하는 운영 통합 검토가 필요하다.
- 법률 문구는 제품 guardrail 수준이며 법률 검토 완료 상태가 아니다.
