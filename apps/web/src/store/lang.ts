import { create } from 'zustand';
import i18n, { applyDir } from '../lib/i18n';

export type Lang = 'ar' | 'en';
const KEY = 'kstore_lang';

export function getLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return 'ar';
}

/** Receipts keep printing Arabic; only UI chrome flips. */
export function applyLang(lang: Lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.body.setAttribute('data-lang', lang);
  applyDir(lang);
  void i18n.changeLanguage(lang);
}

interface LangState {
  lang: Lang;
  set: (l: Lang) => void;
}
export const useLang = create<LangState>((set) => ({
  lang: getLang(),
  set: (l) => { applyLang(l); set({ lang: l }); },
}));

/** Convenience hook returning the current text direction from the lang store. */
export function useDir(): 'rtl' | 'ltr' {
  return useLang((s) => (s.lang === 'ar' ? 'rtl' : 'ltr'));
}
