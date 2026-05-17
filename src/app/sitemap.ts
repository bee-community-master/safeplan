import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/url';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ['/', '/simulator', '/safety', '/evidence/start', '/pricing', '/help', '/status', '/legal/privacy', '/legal/terms', '/legal/ai-consent', '/legal/refund'].map((path) => ({
    url: appUrl(path),
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6
  }));
}
