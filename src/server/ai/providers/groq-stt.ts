import 'server-only';
import { ProviderMissingCredentialError } from './mistral-ocr';

export interface SttInput {
  content: Buffer;
  mimeType: string;
  originalName: string;
}

export async function groqStt(input: SttInput): Promise<{ transcript: string; raw: unknown }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ProviderMissingCredentialError('groq');
  const formData = new FormData();
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'ko');
  formData.append('response_format', 'verbose_json');
  formData.append('file', new Blob([new Uint8Array(input.content)], { type: input.mimeType }), input.originalName);
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });
  if (!response.ok) throw new Error(`groq_stt_failed_${response.status}`);
  const raw = (await response.json()) as { text?: string; segments?: Array<{ text?: string }> };
  const transcript = raw.segments?.length
    ? raw.segments.map((segment) => `미상: ${segment.text ?? ''}`.trim()).join('\n')
    : `미상: ${raw.text ?? ''}`;
  return { transcript, raw };
}
