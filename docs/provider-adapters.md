# Provider adapters

- Mistral OCR: `src/server/ai/providers/mistral-ocr.ts`
- Groq STT: `src/server/ai/providers/groq-stt.ts`
- Baseten classifier: `src/server/ai/providers/baseten-classifier.ts`
- Mock provider: `src/server/ai/providers/mock.ts`
- Orchestrator: `src/server/ai/timeline-orchestrator.ts`

실제 키가 없으면 mock provider를 사용한다. `AI_PROVIDER_MODE=real`일 때 provider 호출이 실패하면 mock fallback과 `provider_degraded` 상태를 남긴다.
