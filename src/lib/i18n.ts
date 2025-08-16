// Minimal i18n utility tailored for this app
// Loads namespace JSON files and exposes a useTranslation-like API

import en_camera from '@/locales/en/camera.json';
import fi_camera from '@/locales/fi/camera.json';
import et_camera from '@/locales/et/camera.json';

export type Locale = 'fi' | 'et' | 'en';

// Determine current language: localStorage > window var > browser > fallback
function detectLang(): Locale {
  const ls = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || '';
  const w = (typeof window !== 'undefined' && (window as any).__APP_LANG) || '';
  const nav = (typeof navigator !== 'undefined' && (navigator.language || navigator.languages?.[0])) || '';
  const norm = (ls || w || nav || '').toLowerCase();
  if (norm.startsWith('fi')) return 'fi';
  if (norm.startsWith('et')) return 'et';
  return 'en';
}

let currentLang: Locale = detectLang();

// Simple store with namespaces
const resources: Record<Locale, Record<string, any>> = {
  en: { camera: en_camera },
  fi: { camera: fi_camera },
  et: { camera: et_camera },
};

export function setLanguage(lang: Locale) {
  currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch {}
}

export function getLanguage(): Locale {
  return currentLang;
}

function get(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, key: string) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function useTranslation(namespace: keyof typeof resources['en']) {
  function t(key: string): string {
    const ns = namespace as string;
    const bundle = resources[currentLang]?.[ns] || resources.en[ns];
    const fallbackBundle = resources.en[ns];
    const val = get(bundle, key) ?? get(fallbackBundle, key);
    return typeof val === 'string' ? val : key;
  }
  return { t };
}
