'use client';

import { useLanguage } from './LanguageProvider';
import type { Locale } from '@/lib/i18n';

const options: Array<{ locale: Locale; label: string; short: string }> = [
  { locale: 'ko', label: '한국어', short: 'KO' },
  { locale: 'en', label: 'English', short: 'EN' }
];

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="inline-flex rounded-2xl border border-line bg-white p-1 text-xs font-black shadow-sm" aria-label="Language / 언어" data-i18n-ignore="true">
      {options.map((option) => {
        const active = option.locale === locale;
        return (
          <button
            key={option.locale}
            className={`rounded-xl px-3 py-2 transition focus-ring ${active ? 'bg-teal text-white' : 'text-muted hover:bg-tealSoft hover:text-tealDark'}`}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            onClick={() => setLocale(option.locale)}
          >
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sm:hidden">{option.short}</span>
          </button>
        );
      })}
    </div>
  );
}
