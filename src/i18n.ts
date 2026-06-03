import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector, { type CustomDetector } from 'i18next-browser-languagedetector';

import thTranslations from './locales/th.json';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import zhTranslations from './locales/zh.json';
import jaTranslations from './locales/ja.json';
import viTranslations from './locales/vi.json';
import idTranslations from './locales/id.json';

export const SUPPORTED_LANGUAGES = ['en', 'th', 'es', 'zh', 'ja', 'vi', 'id'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<SupportedLanguage, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  es: { label: 'Español', flag: '🇪🇸' },
  zh: { label: '中文', flag: '🇨🇳' },
  ja: { label: '日本語', flag: '🇯🇵' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  id: { label: 'Indonesia', flag: '🇮🇩' },
};

/**
 * Map any locale tag (e.g. "en-US", "zh-Hans-CN", "id_ID") to one of our
 * supported short codes. Returns null when the locale is not supported.
 */
export function normalizeLocale(raw?: string | null): SupportedLanguage | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().replace('_', '-');
  const primary = lower.split('-')[0];
  // Chinese variants → zh
  if (primary === 'zh') return 'zh';
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(primary)) {
    return primary as SupportedLanguage;
  }
  return null;
}

/**
 * Custom detector: ask the Electron main process for the OS locale via the
 * preload-exposed `window.electron.invoke('os:getLocale')`. Sync detectors
 * must return a value immediately, so we read it from a cache that gets
 * primed at module load. If we haven't received it yet, return undefined
 * and let the next detector (navigator/localStorage) take over — i18next
 * will re-render once we call `i18n.changeLanguage()` later.
 */
let cachedOsLocale: SupportedLanguage | null = null;
const osLocaleDetector: CustomDetector = {
  name: 'electronOsLocale',
  lookup: () => cachedOsLocale ?? undefined,
  cacheUserLanguage: () => {
    // no-op — we never want to overwrite the OS locale cache from i18next
  },
};

// Prime the OS locale asynchronously. If the user has not yet picked a
// language explicitly, switch to whatever the OS reports.
async function primeOsLocale() {
  try {
    const electron = (window as any)?.electron;
    if (!electron?.invoke) return;
    const raw = await electron.invoke('os:getLocale');
    const normalized = normalizeLocale(raw);
    if (!normalized) return;
    cachedOsLocale = normalized;
    // Only auto-switch if user hasn't explicitly picked one yet.
    const stored = localStorage.getItem('i18nextLng');
    const userPicked = stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored);
    if (!userPicked) {
      await i18n.changeLanguage(normalized);
    }
  } catch (err) {
    // Browser context or IPC not available — silently fall back.
  }
}

const languageDetector = new LanguageDetector();
languageDetector.addDetector(osLocaleDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      th: { translation: thTranslations },
      es: { translation: esTranslations },
      zh: { translation: zhTranslations },
      ja: { translation: jaTranslations },
      vi: { translation: viTranslations },
      id: { translation: idTranslations },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Priority:
      //   1. localStorage  — user explicitly picked one before
      //   2. electronOsLocale — OS locale from Electron main process
      //   3. navigator     — browser/OS hint (also works in dev browser)
      order: ['localStorage', 'electronOsLocale', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

void primeOsLocale();

export default i18n;
