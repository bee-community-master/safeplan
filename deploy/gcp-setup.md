# GCP 배포 준비: 독립 세이프플랜

기본 리전은 `asia-northeast3`입니다. 아래 명령은 프로젝트 ID를 환경변수로 설정한 뒤 실행합니다.

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="asia-northeast3"
gcloud config set project "$GCP_PROJECT_ID"
```

## 1. 필요한 API

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  cloudkms.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

## 2. Artifact Registry

```bash
gcloud artifacts repositories create safeplan \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="safeplan web images"
```

## 3. Cloud SQL PostgreSQL

```bash
gcloud sql instances create safeplan-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region="$GCP_REGION" \
  --storage-type=SSD \
  --storage-size=20GB \
  --backup-start-time=18:00

gcloud sql databases create safeplan --instance=safeplan-postgres
gcloud sql users create safeplan_app --instance=safeplan-postgres --password="REPLACE_WITH_STRONG_PASSWORD"
```

공유 Supabase/Postgres를 쓰는 경우에도 Prisma 테이블은 `safeplan_*` prefix를 사용합니다. `.env.local`의 `DB_TABLE_AND_SCHEMA_PREFIX` 값과 운영 DB 네이밍 정책을 배포 전 확인하세요.

## 4. Cloud Storage 버킷

```bash
gcloud storage buckets create "gs://${GCP_PROJECT_ID}-safeplan-originals" --location="$GCP_REGION" --uniform-bucket-level-access
gcloud storage buckets create "gs://${GCP_PROJECT_ID}-safeplan-derived" --location="$GCP_REGION" --uniform-bucket-level-access
gcloud storage buckets create "gs://${GCP_PROJECT_ID}-safeplan-reports" --location="$GCP_REGION" --uniform-bucket-level-access
```

원본 증거 버킷은 공개하지 않습니다. OCR/STT provider에는 공개 URL 대신 base64/provider upload 흐름을 사용합니다.

## 5. KMS 키

```bash
gcloud kms keyrings create safeplan --location="$GCP_REGION"
gcloud kms keys create evidence-envelope --location="$GCP_REGION" --keyring=safeplan --purpose=encryption
```

`KMS_KEY_NAME` 예시:

```txt
projects/$GCP_PROJECT_ID/locations/asia-northeast3/keyRings/safeplan/cryptoKeys/evidence-envelope
```

## 6. Secret Manager

```bash
for name in \
  safeplan-database-url safeplan-session-secret safeplan-next-public-app-url \
  safeplan-mistral-api-key safeplan-groq-api-key safeplan-baseten-api-key safeplan-baseten-classifier-url \
  safeplan-toss-client-key safeplan-toss-secret-key safeplan-toss-webhook-secret safeplan-kms-key-name \
  safeplan-envelope-master-key; do
  printf "REPLACE_ME" | gcloud secrets create "$name" --data-file=- || true
done
```

Envelope master key 예시 생성:

```bash
openssl rand -base64 32 | gcloud secrets create safeplan-envelope-master-key --data-file=- || true
```

필수 환경변수는 `.env.example`을 기준으로 합니다. production은 `APP_ENV=production`, `SAFEPLAN_DB_BACKEND=prisma`, `STORAGE_PROVIDER=gcs`로 실행합니다. 실제 provider 운영에는 `MISTRAL_API_KEY`, `GROQ_API_KEY`, `BASETEN_API_KEY`, `BASETEN_CLASSIFIER_URL`, Toss 키, `DATABASE_URL`, `SESSION_SECRET`, GCS/KMS 값, `ENVELOPE_MASTER_KEY_BASE64`가 필요합니다.

## 7. 서비스 계정과 IAM

```bash
gcloud iam service-accounts create safeplan-cloudrun --display-name="Safeplan Cloud Run"
SA="safeplan-cloudrun@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/storage.objectAdmin"
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor"
```

## 8. 이미지 빌드와 마이그레이션

```bash
gcloud builds submit --tag "${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/safeplan/safeplan-web:latest"
DATABASE_URL="postgresql://safeplan_app:PASSWORD@/safeplan?host=/cloudsql/${GCP_PROJECT_ID}:${GCP_REGION}:safeplan-postgres" pnpm prisma:migrate
```

## 9. Cloud Run 배포

```bash
envsubst < deploy/cloudrun.yaml | gcloud run services replace - --region="$GCP_REGION"
gcloud run services update safeplan-web --region="$GCP_REGION" --allow-unauthenticated
READY_URL=$(gcloud run services describe safeplan-web --region="$GCP_REGION" --format="value(status.url)")/api/health/ready
curl -fsS "$READY_URL"
```

또는 직접 배포:

```bash
gcloud run deploy safeplan-web \
  --image="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/safeplan/safeplan-web:latest" \
  --region="$GCP_REGION" \
  --service-account="safeplan-cloudrun@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --add-cloudsql-instances="${GCP_PROJECT_ID}:${GCP_REGION}:safeplan-postgres" \
  --allow-unauthenticated
```

## 10. 롤백

```bash
gcloud run revisions list --service=safeplan-web --region="$GCP_REGION"
gcloud run services update-traffic safeplan-web --region="$GCP_REGION" --to-revisions REVISION_NAME=100
```

## 11. 운영 smoke checklist

- `/api/health/ready`가 200을 반환해야 합니다.
- Toss 콘솔 success/fail URL과 webhook endpoint를 운영 도메인 기준으로 등록합니다.
- Baseten classifier URL을 설정한 뒤 live E2E에서 `classification:baseten`을 확인합니다.
- GCS originals/reports 객체가 private 상태로 생성/삭제되는지 확인합니다.
