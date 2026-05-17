# Live provider E2E

실제 외부 AI provider 호출 비용을 허용할 때만 실행한다.

```bash
pnpm build
pnpm e2e:live
```

`e2e:live`는 다음 환경으로 실행된다.

- `LIVE_E2E=1`
- `AI_PROVIDER_MODE=real`
- `PAYMENT_PROVIDER=mock`
- `SAFEPLAN_DATA_DIR=.safeplan-data/live-e2e`
- `PORT=3100`
- `APP_URL=http://127.0.0.1:3100`
- `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3100`

검증 범위:

1. UI에서 케이스 생성, PDF/photo/audio 업로드, 동의, mock 결제, AI 처리 실행
2. Mistral OCR 실제 호출 확인: `ocr:mistral`
3. Groq STT 실제 호출 확인: `stt:groq`
4. 카드 검수, PDF 생성, 보안 URL 생성/조회, 삭제
5. `BASETEN_CLASSIFIER_URL`이 있을 때 Baseten classifier 실제 호출 확인: `classification:baseten`
6. `BASETEN_IMAGE_DESCRIPTION_URL`이 있을 때 일반 이미지 설명 provider 실제 호출 확인: `image_description:baseten`

현재 로컬 `.env.local`에서는 `BASETEN_CLASSIFIER_URL` 또는 `BASETEN_IMAGE_DESCRIPTION_URL`이 비어 있으면 해당 Baseten live call은 blocked이며, orchestrator는 mock fallback과 `provider_degraded`를 남긴다.
