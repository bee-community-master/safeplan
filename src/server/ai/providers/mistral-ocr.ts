import 'server-only';

export interface OcrInput {
  content: Buffer;
  mimeType: string;
  originalName: string;
}

export class ProviderMissingCredentialError extends Error {
  constructor(provider: string) {
    super(`${provider}_missing_credentials`);
    this.name = 'ProviderMissingCredentialError';
  }
}

export async function mistralOcr(input: OcrInput): Promise<{ markdown: string; raw: unknown }> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new ProviderMissingCredentialError('mistral');
  const isImage = input.mimeType.startsWith('image/');
  const dataUrl = `data:${input.mimeType};base64,${input.content.toString('base64')}`;
  const document = isImage
    ? { type: 'image_url', image_url: dataUrl }
    : { type: 'document_url', document_url: dataUrl };
  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'mistral-ocr-latest', document, include_image_base64: false })
  });
  if (!response.ok) throw new Error(`mistral_ocr_failed_${response.status}`);
  const raw = (await response.json()) as { pages?: Array<{ markdown?: string }> };
  const markdown = raw.pages?.map((page) => page.markdown || '').join('\n\n') || '';
  return { markdown, raw };
}
