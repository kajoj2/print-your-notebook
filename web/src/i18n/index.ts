// Interface language: remembered in the browser, by default from the browser settings
// (Polish for "pl…", English for the rest). The notebook content language is separate, in the design.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { en } from './en';
import { pl, type Messages } from './pl';

export type Lang = 'pl' | 'en';
export const LANGS: Record<Lang, string> = { pl: 'Polski', en: 'English' };
export const MESSAGES: Record<Lang, Messages> = { pl, en };

export const isLang = (x: unknown): x is Lang => x === 'pl' || x === 'en';

export function browserLang(): Lang {
  const langs =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return langs.some((l) => l?.toLowerCase().startsWith('pl')) ? 'pl' : 'en';
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: browserLang(),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'notebook-lang-v1',
      // localStorage can be unavailable (private mode, blocked site data)
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return undefined as unknown as Storage;
        }
      }),
      merge: (persisted, current) => {
        const p = persisted as { lang?: unknown } | undefined;
        return isLang(p?.lang) ? { ...current, lang: p.lang } : current;
      },
    },
  ),
);

export function useT(): Messages {
  return MESSAGES[useLang((s) => s.lang)];
}

export type { Messages };
