'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { usePathname } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, translateText, type Locale } from '@/lib/i18n';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();
const translatableAttrs = ['aria-label', 'title', 'placeholder', 'alt'];

function shouldSkip(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest('script,style,noscript,textarea,[data-i18n-ignore="true"]'));
}

function translateTextNode(node: Text, locale: Locale): void {
  if (shouldSkip(node)) return;
  if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue || '');
  const original = textOriginals.get(node) || '';
  const next = translateText(original, locale);
  if (node.nodeValue !== next) node.nodeValue = next;
}

function translateElementAttrs(element: Element, locale: Locale): void {
  if (element.closest('script,style,noscript,[data-i18n-ignore="true"]')) return;
  for (const attr of translatableAttrs) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    let originals = attrOriginals.get(element);
    if (!originals) {
      originals = new Map();
      attrOriginals.set(element, originals);
    }
    if (!originals.has(attr)) originals.set(attr, value);
    const original = originals.get(attr) || value;
    const next = translateText(original, locale);
    if (value !== next) element.setAttribute(attr, next);
  }
}

function applyTranslations(root: ParentNode, locale: Locale): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, locale);
    node = walker.nextNode();
  }
  if (root instanceof Element) translateElementAttrs(root, locale);
  root.querySelectorAll?.('*').forEach((element) => translateElementAttrs(element, locale));
  document.documentElement.lang = locale;
}

function translateDocumentTitle(locale: Locale, titleOriginalRef: MutableRefObject<string>): void {
  if (!titleOriginalRef.current) titleOriginalRef.current = document.title;

  if (locale === 'ko') {
    document.title = titleOriginalRef.current;
    return;
  }

  const currentEnglishTitle = translateText(titleOriginalRef.current, 'en');
  if (document.title !== currentEnglishTitle) titleOriginalRef.current = document.title;
  document.title = translateText(titleOriginalRef.current, 'en');
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const applying = useRef(false);
  const titleOriginalRef = useRef('');

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) setLocaleState(saved);
  }, []);

  useEffect(() => {
    applying.current = true;
    applyTranslations(document.body, locale);
    translateDocumentTitle(locale, titleOriginalRef);
    applying.current = false;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale, pathname]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      if (applying.current) return;
      applying.current = true;
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
          else if (node instanceof Element) applyTranslations(node, locale);
        });
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          const textNode = mutation.target as Text;
          const original = textOriginals.get(textNode);
          if (original && textNode.nodeValue === translateText(original, locale)) continue;
          textOriginals.delete(textNode);
          translateTextNode(textNode, locale);
        }
      }
      applying.current = false;
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({ locale, setLocale: setLocaleState }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is missing');
  return value;
}
