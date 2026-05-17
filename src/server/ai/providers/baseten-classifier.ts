import 'server-only';
import type { BasetenClassifierInput, BasetenClassifierResponse } from '@/lib/types';
import { ProviderMissingCredentialError } from './mistral-ocr';
import { basetenResponseSchema } from './schema';

export async function basetenClassify(input: BasetenClassifierInput): Promise<BasetenClassifierResponse> {
  const apiKey = process.env.BASETEN_API_KEY;
  const url = process.env.BASETEN_CLASSIFIER_URL;
  if (!apiKey || !url) throw new ProviderMissingCredentialError('baseten');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error(`baseten_classifier_failed_${response.status}`);
  const raw = await response.json();
  const candidate = raw?.output ?? raw?.result ?? raw;
  return basetenResponseSchema.parse(candidate);
}
